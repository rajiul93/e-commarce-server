import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Image } from '../media/image.model';
import { Product } from '../product/product.model';
import type { ICollection } from './collection.interface';
import { Collection } from './collection.model';

type CreatePayload = {
  name: string;
  banner?: string | null;
  products?: string[];
  showBannerOnHome?: boolean;
  sortOrder?: number;
  isActive?: boolean;
};

const BANNER_POPULATE = {
  path: 'banner',
  select: '_id url name alt useCase',
} as const;

const PRODUCTS_POPULATE = {
  path: 'products',
  select: 'title slug status thumbnail minPrice totalStock',
  populate: { path: 'thumbnail', select: '_id url name alt' },
} as const;

const makeSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const ensureUniqueSlug = async (baseSlug: string, excludeDocId?: Types.ObjectId): Promise<string> => {
  let slug = baseSlug || 'collection';
  let suffix = 0;

  for (;;) {
    const clash = await Collection.findOne({ slug }).select('_id').lean().exec();
    if (!clash || (excludeDocId && String(clash._id) === String(excludeDocId))) {
      return slug;
    }
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
};

const validateProductIds = async (productIds: string[]) => {
  if (!productIds.length) return [];
  const unique = [...new Set(productIds)];
  const count = await Product.countDocuments({
    _id: { $in: unique.map((id) => new Types.ObjectId(id)) },
  }).exec();
  if (count !== unique.length) {
    throw new AppError('One or more products are invalid', httpStatus.BAD_REQUEST);
  }
  return unique.map((id) => new Types.ObjectId(id));
};

const validateBannerId = async (bannerId?: string | null) => {
  if (!bannerId) return undefined;
  const image = await Image.findById(bannerId).select('_id').lean().exec();
  if (!image) {
    throw new AppError('Banner image not found', httpStatus.BAD_REQUEST);
  }
  return new Types.ObjectId(bannerId);
};

const populateOne = async (id: Types.ObjectId | string) => {
  const doc = await Collection.findById(id)
    .populate(BANNER_POPULATE)
    .populate(PRODUCTS_POPULATE)
    .lean()
    .exec();
  if (!doc) {
    throw new AppError('Collection not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const createCollectionIntoDB = async (payload: CreatePayload) => {
  const name = payload.name.trim();
  const slug = await ensureUniqueSlug(makeSlug(name));
  const products = await validateProductIds(payload.products ?? []);
  const banner = await validateBannerId(payload.banner);

  const doc = await Collection.create({
    name,
    slug,
    products,
    ...(banner ? { banner } : {}),
    showBannerOnHome: payload.showBannerOnHome ?? false,
    sortOrder: payload.sortOrder ?? 0,
    isActive: payload.isActive ?? true,
  } satisfies Partial<ICollection>);

  return populateOne(doc._id as Types.ObjectId);
};

const listCollectionsFromDB = async (forHome?: boolean) => {
  const filter: Record<string, unknown> = { isActive: true };
  if (forHome) {
    filter.isActive = true;
  }

  return Collection.find(filter)
    .populate(BANNER_POPULATE)
    .populate(PRODUCTS_POPULATE)
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean()
    .exec();
};

const listAllCollectionsAdminFromDB = async () => {
  return Collection.find({})
    .populate(BANNER_POPULATE)
    .populate(PRODUCTS_POPULATE)
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean()
    .exec();
};

const getCollectionByIdFromDB = async (id: string) => {
  return populateOne(id);
};

const updateCollectionInDB = async (id: string, body: Record<string, unknown>) => {
  const doc = await Collection.findById(id).exec();
  if (!doc) {
    throw new AppError('Collection not found', httpStatus.NOT_FOUND);
  }

  if (typeof body.name === 'string') {
    doc.name = body.name.trim();
    doc.slug = await ensureUniqueSlug(makeSlug(doc.name), doc._id as Types.ObjectId);
  }

  if (body.banner === null) {
    doc.banner = undefined;
  } else if (typeof body.banner === 'string') {
    doc.banner = await validateBannerId(body.banner);
  }

  if (Array.isArray(body.products)) {
    doc.products = await validateProductIds(body.products as string[]);
  }

  if (typeof body.showBannerOnHome === 'boolean') {
    doc.showBannerOnHome = body.showBannerOnHome;
  }

  if (typeof body.sortOrder === 'number') {
    doc.sortOrder = body.sortOrder;
  }

  if (typeof body.isActive === 'boolean') {
    doc.isActive = body.isActive;
  }

  await doc.save();
  return populateOne(doc._id as Types.ObjectId);
};

const deleteCollectionFromDB = async (id: string) => {
  const deleted = await Collection.findByIdAndDelete(id).exec();
  if (!deleted) {
    throw new AppError('Collection not found', httpStatus.NOT_FOUND);
  }
  return deleted;
};

export const CollectionService = {
  createCollectionIntoDB,
  listCollectionsFromDB,
  listAllCollectionsAdminFromDB,
  getCollectionByIdFromDB,
  updateCollectionInDB,
  deleteCollectionFromDB,
};
