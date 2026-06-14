import { Schema, model } from 'mongoose';
import type { IStoreSettings } from './settings.interface';

const DEFAULT_ORDER_SETTINGS = {
  loggedInCheckout: true,
  guestQuickOrder: true,
  couponScope: 'all_products' as const,
};

const DEFAULT_HERO_SETTINGS = {
  style: 'slider_only' as const,
  isActive: true,
  slides: [],
  sideItems: [],
};

const heroSlideSchema = new Schema(
  {
    image: { type: Schema.Types.ObjectId, ref: 'Image', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  },
  { _id: false },
);

const heroSideItemSchema = new Schema(
  {
    image: { type: Schema.Types.ObjectId, ref: 'Image', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  },
  { _id: false },
);

const DEFAULT_STAFF_SETTINGS = {
  workingDaysPerMonth: 26,
};

const DEFAULT_BRANDING_SETTINGS = {
  siteName: 'Shop',
};

const storeSettingsSchema = new Schema<IStoreSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ['main'],
      default: 'main',
    },
    order: {
      loggedInCheckout: { type: Boolean, default: DEFAULT_ORDER_SETTINGS.loggedInCheckout },
      guestQuickOrder: { type: Boolean, default: DEFAULT_ORDER_SETTINGS.guestQuickOrder },
      couponScope: {
        type: String,
        enum: ['all_products', 'specific_products'],
        default: DEFAULT_ORDER_SETTINGS.couponScope,
      },
    },
    hero: {
      style: {
        type: String,
        enum: ['split_one', 'split_two', 'slider_only'],
        default: DEFAULT_HERO_SETTINGS.style,
      },
      isActive: { type: Boolean, default: DEFAULT_HERO_SETTINGS.isActive },
      slides: { type: [heroSlideSchema], default: [] },
      sideItems: { type: [heroSideItemSchema], default: [] },
    },
    staff: {
      workingDaysPerMonth: { type: Number, default: DEFAULT_STAFF_SETTINGS.workingDaysPerMonth, min: 1, max: 31 },
    },
    branding: {
      siteName: { type: String, default: DEFAULT_BRANDING_SETTINGS.siteName, trim: true, maxlength: 80 },
      logoImage: { type: Schema.Types.ObjectId, ref: 'Image' },
    },
  },
  { timestamps: true },
);

export const StoreSettings = model<IStoreSettings>('StoreSettings', storeSettingsSchema);

export { DEFAULT_ORDER_SETTINGS, DEFAULT_HERO_SETTINGS, DEFAULT_STAFF_SETTINGS, DEFAULT_BRANDING_SETTINGS };
