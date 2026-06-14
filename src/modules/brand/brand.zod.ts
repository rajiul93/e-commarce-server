import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createBrandZodSchema = z.object({
  body: z.object({
    brandName: z.string().min(1),
    image: objectIdString,
  }),
});

export const brandIdParamsZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
});

export const updateBrandZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      brandName: z.string().min(1).optional(),
      image: objectIdString.optional(),
    })
    .refine((data) => data.brandName !== undefined || data.image !== undefined, {
      message: 'At least one of brandName or image is required',
    }),
});
