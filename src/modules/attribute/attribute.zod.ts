import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const attributeStatus = z.enum(['active', 'inactive']);

export const createAttributeZodSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    values: z.array(z.string().min(1)).min(1),
    status: attributeStatus.optional(),
  }),
});

export const attributeIdParamsZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
});

export const updateAttributeZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      name: z.string().min(1).optional(),
      values: z.array(z.string().min(1)).min(1).optional(),
      status: attributeStatus.optional(),
    })
    .refine(
      (data) => data.name !== undefined || data.values !== undefined || data.status !== undefined,
      { message: 'At least one field is required' },
    ),
});
