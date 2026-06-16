import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Image } from '../media/image.model';
import { Product } from '../product/product.model';
import type { Variant } from './variant.interface';
import { VariantModel } from './variant.model';

const IMAGE_POPULATE = {
  path: 'image',
  select: '_id url name alt useCase size createdAt',
} as const;

const PRODUCT_POPULATE = {
  path: 'productId',
  select: '_id title createdAt updatedAt',
} as const;

const assertValidObjectId = (id: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }
};

const normalizePairs = (attrs: Variant['attributes']): Variant['attributes'] =>
  attrs.map((a) => ({
    name: a.name.trim(),
    value: a.value.trim(),
  }));

const attributesSignature = (attrs: Variant['attributes']): string =>
  normalizePairs(attrs)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => `${a.name.toLowerCase()}:${a.value.toLowerCase()}`)
    .join('|');

const assertUniqueAttributesForProduct = async (
  productId: string,
  attributes: Variant['attributes'],
  excludeVariantId?: string,
): Promise<void> => {
  const signature = attributesSignature(attributes);
  const siblings = await VariantModel.find({ productId: new Types.ObjectId(productId) })
    .select('_id attributes sku')
    .lean()
    .exec();

  const duplicate = siblings.find(
    (v) =>
      v._id.toString() !== excludeVariantId &&
      attributesSignature(v.attributes as Variant['attributes']) === signature,
  );

  if (duplicate) {
    throw new AppError(
      'A variant with this attribute combination already exists for this product',
      httpStatus.CONFLICT,
    );
  }
};

const assertProductExists = async (productId: string): Promise<void> => {
  assertValidObjectId(productId);
  const ok = await Product.exists({ _id: new Types.ObjectId(productId) }).exec();
  if (!ok) {
    throw new AppError('Product not found', httpStatus.BAD_REQUEST);
  }
};

const assertImageExists = async (imageId: string): Promise<void> => {
  assertValidObjectId(imageId);
  const img = await Image.findById(imageId).select('_id').lean().exec();
  if (!img) {
    throw new AppError('Image not found', httpStatus.BAD_REQUEST);
  }
};

const createVariantIntoDB = async (
  payload: Omit<Variant, '_id'> & Partial<Pick<Variant, 'status'>>,
) => {
  const sku = payload.sku.trim();
  if (!sku) {
    throw new AppError('SKU is required', httpStatus.BAD_REQUEST);
  }

  await assertProductExists(payload.productId);

  const dupSku = await VariantModel.findOne({ sku: new RegExp(`^${escapeRegex(sku)}$`, 'i') })
    .lean()
    .exec();
  if (dupSku) {
    throw new AppError('SKU already exists', httpStatus.CONFLICT);
  }

  const attributes = normalizePairs(payload.attributes);
  if (!attributes.length) {
    throw new AppError('At least one attribute pair is required', httpStatus.BAD_REQUEST);
  }

  await assertUniqueAttributesForProduct(payload.productId, attributes);

  if (payload.image) {
    await assertImageExists(payload.image);
  }

  const doc = await VariantModel.create({
    productId: new Types.ObjectId(payload.productId),
    sku,
    attributes,
    price: payload.price,
    buyPrice: payload.buyPrice ?? 0,
    stock: payload.stock,
    ...(payload.image ? { image: new Types.ObjectId(payload.image) } : {}),
    status: payload.status ?? 'active',
  });

  return VariantModel.findById(doc._id)
    .populate(IMAGE_POPULATE)
    .populate(PRODUCT_POPULATE)
    .lean()
    .exec();
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const getAllVariantsFromDB = async (productId?: string) => {
  const filter: Record<string, unknown> = {};
  if (productId !== undefined && productId !== '') {
    assertValidObjectId(productId);
    filter.productId = new Types.ObjectId(productId);
  }

  return VariantModel.find(filter)
    .populate(IMAGE_POPULATE)
    .populate(PRODUCT_POPULATE)
    .sort({ createdAt: -1 })
    .lean()
    .exec();
};

const getVariantByIdFromDB = async (id: string) => {
  assertValidObjectId(id);
  const doc = await VariantModel.findById(id)
    .populate(IMAGE_POPULATE)
    .populate(PRODUCT_POPULATE)
    .lean()
    .exec();
  if (!doc) {
    throw new AppError('Variant not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const updateVariantInDB = async (id: string, body: Record<string, unknown>) => {
  assertValidObjectId(id);
  const v = await VariantModel.findById(id).exec();
  if (!v) {
    throw new AppError('Variant not found', httpStatus.NOT_FOUND);
  }

  if (typeof body.productId === 'string') {
    await assertProductExists(body.productId);
    v.productId = new Types.ObjectId(body.productId);
  }

  if (typeof body.sku === 'string') {
    const sku = body.sku.trim();
    if (!sku) {
      throw new AppError('SKU is required', httpStatus.BAD_REQUEST);
    }
    const dup = await VariantModel.findOne({
      _id: { $ne: v._id },
      sku: new RegExp(`^${escapeRegex(sku)}$`, 'i'),
    })
      .lean()
      .exec();
    if (dup) {
      throw new AppError('SKU already exists', httpStatus.CONFLICT);
    }
    v.sku = sku;
  }

  if (Array.isArray(body.attributes)) {
    const attrs = body.attributes as Variant['attributes'];
    const normalized = normalizePairs(attrs);
    if (!normalized.length) {
      throw new AppError('At least one attribute pair is required', httpStatus.BAD_REQUEST);
    }
    await assertUniqueAttributesForProduct(
      v.productId.toString(),
      normalized,
      v._id.toString(),
    );
    v.attributes = normalized;
  }

  if (typeof body.price === 'number') {
    v.price = body.price;
  }

  if (typeof body.buyPrice === 'number') {
    v.buyPrice = body.buyPrice;
  }

  if (typeof body.stock === 'number') {
    v.stock = body.stock;
  }

  if (body.image === null) {
    v.image = undefined;
  } else if (typeof body.image === 'string') {
    await assertImageExists(body.image);
    v.image = new Types.ObjectId(body.image);
  }

  if (typeof body.status === 'string') {
    if (body.status !== 'active' && body.status !== 'inactive') {
      throw new AppError('Invalid status', httpStatus.BAD_REQUEST);
    }
    v.status = body.status;
  }

  await v.save();

  return VariantModel.findById(v._id)
    .populate(IMAGE_POPULATE)
    .populate(PRODUCT_POPULATE)
    .lean()
    .exec();
};

const deleteVariantFromDB = async (id: string) => {
  assertValidObjectId(id);
  const result = await VariantModel.findByIdAndDelete(id).exec();
  if (!result) {
    throw new AppError('Variant not found', httpStatus.NOT_FOUND);
  }
};

export const VariantService = {
  createVariantIntoDB,
  getAllVariantsFromDB,
  getVariantByIdFromDB,
  updateVariantInDB,
  deleteVariantFromDB,
};
