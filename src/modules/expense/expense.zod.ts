import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createExpenseTypeZodSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
  }),
});

export const expenseTypeIdParamZodSchema = z.object({
  params: z.object({ id: objectIdString }),
});

export const updateExpenseTypeZodSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const createExpenseZodSchema = z.object({
  body: z.object({
    typeId: objectIdString,
    description: z.string().trim().min(1).max(2000),
    amount: z.number().min(0),
    imageId: objectIdString.optional(),
    expenseDate: z.string().optional(),
  }),
});

export const listExpenseZodSchema = z.object({
  query: z.object({
    period: z.enum(['week', 'month', 'year']).optional(),
  }),
});

export const expenseIdParamZodSchema = z.object({
  params: z.object({ id: objectIdString }),
});
