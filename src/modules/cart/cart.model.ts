import { Schema, model, Model } from 'mongoose';
import type { ICart } from './cart.interface';

export type CartModelType = Model<ICart>;

const cartItemSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantId: {
      type: Schema.Types.ObjectId,
      ref: 'Variant',
      default: undefined,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    isSelected: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { _id: true },
);

const cartSchema = new Schema<ICart, CartModelType>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const Cart = model<ICart, CartModelType>('Cart', cartSchema);
