import { Schema, model, Model } from 'mongoose';
import { IBrand } from './brand.interface';

export type BrandModelType = Model<IBrand>;

const brandSchema = new Schema<IBrand, BrandModelType>(
  {
    brandName: { type: String, required: true, trim: true, unique: true },
    image: { type: Schema.Types.ObjectId, ref: 'Image', required: true },
  },
  { timestamps: true },
);

export const Brand = model<IBrand, BrandModelType>('Brand', brandSchema);
