import { Schema, model, Model } from 'mongoose';
import type { IProduct } from './product.interface';

export type ProductModelType = Model<IProduct>;

const productSchema = new Schema<IProduct, ProductModelType>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
      index: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    thumbnail: {
      type: Schema.Types.ObjectId,
      ref: 'Image',
    },
    gallery: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Image',
        },
      ],
      default: [],
    },
    attributes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Attribute',
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'active', 'inactive'],
      required: true,
      default: 'draft',
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true,
    },
    seoTitle: { type: String, trim: true },
    seoDescription: { type: String, trim: true },
    ogTitle: { type: String, trim: true },
    ogDescription: { type: String, trim: true },
    ogImage: { type: Schema.Types.ObjectId, ref: 'Image' },
    isFeatured: { type: Boolean, default: false, index: true },
    isBestSeller: { type: Boolean, default: false, index: true },
    offerType: {
      type: String,
      enum: ['none', 'percent', 'fixed'],
      default: 'none',
    },
    offerValue: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
  },
);

productSchema.index({ category: 1, brand: 1 });
productSchema.index({ status: 1 });
productSchema.index({ attributes: 1 });

export const Product = model<IProduct, ProductModelType>('Product', productSchema);
