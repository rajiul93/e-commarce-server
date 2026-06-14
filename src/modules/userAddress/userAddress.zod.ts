import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const addressFields = {
  name: z.string().min(1),
  phone: z.string().min(5).trim(),
  country: z.string().min(1).trim(),
  state: z.string().min(1).trim(),
  city: z.string().min(1).trim(),
  thana: z.string().min(1).trim(),
  localLocation: z.string().min(1).trim(),
  isDefault: z.boolean().optional(),
};

export const createUserAddressZodSchema = z.object({
  body: z.object(addressFields),
});

export const updateUserAddressZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
  body: z
    .object({
      name: addressFields.name.optional(),
      phone: addressFields.phone.optional(),
      country: addressFields.country.optional(),
      state: addressFields.state.optional(),
      city: addressFields.city.optional(),
      thana: addressFields.thana.optional(),
      localLocation: addressFields.localLocation.optional(),
      isDefault: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
});

export const userAddressIdParamsZodSchema = z.object({
  params: z.object({
    id: objectIdString,
  }),
});
