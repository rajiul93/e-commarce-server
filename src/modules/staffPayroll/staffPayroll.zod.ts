import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const upsertPayrollZodSchema = z.object({
  body: z
    .object({
      userId: objectIdString,
      year: z.number().int().min(2000).max(2100),
      month: z.number().int().min(1).max(12),
      presentDays: z.number().min(0),
      workingDaysInMonth: z.number().int().min(1).max(31).optional(),
      monthlySalary: z.number().min(0).optional(),
      bonusType: z.enum(['fixed', 'percent']).optional(),
      bonusValue: z.number().min(0).optional(),
      workRating: z.number().min(1).max(5).optional(),
      notes: z.string().max(2000).optional(),
    })
    .refine(
      (data) => {
        if (data.bonusType && (data.bonusValue == null || data.bonusValue <= 0)) return false;
        if (!data.bonusType && data.bonusValue != null && data.bonusValue > 0) return false;
        return true;
      },
      { message: 'Bonus type and value must be provided together' },
    ),
});

export const listPayrollZodSchema = z.object({
  query: z.object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
  }),
});

export const staffPayrollUserParamZodSchema = z.object({
  params: z.object({
    userId: objectIdString,
  }),
});
