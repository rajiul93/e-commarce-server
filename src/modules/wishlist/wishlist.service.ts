import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Product } from '../product/product.model';
import { Wishlist } from './wishlist.model';

const PRODUCT_POPULATE_CHAIN = [
  {
    path: 'productId',
    select: 'title slug shortDescription description brand category thumbnail gallery attributes status createdAt updatedAt',
    populate: [
      { path: 'thumbnail', select: '_id url name alt useCase size createdAt' },
      { path: 'gallery', select: '_id url name alt useCase size createdAt' },
      {
        path: 'brand',
        select: 'brandName image',
        populate: { path: 'image', select: '_id url name alt useCase size createdAt' },
      },
      {
        path: 'category',
        select: 'categoryName slug level description image',
        populate: { path: 'image', select: '_id url name alt useCase size createdAt' },
      },
      { path: 'attributes', select: '_id name values status createdAt updatedAt' },
    ],
  },
];

const assertValidObjectId = (id: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }
};

const assertProductExists = async (productId: string): Promise<void> => {
  assertValidObjectId(productId);
  const exists = await Product.exists({ _id: new Types.ObjectId(productId) }).exec();
  if (!exists) {
    throw new AppError('Product not found', httpStatus.NOT_FOUND);
  }
};

const addToWishlistIntoDB = async (userId: string, productId: string) => {
  await assertProductExists(productId);

  const uid = new Types.ObjectId(userId);
  const pid = new Types.ObjectId(productId);

  try {
    const doc = await Wishlist.create({ userId: uid, productId: pid });
    const populated = await Wishlist.findById(doc._id).populate(PRODUCT_POPULATE_CHAIN).lean().exec();
    if (!populated) {
      throw new AppError('Wishlist item could not be loaded', httpStatus.INTERNAL_SERVER_ERROR);
    }
    return populated;
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 11000) {
      throw new AppError('Product already in wishlist', httpStatus.CONFLICT);
    }
    throw err;
  }
};

const listWishlistFromDB = async (userId: string) => {
  assertValidObjectId(userId);
  return Wishlist.find({ userId: new Types.ObjectId(userId) })
    .populate(PRODUCT_POPULATE_CHAIN)
    .sort({ createdAt: -1 })
    .lean()
    .exec();
};

const removeWishlistItemFromDB = async (userId: string, wishlistEntryId: string) => {
  assertValidObjectId(userId);
  assertValidObjectId(wishlistEntryId);

  const entry = await Wishlist.findOneAndDelete({
    _id: wishlistEntryId,
    userId: new Types.ObjectId(userId),
  }).exec();

  if (!entry) {
    throw new AppError('Wishlist item not found', httpStatus.NOT_FOUND);
  }
};

export const WishlistService = {
  addToWishlistIntoDB,
  listWishlistFromDB,
  removeWishlistItemFromDB,
};
