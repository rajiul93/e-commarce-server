import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Attribute } from '../attribute/attribute.model';
import { Brand } from '../brand/brand.model';
import { Category } from '../category/category.model';
import { Image } from '../media/image.model';
import { VariantModel } from '../variant/variant.model';
import type { ProductOfferType, ProductStatus } from './product.interface';
import { Product } from './product.model';

const IMAGE_SELECT = '_id url name alt useCase size createdAt' as const;

const THUMBNAIL_POPULATE = {
  path: 'thumbnail',
  select: IMAGE_SELECT,
} as const;

const GALLERY_POPULATE = {
  path: 'gallery',
  select: IMAGE_SELECT,
} as const;

const OG_IMAGE_POPULATE = {
  path: 'ogImage',
  select: IMAGE_SELECT,
} as const;

const BRAND_POPULATE = {
  path: 'brand',
  select: 'brandName image',
  populate: { path: 'image', select: '_id url name alt useCase size createdAt' },
} as const;

const CATEGORY_POPULATE = {
  path: 'category',
  select: 'categoryName slug level image description',
  populate: { path: 'image', select: '_id url name alt useCase size createdAt' },
} as const;

const ATTRIBUTES_POPULATE = {
  path: 'attributes',
  select: '_id name values status createdAt updatedAt',
} as const;

const VARIANT_IMAGE_SELECT = '_id url name alt useCase size createdAt' as const;

const assertValidObjectId = (id: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }
};

const makeSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const ensureUniqueProductSlug = async (baseSlug: string): Promise<string> => {
  let slug = baseSlug || 'product';
  let suffix = 0;

  for (;;) {
    const clash = await Product.findOne({ slug }).select('_id').lean().exec();
    if (!clash) {
      return slug;
    }
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
};

const assertCategoryActive = async (categoryId: string): Promise<void> => {
  assertValidObjectId(categoryId);
  const cat = await Category.findOne({
    _id: new Types.ObjectId(categoryId),
    isDeleted: false,
  })
    .select('_id')
    .lean()
    .exec();
  if (!cat) {
    throw new AppError('Category not found or unavailable', httpStatus.BAD_REQUEST);
  }
};

const assertBrandExists = async (brandId: string): Promise<void> => {
  assertValidObjectId(brandId);
  const b = await Brand.findById(brandId).select('_id').lean().exec();
  if (!b) {
    throw new AppError('Brand not found', httpStatus.BAD_REQUEST);
  }
};

const assertCatalogAttributes = async (ids: string[]): Promise<void> => {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  for (const id of unique) {
    assertValidObjectId(id);
    const row = await Attribute.findById(id).select('_id status').lean().exec();
    if (!row) {
      throw new AppError(`Attribute not found (${id})`, httpStatus.BAD_REQUEST);
    }
    if (row.status !== 'active') {
      throw new AppError(`Attribute (${id}) must be active`, httpStatus.BAD_REQUEST);
    }
  }
};

const assertImagesExist = async (ids: string[]): Promise<void> => {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  for (const id of unique) {
    assertValidObjectId(id);
    const img = await Image.findById(id).select('_id').lean().exec();
    if (!img) {
      throw new AppError(`Image not found (${id})`, httpStatus.BAD_REQUEST);
    }
  }
};

export type ProductCreatePayload = {
  title: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  category: string;
  brand?: string;
  thumbnail?: string;
  gallery?: string[];
  /** Attribute catalogue ids (Size, Color, …) used for variants of this product. */
  attributes?: string[];
  status?: ProductStatus;
  averageRating?: number;
  seoTitle?: string;
  seoDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  offerType?: ProductOfferType;
  offerValue?: number;
};

const normalizeOfferFields = (payload: {
  offerType?: ProductOfferType;
  offerValue?: number;
}): { offerType: ProductOfferType; offerValue: number } => {
  const offerType = payload.offerType ?? 'none';
  const offerValue = payload.offerValue ?? 0;

  if (offerType === 'none') {
    return { offerType: 'none', offerValue: 0 };
  }
  if (offerType === 'percent') {
    if (offerValue <= 0 || offerValue > 100) {
      throw new AppError('Offer percent must be between 1 and 100', httpStatus.BAD_REQUEST);
    }
    return { offerType, offerValue };
  }
  if (offerValue <= 0) {
    throw new AppError('Fixed offer amount must be greater than 0', httpStatus.BAD_REQUEST);
  }
  return { offerType, offerValue };
};

const createProductIntoDB = async (payload: ProductCreatePayload) => {
  const title = payload.title.trim();
  if (!title) {
    throw new AppError('Title is required', httpStatus.BAD_REQUEST);
  }

  await assertCategoryActive(payload.category);

  if (payload.brand) {
    await assertBrandExists(payload.brand);
  }

  if (payload.thumbnail) {
    await assertImagesExist([payload.thumbnail]);
  }

  if (payload.ogImage) {
    await assertImagesExist([payload.ogImage]);
  }

  const galleryIds = payload.gallery ?? [];
  if (galleryIds.length) {
    await assertImagesExist(galleryIds);
  }

  const attributeIds = payload.attributes ?? [];
  if (attributeIds.length) {
    await assertCatalogAttributes(attributeIds);
  }

  const offer = normalizeOfferFields(payload);

  const slugBase = payload.slug?.trim()
    ? makeSlug(payload.slug.trim())
    : makeSlug(title);
  const slug = await ensureUniqueProductSlug(slugBase);

  const doc = await Product.create({
    title,
    slug,
    shortDescription: payload.shortDescription?.trim(),
    description: payload.description?.trim(),
    category: new Types.ObjectId(payload.category),
    ...(payload.brand ? { brand: new Types.ObjectId(payload.brand) } : {}),
    ...(payload.thumbnail ? { thumbnail: new Types.ObjectId(payload.thumbnail) } : {}),
    ...(payload.ogImage ? { ogImage: new Types.ObjectId(payload.ogImage) } : {}),
    gallery: galleryIds.map((id) => new Types.ObjectId(id)),
    attributes: attributeIds.map((id) => new Types.ObjectId(id)),
    status: payload.status ?? 'draft',
    ...(payload.averageRating !== undefined ? { averageRating: payload.averageRating } : {}),
    ...(payload.seoTitle !== undefined ? { seoTitle: payload.seoTitle.trim() } : {}),
    ...(payload.seoDescription !== undefined ? { seoDescription: payload.seoDescription.trim() } : {}),
    ...(payload.ogTitle !== undefined ? { ogTitle: payload.ogTitle.trim() } : {}),
    ...(payload.ogDescription !== undefined ? { ogDescription: payload.ogDescription.trim() } : {}),
    isFeatured: payload.isFeatured ?? false,
    isBestSeller: payload.isBestSeller ?? false,
    offerType: offer.offerType,
    offerValue: offer.offerValue,
  });

  const populated = await Product.findById(doc._id)
    .populate(THUMBNAIL_POPULATE)
    .populate(GALLERY_POPULATE)
    .populate(OG_IMAGE_POPULATE)
    .populate(BRAND_POPULATE)
    .populate(CATEGORY_POPULATE)
    .populate(ATTRIBUTES_POPULATE)
    .lean()
    .exec();

  if (!populated) {
    throw new AppError('Product could not be loaded after create', httpStatus.INTERNAL_SERVER_ERROR);
  }

  const variants = await VariantModel.find({ productId: doc._id })
    .populate({ path: 'image', select: VARIANT_IMAGE_SELECT })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return { ...populated, variants };
};

const attachVariantSummary = async <T extends { _id: unknown }>(
  products: T[],
): Promise<(T & { minPrice: number | null; maxPrice: number | null; totalStock: number })[]> => {
  if (!products.length) {
    return products.map((p) => ({ ...p, minPrice: null, maxPrice: null, totalStock: 0 }));
  }

  const ids = products.map((p) => p._id as Types.ObjectId);
  const variants = await VariantModel.find({
    productId: { $in: ids },
    status: 'active',
  })
    .select('productId price stock')
    .lean()
    .exec();

  const byProduct = new Map<string, { minPrice: number; maxPrice: number; totalStock: number }>();
  for (const v of variants) {
    const key = String(v.productId);
    const row = byProduct.get(key) ?? { minPrice: v.price, maxPrice: v.price, totalStock: 0 };
    row.minPrice = Math.min(row.minPrice, v.price);
    row.maxPrice = Math.max(row.maxPrice, v.price);
    row.totalStock += v.stock;
    byProduct.set(key, row);
  }

  return products.map((p) => {
    const summary = byProduct.get(String(p._id));
    return {
      ...p,
      minPrice: summary?.minPrice ?? null,
      maxPrice: summary?.maxPrice ?? null,
      totalStock: summary?.totalStock ?? 0,
    };
  });
};

const populateProductQuery = () =>
  Product.find()
    .populate(THUMBNAIL_POPULATE)
    .populate(GALLERY_POPULATE)
    .populate(OG_IMAGE_POPULATE)
    .populate(BRAND_POPULATE)
    .populate(CATEGORY_POPULATE)
    .populate(ATTRIBUTES_POPULATE);

export type ListProductsQuery = {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'rating_asc' | 'rating_desc';
  page?: number;
  limit?: number;
};

const listActiveProductsFromDB = async (query: ListProductsQuery = {}) => {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 20, 100);
  const filter: Record<string, unknown> = { status: 'active' };

  const toObjectIdList = (value: string): Types.ObjectId[] => {
    const ids = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    ids.forEach((id) => assertValidObjectId(id));
    return ids.map((id) => new Types.ObjectId(id));
  };

  if (query.category) {
    const categoryIds = toObjectIdList(query.category);
    filter.category = categoryIds.length === 1 ? categoryIds[0] : { $in: categoryIds };
  }

  if (query.brand) {
    const brandIds = toObjectIdList(query.brand);
    filter.brand = brandIds.length === 1 ? brandIds[0] : { $in: brandIds };
  }

  if (query.minRating !== undefined && query.minRating > 0) {
    filter.averageRating = { $gte: query.minRating };
  }

  const raw = await populateProductQuery().find(filter).sort({ createdAt: -1 }).lean().exec();

  let items = await attachVariantSummary(raw);

  if (query.minPrice !== undefined) {
    items = items.filter((p) => (p.minPrice ?? 0) >= query.minPrice!);
  }
  if (query.maxPrice !== undefined) {
    items = items.filter((p) => (p.minPrice ?? 0) <= query.maxPrice!);
  }

  const sort = query.sort ?? 'newest';
  items.sort((a, b) => {
    switch (sort) {
      case 'price_asc':
        return (a.minPrice ?? 0) - (b.minPrice ?? 0);
      case 'price_desc':
        return (b.minPrice ?? 0) - (a.minPrice ?? 0);
      case 'rating_asc':
        return ((a as { averageRating?: number }).averageRating ?? 0) -
          ((b as { averageRating?: number }).averageRating ?? 0);
      case 'rating_desc':
        return ((b as { averageRating?: number }).averageRating ?? 0) -
          ((a as { averageRating?: number }).averageRating ?? 0);
      default:
        return 0;
    }
  });

  const total = items.length;
  const skip = (page - 1) * limit;
  const paged = items.slice(skip, skip + limit);

  return { items: paged, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
};

const getActiveProductSlugsFromDB = async (): Promise<string[]> => {
  const rows = await Product.find({ status: 'active' }).select('slug').lean().exec();
  return rows.map((r) => r.slug);
};

const loadProductWithVariants = async (filter: Record<string, unknown>) => {
  const populated = await populateProductQuery().findOne(filter).lean().exec();
  if (!populated) {
    throw new AppError('Product not found', httpStatus.NOT_FOUND);
  }
  if (populated.status !== 'active') {
    throw new AppError('Product not available', httpStatus.NOT_FOUND);
  }

  const variants = await VariantModel.find({ productId: populated._id, status: 'active' })
    .populate({ path: 'image', select: VARIANT_IMAGE_SELECT })
    .sort({ price: 1 })
    .lean()
    .exec();

  const [withSummary] = await attachVariantSummary([populated]);
  return { ...withSummary, variants };
};

const getActiveProductBySlugFromDB = async (slug: string) =>
  loadProductWithVariants({ slug: slug.toLowerCase().trim() });

const getActiveProductByIdFromDB = async (id: string) => {
  assertValidObjectId(id);
  return loadProductWithVariants({ _id: new Types.ObjectId(id) });
};

const listAllProductsAdminFromDB = async () => {
  const raw = await populateProductQuery().sort({ createdAt: -1 }).lean().exec();
  return attachVariantSummary(raw);
};

export type ProductUpdatePayload = Partial<ProductCreatePayload> & {
  thumbnail?: string | null;
  ogImage?: string | null;
};

const updateProductInDB = async (id: string, payload: ProductUpdatePayload) => {
  assertValidObjectId(id);
  const existing = await Product.findById(id).exec();
  if (!existing) {
    throw new AppError('Product not found', httpStatus.NOT_FOUND);
  }

  if (payload.category) {
    await assertCategoryActive(payload.category);
    existing.category = new Types.ObjectId(payload.category);
  }
  if (payload.brand !== undefined) {
    if (payload.brand) {
      await assertBrandExists(payload.brand);
      existing.brand = new Types.ObjectId(payload.brand);
    } else {
      existing.brand = undefined;
    }
  }
  if (payload.thumbnail !== undefined) {
    if (payload.thumbnail === null || payload.thumbnail === '') {
      existing.thumbnail = undefined;
    } else {
      await assertImagesExist([payload.thumbnail]);
      existing.thumbnail = new Types.ObjectId(payload.thumbnail);
    }
  }
  if (payload.gallery) {
    await assertImagesExist(payload.gallery);
    existing.gallery = payload.gallery.map((i) => new Types.ObjectId(i));
  }
  if (payload.attributes) {
    await assertCatalogAttributes(payload.attributes);
    existing.attributes = payload.attributes.map((i) => new Types.ObjectId(i));
  }
  if (payload.title !== undefined) {
    const title = payload.title.trim();
    if (!title) throw new AppError('Title is required', httpStatus.BAD_REQUEST);
    existing.title = title;
  }
  if (payload.slug !== undefined) {
    const slugBase = makeSlug(payload.slug.trim());
    existing.slug = await ensureUniqueProductSlug(slugBase);
  }
  if (payload.shortDescription !== undefined) {
    existing.shortDescription = payload.shortDescription?.trim();
  }
  if (payload.description !== undefined) {
    existing.description = payload.description?.trim();
  }
  if (payload.status !== undefined) {
    existing.status = payload.status;
  }
  if (payload.averageRating !== undefined) {
    existing.averageRating = payload.averageRating;
  }
  if (payload.seoTitle !== undefined) {
    existing.seoTitle = payload.seoTitle.trim();
  }
  if (payload.seoDescription !== undefined) {
    existing.seoDescription = payload.seoDescription.trim();
  }
  if (payload.ogTitle !== undefined) {
    existing.ogTitle = payload.ogTitle.trim();
  }
  if (payload.ogDescription !== undefined) {
    existing.ogDescription = payload.ogDescription.trim();
  }
  if (payload.ogImage === null || payload.ogImage === '') {
    existing.ogImage = undefined;
  } else if (payload.ogImage !== undefined) {
    await assertImagesExist([payload.ogImage]);
    existing.ogImage = new Types.ObjectId(payload.ogImage);
  }
  if (payload.isFeatured !== undefined) {
    existing.isFeatured = payload.isFeatured;
  }
  if (payload.isBestSeller !== undefined) {
    existing.isBestSeller = payload.isBestSeller;
  }
  if (payload.offerType !== undefined || payload.offerValue !== undefined) {
    const offer = normalizeOfferFields({
      offerType: payload.offerType ?? existing.offerType,
      offerValue: payload.offerValue ?? existing.offerValue,
    });
    existing.offerType = offer.offerType;
    existing.offerValue = offer.offerValue;
  }

  await existing.save();

  const populated = await populateProductQuery().findById(existing._id).lean().exec();
  const variants = await VariantModel.find({ productId: existing._id })
    .populate({ path: 'image', select: VARIANT_IMAGE_SELECT })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  return { ...populated, variants };
};

const deleteProductFromDB = async (id: string) => {
  assertValidObjectId(id);
  const existing = await Product.findById(id).select('_id').lean().exec();
  if (!existing) {
    throw new AppError('Product not found', httpStatus.NOT_FOUND);
  }
  await Product.findByIdAndDelete(id).exec();
  return { _id: id };
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const posSearchProductsFromDB = async (query: {
  q?: string;
  sku?: string;
  page?: number;
  limit?: number;
}) => {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 100, 100);
  const VARIANT_IMAGE_SELECT = '_id url name alt useCase size createdAt';

  const attachVariantsToProducts = async (
    products: Parameters<typeof attachVariantSummary>[0],
  ) => {
    if (products.length === 0) {
      return [];
    }
    const productIds = products.map((p) => p._id as Types.ObjectId);
    const variants = await VariantModel.find({
      productId: { $in: productIds },
      status: 'active',
    })
      .populate({ path: 'image', select: VARIANT_IMAGE_SELECT })
      .lean()
      .exec();

    const summarized = await attachVariantSummary(products);
    return summarized.map((product) => ({
      ...product,
      variants: variants.filter((v) => String(v.productId) === String(product._id)),
    }));
  };

  if (query.sku?.trim()) {
    const variant = await VariantModel.findOne({
      sku: query.sku.trim(),
      status: 'active',
    })
      .lean()
      .exec();
    if (!variant) {
      return { items: [], total: 0, page: 1, limit, totalPages: 0 };
    }

    const product = await populateProductQuery()
      .findOne({ _id: variant.productId, status: 'active' })
      .lean()
      .exec();
    if (!product) {
      return { items: [], total: 0, page: 1, limit, totalPages: 0 };
    }

    const [item] = await attachVariantsToProducts([product]);
    return {
      items: item
        ? [{ ...item, matchedVariantId: String(variant._id) }]
        : [],
      total: item ? 1 : 0,
      page: 1,
      limit,
      totalPages: item ? 1 : 0,
    };
  }

  const filter: Record<string, unknown> = { status: 'active' };
  const term = query.q?.trim();
  if (term) {
    filter.title = new RegExp(escapeRegex(term), 'i');
  }

  const total = await Product.countDocuments(filter).exec();
  const products = await populateProductQuery()
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
    .exec();

  const items = await attachVariantsToProducts(products);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return { items, total, page, limit, totalPages };
};

export const ProductService = {
  createProductIntoDB,
  listActiveProductsFromDB,
  getActiveProductSlugsFromDB,
  getActiveProductBySlugFromDB,
  getActiveProductByIdFromDB,
  listAllProductsAdminFromDB,
  updateProductInDB,
  deleteProductFromDB,
  posSearchProductsFromDB,
};
