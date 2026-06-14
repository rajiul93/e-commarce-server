import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const variantAttributePairSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
});

const variantStatus = z.enum(['active', 'inactive']);

export const listVariantsQueryZodSchema = z.object({
  query: z.object({
    productId: objectIdString.optional(),
  }),
});

export const createVariantZodSchema = z.object({
  body: z.object({
    productId: objectIdString,
    sku: z.string().min(1),
    attributes: z.array(variantAttributePairSchema).min(1),
    price: z.number().nonnegative(),
    buyPrice: z.number().nonnegative().optional(),
    stock: z.number().int().nonnegative(),
    image: objectIdString.optional(),
    status: variantStatus.optional(),
  }),
});

export const variantIdParamsZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
});

export const updateVariantZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      productId: objectIdString.optional(),
      sku: z.string().min(1).optional(),
      attributes: z.array(variantAttributePairSchema).min(1).optional(),
      price: z.number().nonnegative().optional(),
      buyPrice: z.number().nonnegative().optional(),
      stock: z.number().int().nonnegative().optional(),
      image: objectIdString.optional().nullable(),
      status: variantStatus.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
});
