import { Types } from 'mongoose';

export type CouponDiscountType = 'fixed' | 'percent';

export interface ICoupon {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  /** Fixed amount in `currency`, or percent (0–100) when `discountType` is `percent`. */
  discountValue: number;
  currency: string;
  minOrderAmount?: number;
  /** Cap for percent discounts; ignored for fixed. */
  maxDiscountAmount?: number;
  /** Product ids when store couponScope is specific_products */
  productIds?: import('mongoose').Types.ObjectId[];
  expiresAt?: Date;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
}

export type ICouponDoc = ICoupon & { _id: Types.ObjectId };
