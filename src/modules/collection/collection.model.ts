import { Schema, model } from 'mongoose';
import type { ICollection } from './collection.interface';

const collectionSchema = new Schema<ICollection>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    banner: { type: Schema.Types.ObjectId, ref: 'Image' },
    products: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
      default: [],
    },
    showBannerOnHome: { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Collection = model<ICollection>('Collection', collectionSchema);
