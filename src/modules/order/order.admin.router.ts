import express from 'express';
import validateRequest from '../../middlewares/validateRequest';
import {
  OrderAdminController,
  OrderAdminMiddleware,
  OrderStaffMiddleware,
} from './order.admin.controller';
import {
  adminListOrdersZodSchema,
  adminOrderIdParamZodSchema,
  adminPhoneOrderZodSchema,
  adminPosOrderZodSchema,
  adminUpdateOrderStatusZodSchema,
} from './order.admin.zod';
import {
  approveReturnZodSchema,
  markPaymentReceivedZodSchema,
  rejectReturnZodSchema,
} from './order.lifecycle.zod';

const router = express.Router();

router.get(
  '/',
  ...OrderStaffMiddleware,
  validateRequest(adminListOrdersZodSchema),
  OrderAdminController.listOrders,
);

router.get(
  '/:id',
  ...OrderStaffMiddleware,
  validateRequest(adminOrderIdParamZodSchema),
  OrderAdminController.getOrderById,
);

router.patch(
  '/:id/status',
  ...OrderAdminMiddleware,
  validateRequest(adminUpdateOrderStatusZodSchema),
  OrderAdminController.updateOrderStatus,
);

router.post(
  '/:id/return/approve',
  ...OrderAdminMiddleware,
  validateRequest(approveReturnZodSchema),
  OrderAdminController.approveReturnRequest,
);

router.post(
  '/:id/return/reject',
  ...OrderAdminMiddleware,
  validateRequest(rejectReturnZodSchema),
  OrderAdminController.rejectReturnRequest,
);

router.patch(
  '/:id/payment-received',
  ...OrderAdminMiddleware,
  validateRequest(markPaymentReceivedZodSchema),
  OrderAdminController.markPaymentReceived,
);

router.post(
  '/phone',
  ...OrderAdminMiddleware,
  validateRequest(adminPhoneOrderZodSchema),
  OrderAdminController.createPhoneOrder,
);

router.post(
  '/pos',
  ...OrderStaffMiddleware,
  validateRequest(adminPosOrderZodSchema),
  OrderAdminController.createPosOrder,
);

export const OrderAdminRoutes = router;
