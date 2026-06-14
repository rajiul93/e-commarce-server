import { z } from 'zod';

export const createUserZodSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

export const loginZodSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

export const adminUserIdParamZodSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id'),
  }),
});

export const adminUpdateUserZodSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id'),
  }),
  body: z
    .object({
      password: z.string().min(6).optional(),
      profileImageId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id').nullable().optional(),
      nid: z.string().trim().max(32).nullable().optional(),
      name: z.string().trim().min(1).optional(),
      phone: z.string().trim().max(32).nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Provide at least one field to update',
    }),
});

export const createStaffZodSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['MANAGER', 'SELLER']),
    phone: z.string().optional(),
    monthlySalary: z.number().min(0).optional(),
  }),
});
