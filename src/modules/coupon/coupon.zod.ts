import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createCouponZodSchema = z.object({
  body: z.object({
    code: z.string().min(2).max(40),
    description: z.string().max(500).optional(),
    discountType: z.enum(['fixed', 'percent']),
    discountValue: z.number().positive(),
    currency: z.string().min(3).max(3).optional(),
    minOrderAmount: z.number().min(0).optional(),
    maxDiscountAmount: z.number().min(0).optional(),
    expiresAt: z.coerce.date().optional(),
    usageLimit: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
    productIds: z.array(objectIdString).optional(),
  }),
});

export const couponIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});

export const updateCouponZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      description: z.string().max(500).optional().nullable(),
      discountType: z.enum(['fixed', 'percent']).optional(),
      discountValue: z.number().positive().optional(),
      currency: z.string().min(3).max(3).optional(),
      minOrderAmount: z.number().min(0).optional().nullable(),
      maxDiscountAmount: z.number().min(0).optional().nullable(),
      expiresAt: z.coerce.date().optional().nullable(),
      usageLimit: z.number().int().min(1).optional().nullable(),
      isActive: z.boolean().optional(),
      productIds: z.array(objectIdString).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    }),
  query: z.any().optional(),
});
