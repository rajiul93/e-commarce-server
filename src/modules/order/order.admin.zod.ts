import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const addressSnapshotShape = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  country: z.string().min(1),
  state: z.string().min(1),
  city: z.string().min(1),
  thana: z.string().min(1),
  localLocation: z.string().min(1),
});

const remotePaymentMethods = z.enum([
  'cash_on_delivery',
  'bkash',
  'ssl_commerce',
  'stripe',
  'payoneer',
]);

const adminPhoneBodySchema = z
  .object({
    items: z
      .array(
        z.object({
          productId: objectIdString,
          quantity: z.number().int().positive(),
          variantId: objectIdString.optional(),
          unitPriceOverride: z.number().min(0).optional(),
        }),
      )
      .min(1),
    deliveryMode: z.enum(['ship_to_address', 'shop_pickup']),
    addressSnapshot: addressSnapshotShape.optional(),
    paymentMethod: remotePaymentMethods,
    couponCode: z.string().min(2).max(40).optional(),
    currency: z.string().min(3).max(3).optional(),
    customerUserId: objectIdString.optional(),
    guestContact: z
      .object({
        name: z.string().min(1),
        phone: z.string().min(1),
      })
      .optional(),
    adminNotes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.customerUserId && !data.guestContact?.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide customerUserId and/or guest contact with phone',
        path: ['guestContact'],
      });
    }
    if (
      data.deliveryMode === 'ship_to_address' &&
      (!data.addressSnapshot ||
        typeof data.addressSnapshot !== 'object' ||
        Object.keys(data.addressSnapshot).length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'addressSnapshot is required for delivery orders',
        path: ['addressSnapshot'],
      });
    }
  });

export const adminPhoneOrderZodSchema = z.object({
  body: adminPhoneBodySchema,
  params: z.any().optional(),
  query: z.any().optional(),
});

export const adminPosOrderZodSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: objectIdString,
          quantity: z.number().int().positive(),
          variantId: objectIdString.optional(),
          unitPrice: z.number().min(0),
        }),
      )
      .min(1),
    paymentMethod: z.enum(['pos_cash', 'pos_card']),
    deliveryMode: z.enum(['ship_to_address', 'shop_pickup']).optional(),
    couponCode: z.string().min(2).max(40).optional(),
    currency: z.string().min(3).max(3).optional(),
    guestContact: z
      .object({
        name: z.string().min(1).optional(),
        phone: z.string().min(1),
      })
      .optional(),
    adminNotes: z.string().max(2000).optional(),
  }),
});

export const adminListOrdersZodSchema = z.object({
  query: z.object({
    channel: z.enum(['online', 'phone', 'pos']).optional(),
    status: z
      .enum([
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'return_requested',
        'cancelled',
        'returned',
      ])
      .optional(),
  }),
});

export const adminOrderIdParamZodSchema = z.object({
  params: z.object({ id: objectIdString }),
});

export const adminUpdateOrderStatusZodSchema = z.object({
  params: z.object({ id: objectIdString }),
  body: z.object({
    status: z.enum([
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'return_requested',
      'cancelled',
      'returned',
    ]),
    statusComment: z.string().trim().max(2000).optional(),
  }),
});
