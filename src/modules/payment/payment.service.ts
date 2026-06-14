import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Payment } from './payment.model';
import { generatePaymentTransactionId } from './payment.utils';

const assertValidObjectId = (id: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }
};

export type CreateCashOnDeliveryPayload = {
  amount: number;
  currency?: string;
  orderId?: string;
  externalReference?: string;
  notes?: string;
};

const createCashOnDeliveryIntoDB = async (
  userId: string,
  payload: CreateCashOnDeliveryPayload,
) => {
  assertValidObjectId(userId);

  if (payload.orderId) {
    assertValidObjectId(payload.orderId);
    // When Order module exists, validate Order belongs to user here.
  }

  const doc = await Payment.create({
    transactionId: generatePaymentTransactionId(),
    userId: new Types.ObjectId(userId),
    ...(payload.orderId ? { orderId: new Types.ObjectId(payload.orderId) } : {}),
    gateway: 'cash_on_delivery',
    status: 'pending',
    amount: payload.amount,
    currency: (payload.currency ?? 'BDT').toUpperCase().trim(),
    ...(payload.externalReference?.trim()
      ? { externalReference: payload.externalReference.trim() }
      : {}),
    ...(payload.notes?.trim() ? { notes: payload.notes.trim() } : {}),
  });

  return Payment.findById(doc._id).lean().exec();
};

const listMyPaymentsFromDB = async (userId: string) => {
  assertValidObjectId(userId);
  return Payment.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
};

export const PaymentService = {
  createCashOnDeliveryIntoDB,
  listMyPaymentsFromDB,
};
