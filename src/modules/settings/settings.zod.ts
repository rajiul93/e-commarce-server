import { z } from 'zod';

export const updateOrderSettingsZodSchema = z.object({
  body: z
    .object({
      loggedInCheckout: z.boolean().optional(),
      guestQuickOrder: z.boolean().optional(),
      couponScope: z.enum(['all_products', 'specific_products']).optional(),
    })
    .refine((data) => data.loggedInCheckout !== undefined || data.guestQuickOrder !== undefined || data.couponScope !== undefined, {
      message: 'Provide at least one setting to update',
    }),
});

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const updateStaffSettingsZodSchema = z.object({
  body: z.object({
    workingDaysPerMonth: z.number().int().min(1).max(31),
  }),
});

export const updateHeroSettingsZodSchema = z.object({
  body: z.object({
    style: z.enum(['split_one', 'split_two', 'slider_only']).optional(),
    isActive: z.boolean().optional(),
    slides: z
      .array(
        z.object({
          image: objectIdString,
          productId: objectIdString.optional().nullable(),
        }),
      )
      .optional(),
    sideItems: z
      .array(
        z.object({
          image: objectIdString,
          productId: objectIdString,
        }),
      )
      .optional(),
  }),
});

export const updateBrandingSettingsZodSchema = z.object({
  body: z
    .object({
      siteName: z.string().trim().min(1).max(80).optional(),
      logoImageId: objectIdString.nullable().optional(),
    })
    .refine((data) => data.siteName !== undefined || data.logoImageId !== undefined, {
      message: 'Provide at least one setting to update',
    }),
});
