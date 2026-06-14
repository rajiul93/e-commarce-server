import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentController } from './payment.controller';
import { createCashOnDeliveryZodSchema } from './payment.zod';

const router = express.Router();

router.get('/', auth, PaymentController.listMyPayments);

router.post(
  '/cash-on-delivery',
  auth,
  validateRequest(createCashOnDeliveryZodSchema),
  PaymentController.createCashOnDelivery,
);

export const PaymentRoutes = router;
