import { Types } from 'mongoose';
import type { PaymentGateway, PaymentStatus } from '../payment/payment.interface';

/** How the sale was originated */
export type OrderChannel = 'online' | 'phone' | 'pos';

/** fulfilment expectation */
export type OrderDeliveryMode = 'ship_to_address' | 'shop_pickup';

export type OrderFulfillmentStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'return_requested'
  | 'cancelled'
  | 'returned';

export type OrderReturnReason =
  | 'wrong_item'
  | 'damaged'
  | 'defective'
  | 'not_as_described'
  | 'changed_mind'
  | 'other';

export interface IOrderLineItemSnapshot {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  productTitle: string;
  productSlug?: string;
  sku?: string;
  /** Snapshot of catalogue/list price before any admin override */
  catalogUnitPrice: number;
  /** Whether `unitPrice` differs from `catalogUnitPrice` */
  priceOverridden: boolean;
  /** Amount charged per unit at checkout / POS */
  unitPrice: number;
  /** Cost/buy price per unit at order time */
  buyUnitPrice?: number;
  quantity: number;
  /** unitPrice × quantity */
  lineSubtotal: number;
}

export interface IOrderAddressSnapshot {
  name: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  thana: string;
  localLocation: string;
}

export interface IGuestContactSnapshot {
  name: string;
  phone: string;
}

export interface IOrderReturnRequest {
  reason: OrderReturnReason;
  description: string;
  requestedAt: Date;
}

export interface IOrder {
  /** Human-readable sequential-style id part */
  orderNumber: string;
  channel: OrderChannel;
  deliveryMode: OrderDeliveryMode;
  /** Buyer account — optional for POS walk-in / phone-only guest */
  userId?: Types.ObjectId;
  placedByAdminId?: Types.ObjectId;
  guestContact?: IGuestContactSnapshot;
  adminNotes?: string;
  items: IOrderLineItemSnapshot[];
  addressSnapshot: IOrderAddressSnapshot;
  savedAddressId?: Types.ObjectId;
  couponId?: Types.ObjectId;
  couponCode?: string;
  couponDiscountAmount: number;
  itemsSubtotal: number;
  totalAmount: number;
  currency: string;
  paymentMethod: PaymentGateway;
  paymentStatus: PaymentStatus;
  paymentId?: Types.ObjectId;
  status: OrderFulfillmentStatus;
  statusHistory?: IOrderStatusHistoryEntry[];
  returnRequest?: IOrderReturnRequest;
}

export interface IOrderStatusHistoryEntry {
  from: OrderFulfillmentStatus;
  to: OrderFulfillmentStatus;
  comment?: string;
  changedBy?: Types.ObjectId;
  changedAt: Date;
}
