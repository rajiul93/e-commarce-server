import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Image } from '../media/image.model';
import { Product } from '../product/product.model';
import type { IHeroSettings, IOrderSettings, IStaffSettings } from './settings.interface';
import { DEFAULT_BRANDING_SETTINGS, DEFAULT_HERO_SETTINGS, DEFAULT_ORDER_SETTINGS, DEFAULT_STAFF_SETTINGS, StoreSettings } from './settings.model';

const SETTINGS_KEY = 'main';

const ensureSettingsDoc = async () => {
  let doc = await StoreSettings.findOne({ key: SETTINGS_KEY }).exec();
  if (!doc) {
    doc = await StoreSettings.create({
      key: SETTINGS_KEY,
      order: { ...DEFAULT_ORDER_SETTINGS },
      hero: { ...DEFAULT_HERO_SETTINGS },
      staff: { ...DEFAULT_STAFF_SETTINGS },
      branding: { ...DEFAULT_BRANDING_SETTINGS },
    });
  }
  if (!doc.branding) {
    doc.branding = { ...DEFAULT_BRANDING_SETTINGS };
    await doc.save();
  }
  if (!doc.hero) {
    doc.hero = { ...DEFAULT_HERO_SETTINGS };
    await doc.save();
  }
  if (!doc.staff) {
    doc.staff = { ...DEFAULT_STAFF_SETTINGS };
    await doc.save();
  }
  return doc;
};

const IMAGE_POPULATE = { path: 'image', select: '_id url name alt useCase' } as const;
const PRODUCT_POPULATE = { path: 'productId', select: '_id title slug status' } as const;

const validateImageId = async (id: string) => {
  const image = await Image.findById(id).select('_id').lean().exec();
  if (!image) throw new AppError('Image not found', httpStatus.BAD_REQUEST);
  return new Types.ObjectId(id);
};

const validateProductId = async (id: string) => {
  const product = await Product.findById(id).select('_id slug status').lean().exec();
  if (!product) throw new AppError('Product not found', httpStatus.BAD_REQUEST);
  return new Types.ObjectId(id);
};

const mapHeroForResponse = (hero: IHeroSettings) => {
  const raw = hero as IHeroSettings & {
    slides?: Array<{ image?: unknown; productId?: unknown }>;
    sideItems?: Array<{ image?: unknown; productId?: unknown }>;
  };

  const slides = (raw.slides ?? []).map((slide) => ({
    image: slide.image ?? null,
    product:
      slide.productId && typeof slide.productId === 'object' && 'slug' in slide.productId
        ? slide.productId
        : null,
  }));

  const sideItems = (raw.sideItems ?? []).map((item) => ({
    image: item.image ?? null,
    product:
      item.productId && typeof item.productId === 'object' && 'slug' in item.productId
        ? item.productId
        : null,
  }));

  return {
    style: hero.style,
    isActive: hero.isActive,
    slides,
    sideItems,
  };
};

const getHeroSettingsFromDB = async () => {
  const doc = await ensureSettingsDoc();
  const populated = await StoreSettings.findById(doc._id)
    .populate({ path: 'hero.slides.image', select: '_id url name alt useCase' })
    .populate({ path: 'hero.slides.productId', select: '_id title slug status' })
    .populate({ path: 'hero.sideItems.image', select: '_id url name alt useCase' })
    .populate({ path: 'hero.sideItems.productId', select: '_id title slug status' })
    .lean()
    .exec();

  if (!populated?.hero) {
    return mapHeroForResponse({ ...DEFAULT_HERO_SETTINGS });
  }
  return mapHeroForResponse(populated.hero as IHeroSettings);
};

type HeroUpdatePayload = {
  style?: IHeroSettings['style'];
  isActive?: boolean;
  slides?: Array<{ image: string; productId?: string | null }>;
  sideItems?: Array<{ image: string; productId: string }>;
};

const updateHeroSettingsInDB = async (patch: HeroUpdatePayload) => {
  const doc = await ensureSettingsDoc();

  if (patch.style) {
    doc.hero.style = patch.style;
  }
  if (patch.isActive !== undefined) {
    doc.hero.isActive = patch.isActive;
  }

  if (patch.slides) {
    doc.hero.slides = [];
    for (const slide of patch.slides) {
      const image = await validateImageId(slide.image);
      const entry: { image: Types.ObjectId; productId?: Types.ObjectId } = { image };
      if (slide.productId) {
        entry.productId = await validateProductId(slide.productId);
      }
      doc.hero.slides.push(entry);
    }
  }

  if (patch.sideItems) {
    const maxSide = doc.hero.style === 'split_two' ? 2 : doc.hero.style === 'split_one' ? 1 : 0;
    if (doc.hero.style === 'slider_only' && patch.sideItems.length > 0) {
      throw new AppError('Side products are not used in slider-only layout', httpStatus.BAD_REQUEST);
    }
    if (patch.sideItems.length > maxSide) {
      throw new AppError(`This layout allows at most ${maxSide} side product(s)`, httpStatus.BAD_REQUEST);
    }
    doc.hero.sideItems = [];
    for (const item of patch.sideItems) {
      doc.hero.sideItems.push({
        image: await validateImageId(item.image),
        productId: await validateProductId(item.productId),
      });
    }
  }

  if (doc.hero.style === 'split_one' && doc.hero.sideItems.length > 1) {
    doc.hero.sideItems = doc.hero.sideItems.slice(0, 1);
  }
  if (doc.hero.style === 'split_two' && doc.hero.sideItems.length > 2) {
    doc.hero.sideItems = doc.hero.sideItems.slice(0, 2);
  }
  if (doc.hero.style === 'slider_only') {
    doc.hero.sideItems = [];
  }

  await doc.save();
  return getHeroSettingsFromDB();
};

const getOrderSettingsFromDB = async (): Promise<IOrderSettings> => {
  const doc = await ensureSettingsDoc();
  return {
    loggedInCheckout: doc.order.loggedInCheckout,
    guestQuickOrder: doc.order.guestQuickOrder,
    couponScope: doc.order.couponScope ?? 'all_products',
  };
};

const updateOrderSettingsInDB = async (patch: Partial<IOrderSettings>): Promise<IOrderSettings> => {
  const doc = await ensureSettingsDoc();

  if (patch.loggedInCheckout !== undefined) {
    doc.order.loggedInCheckout = patch.loggedInCheckout;
  }
  if (patch.guestQuickOrder !== undefined) {
    doc.order.guestQuickOrder = patch.guestQuickOrder;
  }
  if (patch.couponScope !== undefined) {
    doc.order.couponScope = patch.couponScope;
  }

  if (!doc.order.loggedInCheckout && !doc.order.guestQuickOrder) {
    throw new AppError('At least one order mode must stay enabled', httpStatus.BAD_REQUEST);
  }

  await doc.save();
  return {
    loggedInCheckout: doc.order.loggedInCheckout,
    guestQuickOrder: doc.order.guestQuickOrder,
    couponScope: doc.order.couponScope ?? 'all_products',
  };
};

const assertLoggedInCheckoutEnabled = async () => {
  const settings = await getOrderSettingsFromDB();
  if (!settings.loggedInCheckout) {
    throw new AppError('Logged-in checkout is currently disabled', httpStatus.FORBIDDEN);
  }
};

const assertGuestQuickOrderEnabled = async () => {
  const settings = await getOrderSettingsFromDB();
  if (!settings.guestQuickOrder) {
    throw new AppError('Guest quick order is currently disabled', httpStatus.FORBIDDEN);
  }
};

const getStaffSettingsFromDB = async (): Promise<IStaffSettings> => {
  const doc = await ensureSettingsDoc();
  return {
    workingDaysPerMonth: doc.staff?.workingDaysPerMonth ?? DEFAULT_STAFF_SETTINGS.workingDaysPerMonth,
  };
};

const updateStaffSettingsInDB = async (patch: Partial<IStaffSettings>): Promise<IStaffSettings> => {
  const doc = await ensureSettingsDoc();
  if (!doc.staff) {
    doc.staff = { ...DEFAULT_STAFF_SETTINGS };
  }
  if (patch.workingDaysPerMonth !== undefined) {
    if (patch.workingDaysPerMonth < 1 || patch.workingDaysPerMonth > 31) {
      throw new AppError('Working days must be between 1 and 31', httpStatus.BAD_REQUEST);
    }
    doc.staff.workingDaysPerMonth = patch.workingDaysPerMonth;
  }
  await doc.save();
  return getStaffSettingsFromDB();
};

const getBrandingSettingsFromDB = async () => {
  const doc = await ensureSettingsDoc();
  const populated = await StoreSettings.findById(doc._id)
    .populate({ path: 'branding.logoImage', select: '_id url name alt useCase' })
    .lean()
    .exec();

  const branding = populated?.branding ?? { ...DEFAULT_BRANDING_SETTINGS };
  const logoRaw = branding.logoImage as
    | { _id: Types.ObjectId; url: string; name?: string; alt?: string }
    | Types.ObjectId
    | null
    | undefined;

  return {
    siteName: branding.siteName || DEFAULT_BRANDING_SETTINGS.siteName,
    logo:
      logoRaw && typeof logoRaw === 'object' && 'url' in logoRaw
        ? {
            _id: String(logoRaw._id),
            url: logoRaw.url,
            alt: logoRaw.alt,
            name: logoRaw.name,
          }
        : null,
  };
};

const updateBrandingSettingsInDB = async (patch: {
  siteName?: string;
  logoImageId?: string | null;
}) => {
  const doc = await ensureSettingsDoc();
  if (!doc.branding) {
    doc.branding = { ...DEFAULT_BRANDING_SETTINGS };
  }

  if (patch.siteName !== undefined) {
    const trimmed = patch.siteName.trim();
    if (!trimmed) {
      throw new AppError('Site name is required', httpStatus.BAD_REQUEST);
    }
    doc.branding.siteName = trimmed;
  }

  if (patch.logoImageId !== undefined) {
    if (patch.logoImageId === null || patch.logoImageId === '') {
      doc.branding.logoImage = undefined;
    } else {
      doc.branding.logoImage = await validateImageId(patch.logoImageId);
    }
  }

  await doc.save();
  return getBrandingSettingsFromDB();
};

export const SettingsService = {
  getOrderSettingsFromDB,
  updateOrderSettingsInDB,
  getHeroSettingsFromDB,
  updateHeroSettingsInDB,
  getStaffSettingsFromDB,
  updateStaffSettingsInDB,
  getBrandingSettingsFromDB,
  updateBrandingSettingsInDB,
  assertLoggedInCheckoutEnabled,
  assertGuestQuickOrderEnabled,
};
