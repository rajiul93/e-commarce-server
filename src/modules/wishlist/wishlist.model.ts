import { Schema, model, Model } from 'mongoose';
import type { IWishlistEntry } from './wishlist.interface';

export type WishlistModelType = Model<IWishlistEntry>;

const wishlistSchema = new Schema<IWishlistEntry, WishlistModelType>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const Wishlist = model<IWishlistEntry, WishlistModelType>('Wishlist', wishlistSchema);
