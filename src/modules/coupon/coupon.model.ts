import { Schema, model, Model } from 'mongoose';
import type { ICoupon } from './coupon.interface';

export type CouponModelType = Model<ICoupon>;

const couponSchema = new Schema<ICoupon, CouponModelType>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, trim: true },
    discountType: {
      type: String,
      enum: ['fixed', 'percent'],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'BDT', uppercase: true, trim: true },
    minOrderAmount: { type: Number, min: 0, default: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    expiresAt: { type: Date },
    usageLimit: { type: Number, min: 1 },
    usedCount: { type: Number, required: true, default: 0, min: 0 },
    isActive: { type: Boolean, required: true, default: true, index: true },
  },
  { timestamps: true },
);

export const Coupon = model<ICoupon, CouponModelType>('Coupon', couponSchema);
