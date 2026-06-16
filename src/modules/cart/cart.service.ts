import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { CouponService } from '../coupon/coupon.service';
import { Product } from '../product/product.model';
import { resolveVariantForProductCheckout } from '../variant/variantCheckout.util';
import { VariantModel } from '../variant/variant.model';
import type { ICartItem } from './cart.interface';
import { Cart } from './cart.model';

const PRODUCT_POPULATES = [
  { path: 'thumbnail', select: '_id url name alt useCase size createdAt' },
  { path: 'gallery', select: '_id url name alt useCase size createdAt' },
  {
    path: 'brand',
    select: 'brandName image',
    populate: { path: 'image', select: '_id url name alt useCase size createdAt' },
  },
  {
    path: 'category',
    select: 'categoryName slug level description image',
    populate: { path: 'image', select: '_id url name alt useCase size createdAt' },
  },
  { path: 'attributes', select: '_id name values status createdAt updatedAt' },
];

const ITEM_PRODUCT_POPULATE = {
  path: 'items.productId',
  select:
    'title slug shortDescription description brand category thumbnail gallery attributes status createdAt updatedAt',
  populate: PRODUCT_POPULATES,
};

const ITEM_VARIANT_POPULATE = {
  path: 'items.variantId',
  select: 'sku price stock attributes status productId image',
  populate: { path: 'image', select: '_id url name alt useCase size createdAt' },
};

const assertValidObjectId = (id: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }
};

const fetchPopulatedCart = async (cartId: Types.ObjectId) => {
  const doc = await Cart.findById(cartId)
    .populate(ITEM_PRODUCT_POPULATE)
    .populate(ITEM_VARIANT_POPULATE)
    .lean()
    .exec();
  return doc;
};

const assertProductExists = async (productId: string): Promise<void> => {
  assertValidObjectId(productId);
  const ok = await Product.exists({ _id: new Types.ObjectId(productId) }).exec();
  if (!ok) {
    throw new AppError('Product not found', httpStatus.NOT_FOUND);
  }
};

const sameCartLineKey = (
  item: { productId: Types.ObjectId; variantId?: Types.ObjectId | null },
  productId: string,
  variantId?: string,
): boolean => {
  const left = item.variantId ? String(item.variantId) : '';
  const right = variantId ? variantId.trim() : '';
  return String(item.productId) === productId && left === right;
};

const loadVariantForStock = async (variantId: string) => {
  assertValidObjectId(variantId);
  const doc = await VariantModel.findById(variantId).exec();
  if (!doc) {
    throw new AppError('Variant not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

export type AddCartItemPayload = {
  productId: string;
  variantId?: string;
  quantity?: number;
  isSelected?: boolean;
};

const getOrCreateCartDoc = async (userId: string) => {
  assertValidObjectId(userId);
  const uid = new Types.ObjectId(userId);
  let cart = await Cart.findOne({ userId: uid }).exec();
  if (!cart) {
    cart = await Cart.create({ userId: uid, items: [] });
  }
  return cart;
};

const getCartFromDB = async (userId: string) => {
  const cart = await getOrCreateCartDoc(userId);
  return fetchPopulatedCart(cart._id as Types.ObjectId);
};

const addItemToCartIntoDB = async (userId: string, payload: AddCartItemPayload) => {
  const qty = payload.quantity ?? 1;
  await assertProductExists(payload.productId);

  const cart = await getOrCreateCartDoc(userId);
  const pid = payload.productId;
  const vid = payload.variantId?.trim();

  let maxStock: number | undefined;

  if (vid) {
    const v = await loadVariantForStock(vid);
    if (String(v.productId) !== pid) {
      throw new AppError('Variant does not belong to this product', httpStatus.BAD_REQUEST);
    }
    maxStock = v.stock;
    if (qty > maxStock) {
      throw new AppError('Insufficient stock for this variant', httpStatus.BAD_REQUEST);
    }
  }

  const existing = cart.items.find((it) => sameCartLineKey(it, pid, vid));
  if (existing) {
    const nextQty = existing.quantity + qty;
    if (maxStock !== undefined && nextQty > maxStock) {
      throw new AppError('Insufficient stock for this variant', httpStatus.BAD_REQUEST);
    }
    existing.quantity = nextQty;
  } else {
    cart.items.push({
      productId: new Types.ObjectId(pid),
      ...(vid ? { variantId: new Types.ObjectId(vid) } : {}),
      quantity: qty,
      isSelected: payload.isSelected !== false,
    } as ICartItem);
  }

  await cart.save();
  return fetchPopulatedCart(cart._id as Types.ObjectId);
};

const updateCartLineInDB = async (
  userId: string,
  lineId: string,
  patch: { quantity?: number; isSelected?: boolean },
) => {
  assertValidObjectId(userId);
  assertValidObjectId(lineId);

  if (patch.quantity === undefined && patch.isSelected === undefined) {
    throw new AppError('Nothing to update', httpStatus.BAD_REQUEST);
  }

  const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) }).exec();
  if (!cart) {
    throw new AppError('Cart not found', httpStatus.NOT_FOUND);
  }

  const item = cart.items.find((e) => e._id !== undefined && String(e._id) === lineId);
  if (!item) {
    throw new AppError('Cart line not found', httpStatus.NOT_FOUND);
  }

  if (patch.quantity !== undefined) {
    if (!Number.isInteger(patch.quantity) || patch.quantity < 1) {
      throw new AppError('Quantity must be a positive integer', httpStatus.BAD_REQUEST);
    }

    if (item.variantId) {
      const v = await VariantModel.findById(item.variantId).exec();
      if (!v) {
        throw new AppError('Variant not found', httpStatus.BAD_REQUEST);
      }
      if (patch.quantity > v.stock) {
        throw new AppError('Insufficient stock for this variant', httpStatus.BAD_REQUEST);
      }
    }

    item.quantity = patch.quantity;
  }

  if (patch.isSelected !== undefined) {
    (item as ICartItem).isSelected = patch.isSelected;
  }

  cart.markModified('items');
  await cart.save();
  return fetchPopulatedCart(cart._id as Types.ObjectId);
};

const removeCartLineFromDB = async (userId: string, lineId: string) => {
  assertValidObjectId(userId);
  assertValidObjectId(lineId);

  const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) }).exec();
  if (!cart) {
    throw new AppError('Cart not found', httpStatus.NOT_FOUND);
  }

  const idx = cart.items.findIndex((e) => e._id !== undefined && String(e._id) === lineId);
  if (idx === -1) {
    throw new AppError('Cart line not found', httpStatus.NOT_FOUND);
  }

  cart.items.splice(idx, 1);
  cart.markModified('items');
  await cart.save();
  return fetchPopulatedCart(cart._id as Types.ObjectId);
};

export type OrderedCartItemRef = {
  productId: string;
  variantId?: string;
};

/** Remove cart lines that were included in a placed order. */
const removeOrderedItemsFromCart = async (
  userId: string,
  items: OrderedCartItemRef[],
): Promise<void> => {
  if (!items.length) return;

  assertValidObjectId(userId);
  const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) }).exec();
  if (!cart) return;

  let changed = false;
  for (const ordered of items) {
    const idx = cart.items.findIndex((it) =>
      sameCartLineKey(it, ordered.productId, ordered.variantId),
    );
    if (idx !== -1) {
      cart.items.splice(idx, 1);
      changed = true;
    }
  }

  if (changed) {
    cart.markModified('items');
    await cart.save();
  }
};

const isCartLineSelected = (item: { isSelected?: boolean | null }): boolean =>
  item.isSelected !== false;

export type CheckoutPreviewLine = {
  lineId: string;
  productId: string;
  variantId: string;
  productTitle: string;
  productSlug: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  /** Portion counted toward checkout (selected lines only); 0 when unselected */
  lineSubtotal: number;
  isSelected: boolean;
};

export type CheckoutPreviewCouponApplied = {
  code: string;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  discountAmount: number;
};

export type CheckoutPreviewPayload = {
  couponCode?: string;
  currency?: string;
};

const getCheckoutPreviewFromDB = async (userId: string, payload: CheckoutPreviewPayload) => {
  assertValidObjectId(userId);
  const currency = (payload.currency ?? 'BDT').toUpperCase().trim();

  const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) }).exec();
  if (!cart || cart.items.length === 0) {
    return {
      currency,
      lines: [] as CheckoutPreviewLine[],
      selectedLineCount: 0,
      itemsSubtotal: 0,
      coupon: null as CheckoutPreviewCouponApplied | null,
      totalAmount: 0,
    };
  }

  const linesOut: CheckoutPreviewLine[] = [];
  let itemsSubtotal = 0;

  for (const row of cart.items) {
    if (!row._id) {
      continue;
    }

    const lineIdStr = String(row._id);
    const selected = isCartLineSelected(row);
    const pid = row.productId as Types.ObjectId;
    const product = await Product.findById(pid).exec();

    if (!product || product.status !== 'active') {
      throw new AppError(
        'A product in your cart is no longer available',
        httpStatus.BAD_REQUEST,
      );
    }

    const variant = await resolveVariantForProductCheckout(
      pid,
      row.variantId ? String(row.variantId) : undefined,
    );

    const unitPrice = variant.price;
    const qty = row.quantity;
    const lineContribution = selected ? Math.round(unitPrice * qty * 100) / 100 : 0;
    if (selected) {
      itemsSubtotal += lineContribution;
    }

    linesOut.push({
      lineId: lineIdStr,
      productId: String(pid),
      variantId: String(variant._id),
      productTitle: product.title,
      productSlug: product.slug,
      sku: variant.sku,
      unitPrice,
      quantity: qty,
      lineSubtotal: lineContribution,
      isSelected: selected,
    });
  }

  itemsSubtotal = Math.round(itemsSubtotal * 100) / 100;

  let coupon: CheckoutPreviewCouponApplied | null = null;
  let totalAmount = itemsSubtotal;

  const code = payload.couponCode?.trim();
  if (code && itemsSubtotal > 0) {
    const couponLines = linesOut
      .filter((l) => l.isSelected)
      .map((l) => ({ productId: l.productId, lineSubtotal: l.lineSubtotal }));
    const resolvedCoupon = await CouponService.resolveApplicableCouponFromDB(
      code,
      currency,
      itemsSubtotal,
      couponLines,
    );
    if (!resolvedCoupon) {
      throw new AppError('Coupon could not be applied', httpStatus.BAD_REQUEST);
    }

    const discountAmount =
      Math.round(
        CouponService.computeDiscountAmount(resolvedCoupon, resolvedCoupon.discountBase) * 100,
      ) / 100;
    coupon = {
      code: resolvedCoupon.code,
      discountType: resolvedCoupon.discountType,
      discountValue: resolvedCoupon.discountValue,
      discountAmount,
    };
    totalAmount = Math.round(Math.max(0, itemsSubtotal - discountAmount) * 100) / 100;
  }

  const selectedLineCount = linesOut.filter((l) => l.isSelected).length;

  return {
    currency,
    lines: linesOut,
    selectedLineCount,
    itemsSubtotal,
    coupon,
    totalAmount,
  };
};

export const CartService = {
  getCartFromDB,
  addItemToCartIntoDB,
  updateCartLineInDB,
  getCheckoutPreviewFromDB,
  removeCartLineFromDB,
  removeOrderedItemsFromCart,
};
