import { Schema, model, Model } from 'mongoose';
import type { IUserAddress } from './userAddress.interface';

export type UserAddressModelType = Model<IUserAddress>;

const userAddressSchema = new Schema<IUserAddress, UserAddressModelType>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    thana: { type: String, required: true, trim: true },
    localLocation: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, required: true, default: false, index: true },
  },
  { timestamps: true },
);

userAddressSchema.index({ userId: 1, isDefault: 1 });

export const UserAddress = model<IUserAddress, UserAddressModelType>(
  'UserAddress',
  userAddressSchema,
);
