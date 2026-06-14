import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { auth, authorizeAdminOrManager, authorizeStaff } from '../../middlewares/auth.middleware';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { AdminPhoneOrderPayload, AdminPosOrderPayload } from './order.service';
import { OrderService } from './order.service';

export const OrderAdminMiddleware = [auth, authorizeAdminOrManager] as const;
export const OrderStaffMiddleware = [auth, authorizeStaff] as const;

const listOrders = catchAsync(async (req: Request, res: Response) => {
  const channel =
    typeof req.query.channel === 'string' &&
    ['online', 'phone', 'pos'].includes(req.query.channel as string)
      ? (req.query.channel as 'online' | 'phone' | 'pos')
      : undefined;
  const status =
    typeof req.query.status === 'string' &&
    ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'].includes(
      req.query.status as string,
    )
      ? (req.query.status as
          | 'pending'
          | 'confirmed'
          | 'processing'
          | 'shipped'
          | 'delivered'
          | 'cancelled'
          | 'returned')
      : undefined;
  const result = await OrderService.listOrdersAdminFromDB({ channel, status });
  return sendResponse(res, httpStatus.OK, 'Orders retrieved successfully', result);
});

const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await OrderService.getOrderAdminByIdFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Order retrieved successfully', result);
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { status, statusComment } = req.body as {
    status: Parameters<typeof OrderService.updateOrderStatusAdminFromDB>[1];
    statusComment?: string;
  };
  const result = await OrderService.updateOrderStatusAdminFromDB(id, status, {
    statusComment,
    adminUserId: req.user!.userId,
  });
  return sendResponse(res, httpStatus.OK, 'Order status updated successfully', result);
});

const approveReturnRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { refundAmount, adminNote } = req.body as {
    refundAmount?: number;
    adminNote?: string;
  };
  const result = await OrderService.approveReturnRequestAdminFromDB(id, req.user!.userId, {
    refundAmount,
    adminNote,
  });
  return sendResponse(res, httpStatus.OK, 'Return approved successfully', result);
});

const rejectReturnRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { adminNote } = req.body as { adminNote?: string };
  const result = await OrderService.rejectReturnRequestAdminFromDB(
    id,
    req.user!.userId,
    adminNote,
  );
  return sendResponse(res, httpStatus.OK, 'Return request rejected', result);
});

const markPaymentReceived = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { adminNote } = req.body as { adminNote?: string };
  const result = await OrderService.markOrderPaymentReceivedAdminFromDB(
    id,
    req.user!.userId,
    adminNote,
  );
  return sendResponse(res, httpStatus.OK, 'Payment marked as received', result);
});

const createPhoneOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.createAdminPhoneOrderIntoDB(
    req.user!.userId,
    req.body as AdminPhoneOrderPayload,
  );
  return sendResponse(res, httpStatus.CREATED, 'Phone order created successfully', result);
});

const createPosOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.createAdminPosOrderIntoDB(
    req.user!.userId,
    req.body as AdminPosOrderPayload,
    req.user!.role,
  );
  return sendResponse(res, httpStatus.CREATED, 'POS sale recorded successfully', result);
});

export const OrderAdminController = {
  listOrders,
  getOrderById,
  updateOrderStatus,
  approveReturnRequest,
  rejectReturnRequest,
  markPaymentReceived,
  createPhoneOrder,
  createPosOrder,
};
