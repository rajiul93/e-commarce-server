import { Types } from 'mongoose';

/** Supported gateways — wire integrations per gateway later. POS uses offline settle paths. */
export type PaymentGateway =
  | 'cash_on_delivery'
  | 'bkash'
  | 'ssl_commerce'
  | 'stripe'
  | 'payoneer'
  | 'pos_cash'
  | 'pos_card';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface IPayment {
  /** Unique idempotency key for gateway reconciliation and DB uniqueness */
  transactionId: string;
  userId?: Types.ObjectId;
  /** Set when Order module lands; optional for now */
  orderId?: Types.ObjectId;
  gateway: PaymentGateway;
  status: PaymentStatus;
  amount: number;
  currency: string;
  /** Correlation until `orderId` exists (cart id, checkout id, etc.) */
  externalReference?: string;
  notes?: string;
  /** bkash/ssl/stripe payloads — expand per integration */
  gatewayMeta?: Record<string, unknown>;
}
