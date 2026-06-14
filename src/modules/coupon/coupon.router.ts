import express from 'express';
import { auth, authorizeAdminOrManager } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { CouponController } from './coupon.controller';
import {
  couponIdParamZodSchema,
  createCouponZodSchema,
  updateCouponZodSchema,
} from './coupon.zod';

const router = express.Router();

router.post(
  '/create',
  auth,
  authorizeAdminOrManager,
  validateRequest(createCouponZodSchema),
  CouponController.createCoupon,
);

router.get('/', auth, authorizeAdminOrManager, CouponController.listCoupons);

router.get(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(couponIdParamZodSchema),
  CouponController.getCouponById,
);

router.patch(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(updateCouponZodSchema),
  CouponController.updateCoupon,
);

router.delete(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(couponIdParamZodSchema),
  CouponController.deleteCoupon,
);

export const CouponRoutes = router;
