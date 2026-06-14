import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const addressSnapshotShape = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  country: z.string().min(1).default('Bangladesh'),
  state: z.string().min(1),
  city: z.string().min(1),
  thana: z.string().min(1),
  localLocation: z.string().min(1),
});

export const createGuestOrderZodSchema = z.object({
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
    guestContact: z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
    }),
    addressSnapshot: addressSnapshotShape,
    paymentMethod: z.enum(['cash_on_delivery']).default('cash_on_delivery'),
    couponCode: z.string().min(2).max(40).optional(),
    currency: z.string().min(3).max(3).optional(),
  }),
});
