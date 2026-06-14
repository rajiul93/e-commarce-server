import { Schema, model, Model } from 'mongoose';
import type { IPayment } from './payment.interface';

export type PaymentModelType = Model<IPayment>;

const paymentSchema = new Schema<IPayment, PaymentModelType>(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
      sparse: true,
    },
    gateway: {
      type: String,
      enum: [
        'cash_on_delivery',
        'bkash',
        'ssl_commerce',
        'stripe',
        'payoneer',
        'pos_cash',
        'pos_card',
      ],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
      required: true,
      default: 'pending',
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'BDT', uppercase: true, trim: true },
    externalReference: { type: String, trim: true },
    notes: { type: String, trim: true },
    gatewayMeta: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true },
);

paymentSchema.index({ userId: 1, createdAt: -1 });

export const Payment = model<IPayment, PaymentModelType>('Payment', paymentSchema);
