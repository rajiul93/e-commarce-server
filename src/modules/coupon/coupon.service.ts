import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { SettingsService } from '../settings/settings.service';
import type { ICoupon } from './coupon.interface';
import { Coupon } from './coupon.model';

const assertValidObjectId = (id: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }
};

export type CreateCouponPayload = Omit<ICoupon, 'usedCount'>;
export type UpdateCouponPayload = Partial<Omit<ICoupon, 'code'>>;

export type CouponLineContext = {
  productId: string;
  lineSubtotal: number;
};

const computeEligibleSubtotal = (
  lines: CouponLineContext[],
  productIds: Types.ObjectId[],
): number => {
  const allowed = new Set(productIds.map((id) => String(id)));
  return lines.reduce((sum, line) => {
    if (!allowed.has(line.productId)) return sum;
    return sum + line.lineSubtotal;
  }, 0);
};

const createCouponIntoDB = async (payload: CreateCouponPayload) => {
  if (payload.discountType === 'percent' && payload.discountValue > 100) {
    throw new AppError('Percent discount cannot exceed 100', httpStatus.BAD_REQUEST);
  }

  const settings = await SettingsService.getOrderSettingsFromDB();
  const productIds =
    settings.couponScope === 'specific_products'
      ? (payload.productIds ?? [])
      : (payload.productIds ?? []);

  if (settings.couponScope === 'specific_products' && productIds.length === 0) {
    throw new AppError('Select at least one product for this coupon', httpStatus.BAD_REQUEST);
  }

  productIds.forEach((id) => assertValidObjectId(String(id)));

  const doc = await Coupon.create({
    ...payload,
    code: payload.code.trim().toUpperCase(),
    currency: (payload.currency ?? 'BDT').toUpperCase().trim(),
    productIds: productIds.map((id) => new Types.ObjectId(String(id))),
    usedCount: 0,
  });

  return Coupon.findById(doc._id).lean().exec();
};

const listCouponsFromDB = async () => {
  return Coupon.find().sort({ createdAt: -1 }).populate({ path: 'productIds', select: 'title slug' }).lean().exec();
};

const getCouponByIdFromDB = async (couponId: string) => {
  assertValidObjectId(couponId);
  const doc = await Coupon.findById(couponId).lean().exec();
  if (!doc) {
    throw new AppError('Coupon not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const updateCouponInDB = async (couponId: string, body: UpdateCouponPayload) => {
  assertValidObjectId(couponId);

  const doc = await Coupon.findById(couponId).exec();
  if (!doc) {
    throw new AppError('Coupon not found', httpStatus.NOT_FOUND);
  }

  if (body.description !== undefined) doc.description = body.description.trim() || undefined;
  if (body.discountType !== undefined) doc.discountType = body.discountType;
  if (body.discountValue !== undefined) {
    doc.discountValue = body.discountValue;
  }
  if (body.currency !== undefined) doc.currency = body.currency.toUpperCase().trim();
  if (body.minOrderAmount !== undefined) doc.minOrderAmount = body.minOrderAmount;
  if (body.maxDiscountAmount !== undefined) doc.maxDiscountAmount = body.maxDiscountAmount;
  if (body.expiresAt !== undefined) doc.expiresAt = body.expiresAt;
  if (body.usageLimit !== undefined) doc.usageLimit = body.usageLimit;
  if (body.isActive !== undefined) doc.isActive = body.isActive;
  if (body.productIds !== undefined) {
    body.productIds.forEach((id) => assertValidObjectId(String(id)));
    doc.productIds = body.productIds.map((id) => new Types.ObjectId(String(id)));
  }

  if (doc.discountType === 'percent' && doc.discountValue > 100) {
    throw new AppError('Percent discount cannot exceed 100', httpStatus.BAD_REQUEST);
  }

  const settings = await SettingsService.getOrderSettingsFromDB();
  if (settings.couponScope === 'specific_products' && (!doc.productIds || doc.productIds.length === 0)) {
    throw new AppError('Select at least one product for this coupon', httpStatus.BAD_REQUEST);
  }

  await doc.save();
  return Coupon.findById(doc._id).populate({ path: 'productIds', select: 'title slug' }).lean().exec();
};

const deleteCouponFromDB = async (couponId: string) => {
  assertValidObjectId(couponId);
  const doc = await Coupon.findByIdAndDelete(couponId).exec();
  if (!doc) {
    throw new AppError('Coupon not found', httpStatus.NOT_FOUND);
  }
};

export type AppliedCouponResolved = Pick<
  ICoupon,
  'code' | 'discountType' | 'discountValue' | 'currency' | 'minOrderAmount' | 'maxDiscountAmount'
> & { _id: Types.ObjectId; discountBase: number };

/**
 * Validates active coupon against subtotal / currency / expiry / usage limits.
 * Caller increments {@link Coupon.usedCount} after order succeeds via {@link consumeCouponUsageAtomic}.
 */
const resolveApplicableCouponFromDB = async (
  couponCode: string | undefined,
  currency: string,
  itemsSubtotal: number,
  lines: CouponLineContext[] = [],
): Promise<AppliedCouponResolved | null> => {
  if (!couponCode?.trim()) {
    return null;
  }

  const codeNorm = couponCode.trim().toUpperCase();
  const doc = await Coupon.findOne({ code: codeNorm }).exec();
  if (!doc || !doc.isActive) {
    throw new AppError('Invalid or inactive coupon code', httpStatus.BAD_REQUEST);
  }

  const now = new Date();
  if (doc.expiresAt && doc.expiresAt <= now) {
    throw new AppError('Coupon has expired', httpStatus.BAD_REQUEST);
  }

  const cur = currency.toUpperCase().trim();
  if (doc.currency !== cur) {
    throw new AppError('Coupon is not valid for this currency', httpStatus.BAD_REQUEST);
  }

  const settings = await SettingsService.getOrderSettingsFromDB();
  let discountBase = itemsSubtotal;

  if (settings.couponScope === 'specific_products') {
    const ids = doc.productIds ?? [];
    if (ids.length === 0) {
      throw new AppError('Coupon is not configured for any product', httpStatus.BAD_REQUEST);
    }
    discountBase = computeEligibleSubtotal(lines, ids);
    if (discountBase <= 0) {
      throw new AppError('Coupon does not apply to items in this order', httpStatus.BAD_REQUEST);
    }
  }

  const minAmt = doc.minOrderAmount ?? 0;
  if (discountBase < minAmt) {
    throw new AppError(
      `Minimum order amount for this coupon is ${minAmt}`,
      httpStatus.BAD_REQUEST,
    );
  }

  if (doc.usageLimit != null && doc.usedCount >= doc.usageLimit) {
    throw new AppError('Coupon usage limit reached', httpStatus.BAD_REQUEST);
  }

  return {
    _id: doc._id as Types.ObjectId,
    code: doc.code,
    discountType: doc.discountType,
    discountValue: doc.discountValue,
    currency: doc.currency,
    minOrderAmount: doc.minOrderAmount,
    maxDiscountAmount: doc.maxDiscountAmount,
    discountBase,
  };
};

const computeDiscountAmount = (
  resolved: AppliedCouponResolved,
  discountBase: number,
): number => {
  if (resolved.discountType === 'fixed') {
    return Math.min(resolved.discountValue, discountBase);
  }

  let raw = (discountBase * resolved.discountValue) / 100;
  if (resolved.maxDiscountAmount != null && resolved.maxDiscountAmount > 0) {
    raw = Math.min(raw, resolved.maxDiscountAmount);
  }
  return Math.min(Math.max(0, raw), discountBase);
};

/**
 * Increments usage only while under `usageLimit` (when set).
 */
const consumeCouponUsageAtomic = async (couponMongoId: string): Promise<void> => {
  assertValidObjectId(couponMongoId);
  const res = await Coupon.updateOne(
    {
      _id: new Types.ObjectId(couponMongoId),
      isActive: true,
      $or: [
        { usageLimit: { $exists: false } },
        {
          usageLimit: { $exists: true, $gte: 1 },
          $expr: { $lt: ['$usedCount', '$usageLimit'] },
        },
      ],
    },
    { $inc: { usedCount: 1 } },
  ).exec();
  if (res.modifiedCount !== 1) {
    throw new AppError(
      'Coupon could not be applied (limit reached or deactivated)',
      httpStatus.BAD_REQUEST,
    );
  }
};

export const CouponService = {
  createCouponIntoDB,
  listCouponsFromDB,
  getCouponByIdFromDB,
  updateCouponInDB,
  deleteCouponFromDB,
  resolveApplicableCouponFromDB,
  computeDiscountAmount,
  consumeCouponUsageAtomic,
};
