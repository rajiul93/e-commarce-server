import { Schema, model, Model, Types } from 'mongoose';

const variantAttributePairSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false },
);

/** Persisted variant document fields. */
export interface IVariantStored {
  productId: Types.ObjectId;
  sku: string;
  attributes: { name: string; value: string }[];
  price: number;
  buyPrice: number;
  stock: number;
  image?: Types.ObjectId;
  status: 'active' | 'inactive';
}

export type VariantModelType = Model<IVariantStored>;

const variantSchema = new Schema<IVariantStored, VariantModelType>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    sku: { type: String, required: true, unique: true, trim: true },
    attributes: {
      type: [variantAttributePairSchema],
      default: [],
    },
    price: { type: Number, required: true, min: 0 },
    buyPrice: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    image: { type: Schema.Types.ObjectId, ref: 'Image' },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      required: true,
      default: 'active',
    },
  },
  { timestamps: true },
);

variantSchema.index({ productId: 1 });

export const VariantModel = model<IVariantStored, VariantModelType>('Variant', variantSchema);
