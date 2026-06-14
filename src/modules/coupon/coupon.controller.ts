import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { CreateCouponPayload, UpdateCouponPayload } from './coupon.service';
import { CouponService } from './coupon.service';

const createCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.createCouponIntoDB(req.body as CreateCouponPayload);
  return sendResponse(res, httpStatus.CREATED, 'Coupon created', result);
});

const listCoupons = catchAsync(async (_req: Request, res: Response) => {
  const result = await CouponService.listCouponsFromDB();
  return sendResponse(res, httpStatus.OK, 'Coupons retrieved successfully', result);
});

const getCouponById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await CouponService.getCouponByIdFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Coupon retrieved successfully', result);
});

const updateCoupon = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await CouponService.updateCouponInDB(id, req.body as UpdateCouponPayload);
  return sendResponse(res, httpStatus.OK, 'Coupon updated successfully', result);
});

const deleteCoupon = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await CouponService.deleteCouponFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Coupon deleted successfully', null);
});

export const CouponController = {
  createCoupon,
  listCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
};
