import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createCashOnDeliveryZodSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    currency: z.string().min(3).max(3).optional(),
    orderId: objectIdString.optional(),
    externalReference: z.string().max(200).optional(),
    notes: z.string().max(500).optional(),
  }),
});
