import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { CreateCashOnDeliveryPayload } from './payment.service';
import { PaymentService } from './payment.service';

const createCashOnDelivery = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.createCashOnDeliveryIntoDB(
    req.user!.userId,
    req.body as CreateCashOnDeliveryPayload,
  );
  return sendResponse(res, httpStatus.CREATED, 'Cash on delivery payment record created', result);
});

const listMyPayments = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.listMyPaymentsFromDB(req.user!.userId);
  return sendResponse(res, httpStatus.OK, 'Payments retrieved successfully', result);
});

export const PaymentController = {
  createCashOnDelivery,
  listMyPayments,
};
