import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const csvObjectIdString = z
  .string()
  .regex(/^[a-fA-F0-9]{24}(,[a-fA-F0-9]{24})*$/, 'Invalid id list');

const productStatus = z.enum(['draft', 'active', 'inactive']);
const productOfferType = z.enum(['none', 'percent', 'fixed']);

const offerFields = {
  isFeatured: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  offerType: productOfferType.optional(),
  offerValue: z.number().min(0).optional(),
};

export const createProductZodSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    slug: z.string().min(1).optional(),
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    category: objectIdString,
    brand: objectIdString.optional(),
    thumbnail: objectIdString.optional(),
    gallery: z.array(objectIdString).optional(),
    attributes: z.array(objectIdString).optional(),
    status: productStatus.optional(),
    averageRating: z.number().min(0).max(5).optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    ogImage: objectIdString.optional(),
    ...offerFields,
  }),
});

export const updateProductZodSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z.object({
    title: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    category: objectIdString.optional(),
    brand: objectIdString.nullable().optional(),
    thumbnail: objectIdString.nullable().optional(),
    gallery: z.array(objectIdString).optional(),
    attributes: z.array(objectIdString).optional(),
    status: productStatus.optional(),
    averageRating: z.number().min(0).max(5).optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    ogImage: objectIdString.nullable().optional(),
    ...offerFields,
  }),
});

export const productIdParamZodSchema = z.object({
  params: z.object({ id: objectIdString }),
});

export const productSlugParamZodSchema = z.object({
  params: z.object({ slug: z.string().min(1) }),
});

export const listProductsQueryZodSchema = z.object({
  query: z.object({
    category: csvObjectIdString.optional(),
    brand: csvObjectIdString.optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'rating_asc', 'rating_desc']).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const posSearchQueryZodSchema = z.object({
  query: z.object({
    q: z.string().min(1).optional(),
    sku: z.string().min(1).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});
