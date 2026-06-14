import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { OrderAdminRoutes } from './order.admin.router';
import { OrderController } from './order.controller';
import { createGuestOrderZodSchema } from './order.guest.zod';
import { cancelOrderZodSchema, returnOrderZodSchema } from './order.lifecycle.zod';
import { createOrderZodSchema, orderIdParamZodSchema } from './order.zod';

const router = express.Router();

router.use('/admin', OrderAdminRoutes);

router.post(
  '/guest',
  validateRequest(createGuestOrderZodSchema),
  OrderController.createGuestOrder,
);

router.post('/', auth, validateRequest(createOrderZodSchema), OrderController.createOrder);

router.get('/', auth, OrderController.listMyOrders);

router.get('/:id', auth, validateRequest(orderIdParamZodSchema), OrderController.getMyOrderById);

router.patch(
  '/:id/cancel',
  auth,
  validateRequest(cancelOrderZodSchema),
  OrderController.cancelMyOrder,
);

router.patch(
  '/:id/return',
  auth,
  validateRequest(returnOrderZodSchema),
  OrderController.returnMyOrder,
);

export const OrderRoutes = router;
