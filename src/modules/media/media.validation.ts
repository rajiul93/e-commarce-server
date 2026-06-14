import { z } from 'zod';

/**
 * Validated after multer: multipart text fields arrive as strings.
 */
export const uploadImageSchema = z.object({
  body: z.object({
    alt: z.string().optional(),
    useCase: z.enum([
      'CATEGORY',
      'LOGO',
      'PRODUCT',
      'USER',
      'BANNER',
      'MESSAGE',
      'EXPENSE',
    ]),
  }),
});
