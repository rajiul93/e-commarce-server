import { Schema, model, Model } from 'mongoose';
import type { IOrder, IOrderAddressSnapshot, IOrderLineItemSnapshot } from './order.interface';

export type OrderModelType = Model<IOrder>;

const orderAddressSnapshotSchema = new Schema<IOrderAddressSnapshot>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    thana: { type: String, required: true, trim: true },
    localLocation: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const guestContactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const orderLineSchema = new Schema<IOrderLineItemSnapshot>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'Variant' },
    productTitle: { type: String, required: true, trim: true },
    productSlug: { type: String, trim: true },
    sku: { type: String, trim: true },
    catalogUnitPrice: { type: Number, required: true, min: 0 },
    priceOverridden: { type: Boolean, required: true, default: false },
    unitPrice: { type: Number, required: true, min: 0 },
    buyUnitPrice: { type: Number, min: 0, default: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineSubtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const returnRequestSchema = new Schema(
  {
    reason: {
      type: String,
      enum: ['wrong_item', 'damaged', 'defective', 'not_as_described', 'changed_mind', 'other'],
      required: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    requestedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const statusHistorySchema = new Schema(
  {
    from: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'return_requested',
        'cancelled',
        'returned',
      ],
      required: true,
    },
    to: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'return_requested',
        'cancelled',
        'returned',
      ],
      required: true,
    },
    comment: { type: String, trim: true, maxlength: 2000 },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder, OrderModelType>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['online', 'phone', 'pos'],
      required: true,
      default: 'online',
      index: true,
    },
    deliveryMode: {
      type: String,
      enum: ['ship_to_address', 'shop_pickup'],
      required: true,
      default: 'ship_to_address',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    placedByAdminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
      index: true,
    },
    guestContact: { type: guestContactSchema, required: false },
    adminNotes: { type: String, trim: true, maxlength: 2000 },
    items: {
      type: [orderLineSchema],
      required: true,
      validate: {
        validator(arr: IOrderLineItemSnapshot[]) {
          return Array.isArray(arr) && arr.length > 0;
        },
        message: 'Order requires at least one line',
      },
    },
    addressSnapshot: { type: orderAddressSnapshotSchema, required: true },
    savedAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'UserAddress',
    },
    couponId: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    couponCode: { type: String, trim: true, uppercase: true },
    couponDiscountAmount: { type: Number, required: true, default: 0, min: 0 },
    itemsSubtotal: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'BDT', uppercase: true, trim: true },
    paymentMethod: {
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
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
      required: true,
      default: 'pending',
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      sparse: true,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'return_requested',
        'cancelled',
        'returned',
      ],
      required: true,
      default: 'pending',
      index: true,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    returnRequest: { type: returnRequestSchema, required: false },
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ channel: 1, createdAt: -1 });

export const Order = model<IOrder, OrderModelType>('Order', orderSchema);
