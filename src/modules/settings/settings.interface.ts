export interface IOrderSettings {
  loggedInCheckout: boolean;
  guestQuickOrder: boolean;
  /** When `specific_products`, coupons only apply to selected products per coupon */
  couponScope: 'all_products' | 'specific_products';
}

export type HeroStyle = 'split_one' | 'split_two' | 'slider_only';

export interface IHeroSlide {
  image: import('mongoose').Types.ObjectId;
  productId?: import('mongoose').Types.ObjectId;
}

export interface IHeroSideItem {
  image: import('mongoose').Types.ObjectId;
  productId: import('mongoose').Types.ObjectId;
}

export interface IHeroSettings {
  style: HeroStyle;
  isActive: boolean;
  slides: IHeroSlide[];
  sideItems: IHeroSideItem[];
}

export interface IStaffSettings {
  workingDaysPerMonth: number;
}

export interface IBrandingSettings {
  siteName: string;
  logoImage?: import('mongoose').Types.ObjectId;
}

export interface IStoreSettings {
  key: 'main';
  order: IOrderSettings;
  hero: IHeroSettings;
  staff: IStaffSettings;
  branding: IBrandingSettings;
}
