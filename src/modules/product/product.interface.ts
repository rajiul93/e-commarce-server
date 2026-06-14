import { Types } from 'mongoose';

export type ProductStatus = 'draft' | 'active' | 'inactive';

export type ProductOfferType = 'none' | 'percent' | 'fixed';

/**
 * Persisted catalogue product. Variants (SKU, price, stock) use `Variant.productId`.
 */
export interface IProduct {
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  brand?: Types.ObjectId;
  category: Types.ObjectId;
  /** Main cover image shown in listings and product hero. Optional. */
  thumbnail?: Types.ObjectId;
  /** Extra product photos (0..n). Optional. */
  gallery: Types.ObjectId[];
  /** Which `Attribute` catalogue rows (e.g. Size, Color) apply when building variants for this product. */
  attributes: Types.ObjectId[];
  status: ProductStatus;
  /** 0–5 average rating for sort/filter (optional until reviews exist) */
  averageRating?: number;
  /** Browser tab / search result title, e.g. "Product | Brand" */
  seoTitle?: string;
  /** Meta description for search engines */
  seoDescription?: string;
  /** Open Graph share title */
  ogTitle?: string;
  /** Open Graph share description */
  ogDescription?: string;
  /** Open Graph share image (separate from product thumbnail) */
  ogImage?: Types.ObjectId;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  offerType?: ProductOfferType;
  /** Percent (1–100) or fixed amount in BDT depending on offerType */
  offerValue?: number;
}
