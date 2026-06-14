import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const paymentMethodEnum = z.enum([
  'cash_on_delivery',
  'bkash',
  'ssl_commerce',
  'stripe',
  'payoneer',
]);

export const createOrderZodSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: objectIdString,
          quantity: z.number().int().positive(),
          variantId: objectIdString.optional(),
        }),
      )
      .min(1),
    addressId: objectIdString,
    paymentMethod: paymentMethodEnum,
    couponCode: z.string().min(2).max(40).optional(),
    currency: z.string().min(3).max(3).optional(),
  }),
});

export const orderIdParamZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z.any().optional(),
  query: z.any().optional(),
});
