import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { CreateOrderPayload, GuestOrderPayload } from './order.service';
import { OrderService } from './order.service';

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.createOrderIntoDB(
    req.user!.userId,
    req.body as CreateOrderPayload,
  );
  return sendResponse(res, httpStatus.CREATED, 'Order placed successfully', result);
});

const createGuestOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.createGuestOrderIntoDB(req.body as GuestOrderPayload);
  return sendResponse(res, httpStatus.CREATED, 'Order placed successfully', result);
});

const listMyOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.listMyOrdersFromDB(req.user!.userId);
  return sendResponse(res, httpStatus.OK, 'Orders retrieved successfully', result);
});

const getMyOrderById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await OrderService.getMyOrderByIdFromDB(req.user!.userId, id);
  return sendResponse(res, httpStatus.OK, 'Order retrieved successfully', result);
});

const cancelMyOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await OrderService.cancelMyOrderFromDB(req.user!.userId, id);
  return sendResponse(res, httpStatus.OK, 'Order cancelled successfully', result);
});

const returnMyOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { reason, description } = req.body as {
    reason: import('./order.interface').OrderReturnReason;
    description: string;
  };
  const result = await OrderService.returnMyOrderFromDB(req.user!.userId, id, {
    reason,
    description,
  });
  return sendResponse(res, httpStatus.OK, 'Return request submitted successfully', result);
});

export const OrderController = {
  createOrder,
  createGuestOrder,
  listMyOrders,
  getMyOrderById,
  cancelMyOrder,
  returnMyOrder,
};
