import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const addWishlistZodSchema = z.object({
  body: z.object({
    productId: objectIdString,
  }),
});

export const wishlistItemIdParamsZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
});
