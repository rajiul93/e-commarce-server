import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const addCartItemZodSchema = z.object({
  body: z.object({
    productId: objectIdString,
    variantId: objectIdString.optional(),
    quantity: z.number().int().min(1).optional(),
    isSelected: z.boolean().optional(),
  }),
});

export const checkoutPreviewZodSchema = z.object({
  body: z.object({
    couponCode: z.string().min(2).max(40).optional(),
    currency: z.string().min(3).max(3).optional(),
  }),
});

export const cartLineIdParamsZodSchema = z.object({
  params: z.object({
    lineId: objectIdString,
  }),
});

export const patchCartLineZodSchema = z.object({
  params: z.object({
    lineId: objectIdString,
  }),
  body: z
    .object({
      quantity: z.number().int().min(1).optional(),
      isSelected: z.boolean().optional(),
    })
    .refine((b) => b.quantity !== undefined || b.isSelected !== undefined, {
      message: 'Provide quantity and/or isSelected',
    }),
});
