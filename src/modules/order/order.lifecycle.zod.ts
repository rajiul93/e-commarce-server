import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const orderIdParamZodSchema = z.object({
  params: z.object({ id: objectIdString }),
});

export const cancelOrderZodSchema = orderIdParamZodSchema;

export const returnOrderZodSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z.object({
    reason: z.enum([
      'wrong_item',
      'damaged',
      'defective',
      'not_as_described',
      'changed_mind',
      'other',
    ]),
    description: z.string().trim().min(10).max(1000),
  }),
});

export const approveReturnZodSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z.object({
    refundAmount: z.number().min(0).optional(),
    adminNote: z.string().trim().max(2000).optional(),
  }),
});

export const rejectReturnZodSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z.object({
    adminNote: z.string().trim().max(2000).optional(),
  }),
});

export const markPaymentReceivedZodSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z.object({
    adminNote: z.string().trim().max(2000).optional(),
  }),
});
