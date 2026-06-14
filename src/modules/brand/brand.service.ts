import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Image } from '../media/image.model';
import { Brand } from './brand.model';

const IMAGE_POPULATE = {
  path: 'image',
  select: '_id url name alt useCase size createdAt',
} as const;

const assertValidObjectId = (id: string, message = 'Invalid id'): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(message, httpStatus.BAD_REQUEST);
  }
};

const assertImageExists = async (imageId: string): Promise<void> => {
  assertValidObjectId(imageId);
  const image = await Image.findById(imageId).select('_id').lean().exec();
  if (!image) {
    throw new AppError('Image not found', httpStatus.BAD_REQUEST);
  }
};

const createBrandIntoDB = async (payload: { brandName: string; image: string }) => {
  const brandName = payload.brandName.trim();
  if (!brandName) {
    throw new AppError('Brand name is required', httpStatus.BAD_REQUEST);
  }

  await assertImageExists(payload.image);

  const dup = await Brand.findOne({
    brandName: new RegExp(`^${escapeRegex(brandName)}$`, 'i'),
  })
    .lean()
    .exec();
  if (dup) {
    throw new AppError('Brand name already exists', httpStatus.CONFLICT);
  }

  const doc = await Brand.create({
    brandName,
    image: new Types.ObjectId(payload.image),
  });

  const populated = await Brand.findById(doc._id)
    .populate(IMAGE_POPULATE)
    .lean()
    .exec();
  return populated;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const getAllBrandsFromDB = async () => {
  return Brand.find({}).populate(IMAGE_POPULATE).sort({ createdAt: -1 }).lean().exec();
};

const getBrandByIdFromDB = async (id: string) => {
  assertValidObjectId(id);
  const brand = await Brand.findById(id).populate(IMAGE_POPULATE).lean().exec();
  if (!brand) {
    throw new AppError('Brand not found', httpStatus.NOT_FOUND);
  }
  return brand;
};

const updateBrandInDB = async (id: string, body: { brandName?: string; image?: string }) => {
  assertValidObjectId(id);
  const brand = await Brand.findById(id).exec();
  if (!brand) {
    throw new AppError('Brand not found', httpStatus.NOT_FOUND);
  }

  if (body.image !== undefined) {
    await assertImageExists(body.image);
    brand.image = new Types.ObjectId(body.image);
  }

  if (body.brandName !== undefined) {
    const nextName = body.brandName.trim();
    if (!nextName) {
      throw new AppError('Brand name is required', httpStatus.BAD_REQUEST);
    }
    const duplicate = await Brand.findOne({
      _id: { $ne: brand._id },
      brandName: new RegExp(`^${escapeRegex(nextName)}$`, 'i'),
    })
      .lean()
      .exec();
    if (duplicate) {
      throw new AppError('Brand name already exists', httpStatus.CONFLICT);
    }
    brand.brandName = nextName;
  }

  await brand.save();

  const updated = await Brand.findById(brand._id).populate(IMAGE_POPULATE).lean().exec();
  return updated;
};

const deleteBrandFromDB = async (id: string) => {
  assertValidObjectId(id);
  const result = await Brand.findByIdAndDelete(id).exec();
  if (!result) {
    throw new AppError('Brand not found', httpStatus.NOT_FOUND);
  }
};

export const BrandService = {
  createBrandIntoDB,
  getAllBrandsFromDB,
  getBrandByIdFromDB,
  updateBrandInDB,
  deleteBrandFromDB,
};
