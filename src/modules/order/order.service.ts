import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import type { AppliedCouponResolved } from '../coupon/coupon.service';
import { CouponService } from '../coupon/coupon.service';
import type { PaymentGateway, PaymentStatus } from '../payment/payment.interface';
import { Payment } from '../payment/payment.model';
import { generatePaymentTransactionId } from '../payment/payment.utils';
import { Product } from '../product/product.model';
import { User } from '../user/user.model';
import type { UserRole } from '../user/user.interface';
import { UserAddress } from '../userAddress/userAddress.model';
import { VariantModel } from '../variant/variant.model';
import { resolveVariantForProductCheckout } from '../variant/variantCheckout.util';
import { SettingsService } from '../settings/settings.service';
import type {
  IOrder,
  IOrderAddressSnapshot,
  IOrderLineItemSnapshot,
  OrderChannel,
} from './order.interface';
import { Order } from './order.model';

const POPULATE_ORDER_DETAIL = [
  { path: 'items.productId', select: 'title slug status' },
  { path: 'items.variantId', select: 'sku price stock status' },
] as const;

const SHOP_COUNTER_ADDRESS: IOrderAddressSnapshot = {
  name: 'Shop counter',
  phone: '-',
  country: 'BD',
  state: '-',
  city: '-',
  thana: '-',
  localLocation: 'Walk-in POS',
};

const ALL_GATEWAYS: PaymentGateway[] = [
  'cash_on_delivery',
  'bkash',
  'ssl_commerce',
  'stripe',
  'payoneer',
  'pos_cash',
  'pos_card',
];

const isPaymentGateway = (g: string): g is PaymentGateway =>
  ALL_GATEWAYS.includes(g as PaymentGateway);

const roundMoney = (n: number) => Math.round(n * 100) / 100;

const resolveOrderCouponTotals = async (
  couponCode: string | undefined,
  currency: string,
  lines: IOrderLineItemSnapshot[],
) => {
  const itemsSubtotal = roundMoney(lines.reduce((s, ln) => s + ln.lineSubtotal, 0));
  const couponLines = lines.map((ln) => ({
    productId: String(ln.productId),
    lineSubtotal: ln.lineSubtotal,
  }));
  const resolvedCoupon = await CouponService.resolveApplicableCouponFromDB(
    couponCode,
    currency,
    itemsSubtotal,
    couponLines,
  );
  const couponDiscountAmount = resolvedCoupon
    ? roundMoney(CouponService.computeDiscountAmount(resolvedCoupon, resolvedCoupon.discountBase))
    : 0;
  const totalAmount = roundMoney(Math.max(0, itemsSubtotal - couponDiscountAmount));
  return { itemsSubtotal, resolvedCoupon, couponDiscountAmount, totalAmount };
};

const assertValidObjectId = (id: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }
};

type StockDecrement = { variantOid: Types.ObjectId; qty: number };

/** User API & admin phone rows (sale price from catalogue unless overridden on phone lines). */
export type OrderItemInput = {
  productId: string;
  quantity: number;
  variantId?: string;
  unitPriceOverride?: number;
};

export type CreateOrderPayload = {
  items: OrderItemInput[];
  addressId: string;
  paymentMethod: PaymentGateway;
  couponCode?: string;
  currency?: string;
};

export type AdminPosLineInput = {
  productId: string;
  quantity: number;
  variantId?: string;
  /** Final unit price charged at POS — may differ from catalogue */
  unitPrice: number;
};

export type AdminPhoneOrderPayload = {
  items: OrderItemInput[];
  deliveryMode: 'ship_to_address' | 'shop_pickup';
  addressSnapshot?: IOrderAddressSnapshot;
  paymentMethod: PaymentGateway;
  couponCode?: string;
  currency?: string;
  /** When set the order is attributed to this account */
  customerUserId?: string;
  /** Required when caller has no `customerUserId` */
  guestContact?: { name: string; phone: string };
  adminNotes?: string;
};

export type AdminPosOrderPayload = {
  items: AdminPosLineInput[];
  paymentMethod: 'pos_cash' | 'pos_card';
  deliveryMode?: 'ship_to_address' | 'shop_pickup';
  couponCode?: string;
  currency?: string;
  guestContact?: { name?: string; phone: string };
  adminNotes?: string;
};

export type GuestOrderPayload = {
  items: OrderItemInput[];
  guestContact: { name: string; phone: string };
  addressSnapshot: IOrderAddressSnapshot;
  paymentMethod: PaymentGateway;
  couponCode?: string;
  currency?: string;
};

function generateOrderNumber(prefix: 'ORD' | 'PHN' | 'POS'): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${y}${m}${day}-${rand}`;
}

const decrementVariantStockAtomic = async (variantOid: Types.ObjectId, qty: number) => {
  const updated = await VariantModel.findOneAndUpdate(
    { _id: variantOid, status: 'active', stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { new: true },
  ).exec();
  if (!updated) {
    throw new AppError('Insufficient stock for one or more items', httpStatus.BAD_REQUEST);
  }
};

const rollbackVariantStock = async (records: StockDecrement[]) => {
  for (const rec of [...records].reverse()) {
    await VariantModel.updateOne({ _id: rec.variantOid }, { $inc: { stock: rec.qty } }).exec();
  }
};

const buildLineSnapshot = (
  productId: Types.ObjectId,
  variantOid: Types.ObjectId,
  productTitle: string,
  productSlug: string,
  sku: string,
  catalogUnitPrice: number,
  saleUnitPrice: number,
  buyUnitPrice: number,
  quantity: number,
): IOrderLineItemSnapshot => {
  const cat = roundMoney(catalogUnitPrice);
  const sale = roundMoney(saleUnitPrice);
  const buy = roundMoney(buyUnitPrice);
  const priceOverridden = sale !== cat;
  const lineSubtotal = roundMoney(sale * quantity);
  return {
    productId,
    variantId: variantOid,
    productTitle,
    productSlug,
    sku,
    catalogUnitPrice: cat,
    priceOverridden,
    unitPrice: sale,
    buyUnitPrice: buy,
    quantity,
    lineSubtotal,
  };
};

type LineProcessorMode = 'online' | 'phone' | 'pos';

type LineProcessorRow = {
  productId: string;
  quantity: number;
  variantId?: string;
  unitPrice?: number;
  unitPriceOverride?: number;
  mode: LineProcessorMode;
};

const assembleSnapshotsAndStockPlan = async (rows: LineProcessorRow[]) => {
  const decrementPlan: StockDecrement[] = [];
  const lines: IOrderLineItemSnapshot[] = [];

  for (const raw of rows) {
    assertValidObjectId(raw.productId);
    if (!Number.isInteger(raw.quantity) || raw.quantity < 1) {
      throw new AppError('Quantity must be a positive integer', httpStatus.BAD_REQUEST);
    }

    const pid = new Types.ObjectId(raw.productId);
    const product = await Product.findById(pid).exec();
    if (!product || product.status !== 'active') {
      throw new AppError('Product not available', httpStatus.NOT_FOUND);
    }

    const variant = await resolveVariantForProductCheckout(
      pid,
      raw.variantId ? String(raw.variantId) : undefined,
    );
    const catalog = roundMoney(variant.price);
    let sale = catalog;
    if (raw.mode === 'pos') {
      if (raw.unitPrice === undefined || raw.unitPrice < 0) {
        throw new AppError('POS lines require a valid unit price', httpStatus.BAD_REQUEST);
      }
      sale = roundMoney(raw.unitPrice);
    } else if (raw.unitPriceOverride !== undefined) {
      if (raw.unitPriceOverride < 0) {
        throw new AppError('Price override cannot be negative', httpStatus.BAD_REQUEST);
      }
      sale = roundMoney(raw.unitPriceOverride);
    }

    decrementPlan.push({ variantOid: variant._id as Types.ObjectId, qty: raw.quantity });

    lines.push(
      buildLineSnapshot(
        pid,
        variant._id as Types.ObjectId,
        product.title,
        product.slug,
        variant.sku,
        catalog,
        sale,
        roundMoney(variant.buyPrice ?? 0),
        raw.quantity,
      ),
    );
  }

  return { lines, decrementPlan };
};

const deductStockPlan = async (plan: StockDecrement[]) => {
  const applied: StockDecrement[] = [];
  try {
    for (const p of plan) {
      await decrementVariantStockAtomic(p.variantOid, p.qty);
      applied.push(p);
    }
  } catch (e) {
    await rollbackVariantStock(applied);
    throw e;
  }
};

const loadSavedAddressSnapshot = async (
  userId: string,
  addressId: string,
): Promise<{ snapshot: IOrderAddressSnapshot; savedAddressId: Types.ObjectId }> => {
  assertValidObjectId(userId);
  assertValidObjectId(addressId);

  const uid = new Types.ObjectId(userId);
  const doc = await UserAddress.findOne({ _id: addressId, userId: uid }).lean().exec();
  if (!doc) {
    throw new AppError('Address not found', httpStatus.NOT_FOUND);
  }

  return {
    savedAddressId: doc._id as Types.ObjectId,
    snapshot: {
      name: doc.name,
      phone: doc.phone,
      country: doc.country,
      state: doc.state,
      city: doc.city,
      thana: doc.thana,
      localLocation: doc.localLocation,
    },
  };
};

const fetchOrderLean = async (orderId: Types.ObjectId) =>
  Order.findById(orderId)
    .populate([...POPULATE_ORDER_DETAIL])
    .lean()
    .exec();

type PersistOrderArgs = {
  orderPayload: Partial<IOrder> & Record<string, unknown>;
  decremented: StockDecrement[];
  resolvedCoupon: AppliedCouponResolved | null;
};

const persistOrderPaymentAndCoupon = async ({
  orderPayload,
  decremented,
  resolvedCoupon,
}: PersistOrderArgs) => {
  let oid: Types.ObjectId | undefined;
  try {
    const orderDoc = await Order.create(orderPayload);
    oid = orderDoc._id as Types.ObjectId;

    const paymentDoc = await Payment.create({
      transactionId: generatePaymentTransactionId(),
      userId: orderPayload.userId,
      orderId: oid,
      gateway: orderPayload.paymentMethod as PaymentGateway,
      status: orderPayload.paymentStatus as PaymentStatus,
      amount: orderPayload.totalAmount as number,
      currency: orderPayload.currency as string,
      notes: `Order ${String(orderPayload.orderNumber)}`,
    });
    orderDoc.paymentId = paymentDoc._id as Types.ObjectId;
    await orderDoc.save();

    if (resolvedCoupon) {
      await CouponService.consumeCouponUsageAtomic(String(resolvedCoupon._id));
    }

    return fetchOrderLean(oid);
  } catch (inner) {
    if (oid) {
      await Payment.deleteMany({ orderId: oid }).exec().catch(() => undefined);
      await Order.deleteOne({ _id: oid }).exec().catch(() => undefined);
    }
    await rollbackVariantStock(decremented);
    throw inner;
  }
};

const createOrderIntoDB = async (userId: string, payload: CreateOrderPayload) => {
  await SettingsService.assertLoggedInCheckoutEnabled();
  assertValidObjectId(userId);
  if (!isPaymentGateway(payload.paymentMethod)) {
    throw new AppError('Invalid payment method', httpStatus.BAD_REQUEST);
  }
  if (payload.paymentMethod === 'pos_cash' || payload.paymentMethod === 'pos_card') {
    throw new AppError('Use admin POS to record in-store sales', httpStatus.BAD_REQUEST);
  }

  if (!payload.items?.length) {
    throw new AppError('Cart is empty', httpStatus.BAD_REQUEST);
  }

  const currency = (payload.currency ?? 'BDT').toUpperCase().trim();
  const { snapshot: addressSnapshot, savedAddressId } = await loadSavedAddressSnapshot(
    userId,
    payload.addressId,
  );

  const rows: LineProcessorRow[] = payload.items.map((it) => ({
    productId: it.productId,
    quantity: it.quantity,
    variantId: it.variantId,
    unitPriceOverride: it.unitPriceOverride,
    mode: 'online',
  }));

  const { lines, decrementPlan } = await assembleSnapshotsAndStockPlan(rows);

  const { itemsSubtotal, resolvedCoupon, couponDiscountAmount, totalAmount } =
    await resolveOrderCouponTotals(payload.couponCode, currency, lines);

  const orderNumber = generateOrderNumber('ORD');
  const uid = new Types.ObjectId(userId);

  const paymentStatus: PaymentStatus = 'pending';
  const orderStatus = 'pending' as IOrder['status'];

  const orderPayload: PersistOrderArgs['orderPayload'] = {
    orderNumber,
    channel: 'online',
    deliveryMode: 'ship_to_address',
    userId: uid,
    items: lines,
    addressSnapshot,
    savedAddressId,
    ...(resolvedCoupon
      ? { couponId: resolvedCoupon._id, couponCode: resolvedCoupon.code }
      : {}),
    couponDiscountAmount,
    itemsSubtotal,
    totalAmount,
    currency,
    paymentMethod: payload.paymentMethod,
    paymentStatus,
    status: orderStatus,
  };

  await deductStockPlan(decrementPlan);

  return persistOrderPaymentAndCoupon({
    orderPayload,
    decremented: decrementPlan,
    resolvedCoupon,
  });
};

const createGuestOrderIntoDB = async (payload: GuestOrderPayload) => {
  await SettingsService.assertGuestQuickOrderEnabled();

  if (!isPaymentGateway(payload.paymentMethod)) {
    throw new AppError('Invalid payment method', httpStatus.BAD_REQUEST);
  }
  if (payload.paymentMethod !== 'cash_on_delivery') {
    throw new AppError('Guest orders support cash on delivery only', httpStatus.BAD_REQUEST);
  }
  if (!payload.items?.length) {
    throw new AppError('Order has no items', httpStatus.BAD_REQUEST);
  }

  const addressSnapshot: IOrderAddressSnapshot = {
    name: payload.addressSnapshot.name.trim(),
    phone: payload.addressSnapshot.phone.trim(),
    country: payload.addressSnapshot.country.trim() || 'Bangladesh',
    state: payload.addressSnapshot.state.trim(),
    city: payload.addressSnapshot.city.trim(),
    thana: payload.addressSnapshot.thana.trim(),
    localLocation: payload.addressSnapshot.localLocation.trim(),
  };

  const guestContact = {
    name: payload.guestContact.name.trim(),
    phone: payload.guestContact.phone.trim(),
  };

  const currency = (payload.currency ?? 'BDT').toUpperCase().trim();
  const rows: LineProcessorRow[] = payload.items.map((it) => ({
    productId: it.productId,
    quantity: it.quantity,
    variantId: it.variantId,
    mode: 'online',
  }));

  const { lines, decrementPlan } = await assembleSnapshotsAndStockPlan(rows);
  const { itemsSubtotal, resolvedCoupon, couponDiscountAmount, totalAmount } =
    await resolveOrderCouponTotals(payload.couponCode, currency, lines);

  const orderNumber = generateOrderNumber('ORD');
  const paymentStatus: PaymentStatus = 'pending';
  const orderStatus = 'pending' as IOrder['status'];

  const orderPayload: PersistOrderArgs['orderPayload'] = {
    orderNumber,
    channel: 'online',
    deliveryMode: 'ship_to_address',
    guestContact,
    items: lines,
    addressSnapshot,
    ...(resolvedCoupon
      ? { couponId: resolvedCoupon._id, couponCode: resolvedCoupon.code }
      : {}),
    couponDiscountAmount,
    itemsSubtotal,
    totalAmount,
    currency,
    paymentMethod: payload.paymentMethod,
    paymentStatus,
    status: orderStatus,
  };

  await deductStockPlan(decrementPlan);

  return persistOrderPaymentAndCoupon({
    orderPayload,
    decremented: decrementPlan,
    resolvedCoupon,
  });
};

const resolveCustomerForAdminPhoneOrder = async (payload: AdminPhoneOrderPayload) => {
  if (!payload.customerUserId?.trim() && !payload.guestContact?.phone?.trim()) {
    throw new AppError(
      'Either customerUserId or guest contact phone is required',
      httpStatus.BAD_REQUEST,
    );
  }

  let ownerId: Types.ObjectId | undefined;
  if (payload.customerUserId?.trim()) {
    assertValidObjectId(payload.customerUserId);
    const u = await User.findById(payload.customerUserId.trim()).exec();
    if (!u) {
      throw new AppError('Customer account not found', httpStatus.NOT_FOUND);
    }
    ownerId = u._id as Types.ObjectId;
  }
  return ownerId;
};

const createAdminPhoneOrderIntoDB = async (
  adminUserId: string,
  payload: AdminPhoneOrderPayload,
) => {
  assertValidObjectId(adminUserId);
  if (!isPaymentGateway(payload.paymentMethod)) {
    throw new AppError('Invalid payment method', httpStatus.BAD_REQUEST);
  }
  if (payload.paymentMethod === 'pos_cash' || payload.paymentMethod === 'pos_card') {
    throw new AppError('POS payment methods are only for in-store sales', httpStatus.BAD_REQUEST);
  }
  if (!payload.items?.length) {
    throw new AppError('Order has no items', httpStatus.BAD_REQUEST);
  }

  const ownerId = await resolveCustomerForAdminPhoneOrder(payload);

  let addressSnapshot: IOrderAddressSnapshot;
  if (payload.deliveryMode === 'ship_to_address') {
    if (!payload.addressSnapshot) {
      throw new AppError(
        'Delivery address is required for phone delivery orders',
        httpStatus.BAD_REQUEST,
      );
    }
    addressSnapshot = {
      name: payload.addressSnapshot.name.trim(),
      phone: payload.addressSnapshot.phone.trim(),
      country: payload.addressSnapshot.country.trim(),
      state: payload.addressSnapshot.state.trim(),
      city: payload.addressSnapshot.city.trim(),
      thana: payload.addressSnapshot.thana.trim(),
      localLocation: payload.addressSnapshot.localLocation.trim(),
    };
  } else {
    addressSnapshot = { ...SHOP_COUNTER_ADDRESS };
  }

  const currency = (payload.currency ?? 'BDT').toUpperCase().trim();
  const rows: LineProcessorRow[] = payload.items.map((it) => ({
    productId: it.productId,
    quantity: it.quantity,
    variantId: it.variantId,
    unitPriceOverride: it.unitPriceOverride,
    mode: 'phone',
  }));

  const { lines, decrementPlan } = await assembleSnapshotsAndStockPlan(rows);
  const { itemsSubtotal, resolvedCoupon, couponDiscountAmount, totalAmount } =
    await resolveOrderCouponTotals(payload.couponCode, currency, lines);

  const orderNumber = generateOrderNumber('PHN');
  const adminOid = new Types.ObjectId(adminUserId);

  const guestContact =
    payload.guestContact?.phone?.trim() && payload.guestContact?.name?.trim()
      ? {
          name: payload.guestContact.name.trim(),
          phone: payload.guestContact.phone.trim(),
        }
      : undefined;

  const paymentStatus: PaymentStatus = 'pending';
  const orderStatus = 'pending' as IOrder['status'];

  const orderPayload: PersistOrderArgs['orderPayload'] = {
    orderNumber,
    channel: 'phone',
    deliveryMode: payload.deliveryMode,
    ...(ownerId ? { userId: ownerId } : {}),
    placedByAdminId: adminOid,
    ...(guestContact ? { guestContact } : {}),
    ...(payload.adminNotes?.trim() ? { adminNotes: payload.adminNotes.trim() } : {}),
    items: lines,
    addressSnapshot,
    ...(resolvedCoupon
      ? { couponId: resolvedCoupon._id, couponCode: resolvedCoupon.code }
      : {}),
    couponDiscountAmount,
    itemsSubtotal,
    totalAmount,
    currency,
    paymentMethod: payload.paymentMethod,
    paymentStatus,
    status: orderStatus,
  };

  await deductStockPlan(decrementPlan);

  return persistOrderPaymentAndCoupon({
    orderPayload,
    decremented: decrementPlan,
    resolvedCoupon,
  });
};

const createAdminPosOrderIntoDB = async (
  adminUserId: string,
  payload: AdminPosOrderPayload,
  staffRole: UserRole,
) => {
  assertValidObjectId(adminUserId);
  if (!payload.items?.length) {
    throw new AppError('Order has no items', httpStatus.BAD_REQUEST);
  }

  const currency = (payload.currency ?? 'BDT').toUpperCase().trim();
  const rows: LineProcessorRow[] = payload.items.map((it) => ({
    productId: it.productId,
    quantity: it.quantity,
    variantId: it.variantId,
    unitPrice: it.unitPrice,
    mode: 'pos',
  }));

  const { lines, decrementPlan } = await assembleSnapshotsAndStockPlan(rows);

  const canOverridePrice = staffRole === 'ADMIN' || staffRole === 'MANAGER';
  for (const line of lines) {
    if (line.priceOverridden && !canOverridePrice) {
      throw new AppError('Only admin or manager can set custom POS prices', httpStatus.FORBIDDEN);
    }
  }

  const { itemsSubtotal, resolvedCoupon, couponDiscountAmount, totalAmount } =
    await resolveOrderCouponTotals(payload.couponCode, currency, lines);

  const orderNumber = generateOrderNumber('POS');
  const adminOid = new Types.ObjectId(adminUserId);

  const optionalPhone = payload.guestContact?.phone?.trim();
  const guestContact = optionalPhone
    ? {
        name: payload.guestContact?.name?.trim() || 'POS Customer',
        phone: optionalPhone,
      }
    : undefined;

  const deliveryMode = payload.deliveryMode ?? 'ship_to_address';
  const addressSnapshot: IOrderAddressSnapshot = optionalPhone
    ? {
        ...SHOP_COUNTER_ADDRESS,
        name: guestContact!.name,
        phone: optionalPhone,
        ...(deliveryMode === 'ship_to_address'
          ? { localLocation: 'POS delivery — contact customer' }
          : {}),
      }
    : { ...SHOP_COUNTER_ADDRESS };

  const paymentStatus: PaymentStatus = 'completed';
  const orderStatus = 'delivered' as IOrder['status'];

  const orderPayload: PersistOrderArgs['orderPayload'] = {
    orderNumber,
    channel: 'pos',
    deliveryMode,
    placedByAdminId: adminOid,
    ...(guestContact ? { guestContact } : {}),
    ...(payload.adminNotes?.trim() ? { adminNotes: payload.adminNotes.trim() } : {}),
    items: lines,
    addressSnapshot,
    ...(resolvedCoupon
      ? { couponId: resolvedCoupon._id, couponCode: resolvedCoupon.code }
      : {}),
    couponDiscountAmount,
    itemsSubtotal,
    totalAmount,
    currency,
    paymentMethod: payload.paymentMethod,
    paymentStatus,
    status: orderStatus,
  };

  await deductStockPlan(decrementPlan);

  return persistOrderPaymentAndCoupon({
    orderPayload,
    decremented: decrementPlan,
    resolvedCoupon,
  });
};

const listOrdersAdminFromDB = async (filters: {
  channel?: OrderChannel;
  status?: IOrder['status'];
}) => {
  const q: Record<string, unknown> = {};
  if (filters.channel) q.channel = filters.channel;
  if (filters.status) q.status = filters.status;
  return Order.find(q)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate([...POPULATE_ORDER_DETAIL])
    .populate({ path: 'userId', select: 'name email phone' })
    .populate({ path: 'placedByAdminId', select: 'name email' })
    .populate({ path: 'paymentId', select: 'gateway status amount currency createdAt' })
    .lean()
    .exec();
};

const getOrderAdminByIdFromDB = async (orderId: string) => {
  assertValidObjectId(orderId);
  const doc = await Order.findById(orderId)
    .populate([...POPULATE_ORDER_DETAIL])
    .populate({ path: 'userId', select: 'name email phone' })
    .populate({ path: 'placedByAdminId', select: 'name email' })
    .populate({ path: 'paymentId', select: 'gateway status amount currency createdAt' })
    .lean()
    .exec();
  if (!doc) {
    throw new AppError('Order not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const ADMIN_STATUS_TRANSITIONS: Record<IOrder['status'], IOrder['status'][]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'pending', 'cancelled'],
  processing: ['shipped', 'confirmed', 'cancelled'],
  shipped: ['delivered', 'processing', 'cancelled'],
  delivered: ['returned', 'shipped'],
  return_requested: ['returned', 'delivered'],
  cancelled: [],
  returned: [],
};

const FULFILLMENT_PIPELINE: IOrder['status'][] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
];

const pipelineIndex = (status: IOrder['status']) => FULFILLMENT_PIPELINE.indexOf(status);

const isPipelineForward = (from: IOrder['status'], to: IOrder['status']) => {
  const fromIdx = pipelineIndex(from);
  const toIdx = pipelineIndex(to);
  return fromIdx >= 0 && toIdx === fromIdx + 1;
};

const isPipelineBackward = (from: IOrder['status'], to: IOrder['status']) => {
  const fromIdx = pipelineIndex(from);
  const toIdx = pipelineIndex(to);
  return fromIdx >= 0 && toIdx === fromIdx - 1;
};

const restoreStockFromOrderItems = async (items: IOrderLineItemSnapshot[]) => {
  for (const item of items) {
    if (item.variantId) {
      await VariantModel.updateOne(
        { _id: item.variantId },
        { $inc: { stock: item.quantity } },
      ).exec();
    }
  }
};

const updateOrderStatusAdminFromDB = async (
  orderId: string,
  nextStatus: IOrder['status'],
  options?: { statusComment?: string; adminUserId?: string },
) => {
  assertValidObjectId(orderId);
  const order = await Order.findById(orderId).exec();
  if (!order) {
    throw new AppError('Order not found', httpStatus.NOT_FOUND);
  }

  const currentStatus = order.status;
  if (currentStatus === nextStatus) {
    throw new AppError('Order is already in this status', httpStatus.BAD_REQUEST);
  }

  const allowed = ADMIN_STATUS_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      `Cannot change status from ${currentStatus} to ${nextStatus}`,
      httpStatus.BAD_REQUEST,
    );
  }

  if (isPipelineBackward(currentStatus, nextStatus)) {
    const comment = options?.statusComment?.trim();
    if (!comment || comment.length < 3) {
      throw new AppError(
        'A comment is required when moving an order back to a previous status',
        httpStatus.BAD_REQUEST,
      );
    }
  }

  if (nextStatus === 'cancelled') {
    await restoreStockFromOrderItems(order.items);
    if (order.paymentStatus === 'pending' || order.paymentStatus === 'processing') {
      order.paymentStatus = 'cancelled';
    }
  }

  if (nextStatus === 'returned') {
    await restoreStockFromOrderItems(order.items);
    if (order.paymentStatus === 'completed') {
      order.paymentStatus = 'refunded';
    }
  }

  const historyEntry = {
    from: currentStatus,
    to: nextStatus,
    ...(options?.statusComment?.trim() ? { comment: options.statusComment.trim() } : {}),
    ...(options?.adminUserId ? { changedBy: new Types.ObjectId(options.adminUserId) } : {}),
    changedAt: new Date(),
  };

  order.status = nextStatus;
  order.statusHistory = [...(order.statusHistory ?? []), historyEntry];
  await order.save();

  return getOrderAdminByIdFromDB(orderId);
};

const cancelMyOrderFromDB = async (userId: string, orderId: string) => {
  assertValidObjectId(userId);
  assertValidObjectId(orderId);
  const order = await Order.findOne({
    _id: orderId,
    userId: new Types.ObjectId(userId),
  }).exec();

  if (!order) {
    throw new AppError('Order not found', httpStatus.NOT_FOUND);
  }
  if (order.status !== 'pending') {
    throw new AppError('Only pending orders can be cancelled', httpStatus.BAD_REQUEST);
  }

  await restoreStockFromOrderItems(order.items);
  order.status = 'cancelled';
  if (order.paymentStatus === 'pending' || order.paymentStatus === 'processing') {
    order.paymentStatus = 'cancelled';
  }
  await order.save();
  return getMyOrderByIdFromDB(userId, orderId);
};

const returnMyOrderFromDB = async (
  userId: string,
  orderId: string,
  payload: { reason: import('./order.interface').OrderReturnReason; description: string },
) => {
  assertValidObjectId(userId);
  assertValidObjectId(orderId);
  const order = await Order.findOne({
    _id: orderId,
    userId: new Types.ObjectId(userId),
  }).exec();

  if (!order) {
    throw new AppError('Order not found', httpStatus.NOT_FOUND);
  }
  if (order.status !== 'delivered') {
    throw new AppError('Only delivered orders can be returned', httpStatus.BAD_REQUEST);
  }

  const description = payload.description.trim();
  if (description.length < 10) {
    throw new AppError('Please provide a short description (at least 10 characters)', httpStatus.BAD_REQUEST);
  }

  const currentStatus = order.status;
  order.status = 'return_requested';
  order.returnRequest = {
    reason: payload.reason,
    description,
    requestedAt: new Date(),
  };
  order.statusHistory = [
    ...(order.statusHistory ?? []),
    {
      from: currentStatus,
      to: 'return_requested',
      comment: `Return requested: ${payload.reason} — ${description}`,
      changedAt: new Date(),
    },
  ];
  await order.save();
  return getMyOrderByIdFromDB(userId, orderId);
};

const approveReturnRequestAdminFromDB = async (
  orderId: string,
  adminUserId: string,
  options?: { refundAmount?: number; adminNote?: string },
) => {
  assertValidObjectId(orderId);
  const order = await Order.findById(orderId).exec();
  if (!order) {
    throw new AppError('Order not found', httpStatus.NOT_FOUND);
  }
  if (order.status !== 'return_requested') {
    throw new AppError('Order has no pending return request', httpStatus.BAD_REQUEST);
  }

  const refundAmount =
    options?.refundAmount !== undefined ? options.refundAmount : order.totalAmount;
  if (refundAmount < 0 || refundAmount > order.totalAmount) {
    throw new AppError('Invalid refund amount', httpStatus.BAD_REQUEST);
  }

  await restoreStockFromOrderItems(order.items);

  const noteParts = [
    options?.adminNote?.trim(),
    refundAmount < order.totalAmount
      ? `Partial refund: ${refundAmount} of ${order.totalAmount}`
      : undefined,
  ].filter(Boolean);

  order.status = 'returned';
  order.returnRequest = undefined;
  order.statusHistory = [
    ...(order.statusHistory ?? []),
    {
      from: 'return_requested',
      to: 'returned',
      comment: noteParts.join(' · ') || 'Return approved — product received',
      changedBy: new Types.ObjectId(adminUserId),
      changedAt: new Date(),
    },
  ];

  if (order.paymentStatus === 'completed' || order.paymentStatus === 'pending') {
    order.paymentStatus = refundAmount >= order.totalAmount ? 'refunded' : 'completed';
  }

  if (order.paymentId) {
    await Payment.updateOne(
      { _id: order.paymentId },
      {
        $set: {
          status: refundAmount >= order.totalAmount ? 'refunded' : 'completed',
          ...(noteParts.length ? { notes: noteParts.join(' · ') } : {}),
        },
      },
    ).exec();
  }

  await order.save();
  return getOrderAdminByIdFromDB(orderId);
};

const rejectReturnRequestAdminFromDB = async (
  orderId: string,
  adminUserId: string,
  adminNote?: string,
) => {
  assertValidObjectId(orderId);
  const order = await Order.findById(orderId).exec();
  if (!order) {
    throw new AppError('Order not found', httpStatus.NOT_FOUND);
  }
  if (order.status !== 'return_requested') {
    throw new AppError('Order has no pending return request', httpStatus.BAD_REQUEST);
  }

  order.status = 'delivered';
  order.returnRequest = undefined;
  order.statusHistory = [
    ...(order.statusHistory ?? []),
    {
      from: 'return_requested',
      to: 'delivered',
      comment: adminNote?.trim() || 'Return request rejected',
      changedBy: new Types.ObjectId(adminUserId),
      changedAt: new Date(),
    },
  ];
  await order.save();
  return getOrderAdminByIdFromDB(orderId);
};

const markOrderPaymentReceivedAdminFromDB = async (
  orderId: string,
  adminUserId: string,
  adminNote?: string,
) => {
  assertValidObjectId(orderId);
  const order = await Order.findById(orderId).exec();
  if (!order) {
    throw new AppError('Order not found', httpStatus.NOT_FOUND);
  }
  if (order.status !== 'delivered') {
    throw new AppError('Payment can only be marked received for delivered orders', httpStatus.BAD_REQUEST);
  }
  if (order.paymentStatus === 'completed') {
    throw new AppError('Payment is already marked as received', httpStatus.BAD_REQUEST);
  }
  if (!['pending', 'processing'].includes(order.paymentStatus)) {
    throw new AppError('Payment cannot be updated in its current state', httpStatus.BAD_REQUEST);
  }

  order.paymentStatus = 'completed';
  order.statusHistory = [
    ...(order.statusHistory ?? []),
    {
      from: order.status,
      to: order.status,
      comment: adminNote?.trim() || 'Payment received (cash on delivery)',
      changedBy: new Types.ObjectId(adminUserId),
      changedAt: new Date(),
    },
  ];

  if (order.paymentId) {
    await Payment.updateOne(
      { _id: order.paymentId },
      { $set: { status: 'completed', ...(adminNote?.trim() ? { notes: adminNote.trim() } : {}) } },
    ).exec();
  }

  await order.save();
  return getOrderAdminByIdFromDB(orderId);
};

const listMyOrdersFromDB = async (userId: string) => {
  assertValidObjectId(userId);
  return Order.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .populate({ path: 'items.productId', select: 'title slug status thumbnail gallery' })
    .populate({
      path: 'items.variantId',
      select: 'sku price stock attributes status',
    })
    .lean()
    .exec();
};

const getMyOrderByIdFromDB = async (userId: string, orderId: string) => {
  assertValidObjectId(userId);
  assertValidObjectId(orderId);
  const doc = await Order.findOne({
    _id: orderId,
    userId: new Types.ObjectId(userId),
  })
    .populate({ path: 'items.productId', select: 'title slug status thumbnail gallery' })
    .populate({
      path: 'items.variantId',
      select: 'sku price stock attributes status',
    })
    .populate({ path: 'paymentId', select: 'gateway status amount currency createdAt' })
    .lean()
    .exec();

  if (!doc) {
    throw new AppError('Order not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

export const OrderService = {
  createOrderIntoDB,
  createGuestOrderIntoDB,
  createAdminPhoneOrderIntoDB,
  createAdminPosOrderIntoDB,
  listOrdersAdminFromDB,
  getOrderAdminByIdFromDB,
  updateOrderStatusAdminFromDB,
  cancelMyOrderFromDB,
  returnMyOrderFromDB,
  approveReturnRequestAdminFromDB,
  rejectReturnRequestAdminFromDB,
  markOrderPaymentReceivedAdminFromDB,
  listMyOrdersFromDB,
  getMyOrderByIdFromDB,
};
