import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createCollectionZodSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    banner: objectIdString.optional().nullable(),
    products: z.array(objectIdString).default([]),
    showBannerOnHome: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const collectionIdParamZodSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateCollectionZodSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z
    .object({
      name: z.string().min(1).optional(),
      banner: objectIdString.optional().nullable(),
      products: z.array(objectIdString).optional(),
      showBannerOnHome: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
  query: z.any().optional(),
});

export const listCollectionsQueryZodSchema = z.object({
  query: z
    .object({
      forHome: z.enum(['true', 'false']).optional(),
    })
    .optional(),
  params: z.any().optional(),
  body: z.any().optional(),
});
