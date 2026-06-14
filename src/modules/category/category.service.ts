import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { DeleteObjectCommand, getR2BucketName, getR2Client } from '../media/r2.client';
import { Image } from '../media/image.model';
import type { IImage } from '../media/image.interface';
import { ICategory } from './category.interface';
import { Category } from './category.model';

type CreatePayload = {
  userId: string;
  categoryName: string;
  description?: string;
  image?: string;
  parentCategory?: string | null;
};

const IMAGE_POPULATE = {
  path: 'image',
  select: '_id url name alt useCase size createdAt r2_key',
} as const;

const PARENT_POPULATE = {
  path: 'parentCategory',
  select: 'categoryName slug level parentCategory',
} as const;

const makeSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const ensureUniqueSlug = async (baseSlug: string, excludeDocId?: Types.ObjectId): Promise<string> => {
  let slug = baseSlug || 'category';
  let suffix = 0;

  for (;;) {
    const clash = await Category.findOne({
      slug,
      isDeleted: false,
    })
      .select('_id')
      .lean()
      .exec();

    if (
      !clash ||
      (excludeDocId && String(clash._id) === String(excludeDocId))
    ) {
      return slug;
    }
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
};

const createCategoryIntoDB = async (payload: CreatePayload) => {
  const categoryName = payload.categoryName.trim();

  let parentDoc: { _id: Types.ObjectId } | null = null;
  if (payload.parentCategory) {
    parentDoc = await Category.findById(payload.parentCategory).select('_id').lean().exec();
    if (!parentDoc) {
      throw new AppError('Parent category not found', httpStatus.NOT_FOUND);
    }
  }

  if (payload.image) {
    const imageDoc = await Image.findById(payload.image).select('_id').lean().exec();
    if (!imageDoc) {
      throw new AppError('Image not found', httpStatus.BAD_REQUEST);
    }
  }

  const exists = await Category.findOne({
    categoryName,
    parentCategory: parentDoc ? parentDoc._id : null,
    isDeleted: false,
  })
    .lean()
    .exec();

  if (exists) {
    throw new AppError('Category already exists under this parent', httpStatus.CONFLICT);
  }

  const slugBase = makeSlug(categoryName);
  const slug = await ensureUniqueSlug(slugBase);

  const categoryData: Partial<ICategory> = {
    userId: new Types.ObjectId(payload.userId),
    categoryName,
    slug,
    parentCategory: parentDoc ? parentDoc._id : null,
  };

  if (payload.description) {
    categoryData.description = payload.description;
  }

  if (payload.image) {
    categoryData.image = new Types.ObjectId(payload.image);
  }

  const doc = await Category.create(categoryData);

  const populated = await Category.findById(doc._id)
    .populate(IMAGE_POPULATE)
    .populate(PARENT_POPULATE)
    .lean()
    .exec();
  return populated;
};

const getAllCategoriesFromDB = async () => {
  return Category.find({ isDeleted: false })
    .populate(IMAGE_POPULATE)
    .populate(PARENT_POPULATE)
    .sort({ createdAt: -1 })
    .lean()
    .exec();
};

const getCategoryByIdFromDB = async (id: string) => {
  const doc = await Category.findOne({ _id: id, isDeleted: false })
    .populate(IMAGE_POPULATE)
    .populate(PARENT_POPULATE)
    .lean()
    .exec();
  if (!doc) {
    throw new AppError('Category not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const updateCategoryInDB = async (id: string, body: Record<string, unknown>) => {
  const category = await Category.findOne({ _id: id, isDeleted: false }).exec();
  if (!category) {
    throw new AppError('Category not found', httpStatus.NOT_FOUND);
  }

  if (typeof body.categoryName === 'string') {
    category.categoryName = body.categoryName.trim();
    const slugBase = makeSlug(category.categoryName);
    category.slug = await ensureUniqueSlug(slugBase, category._id as Types.ObjectId);
  }

  if (body.description === null) {
    category.description = undefined;
  } else if (typeof body.description === 'string') {
    category.description = body.description;
  }

  if (body.image === null) {
    category.image = undefined;
  } else if (typeof body.image === 'string') {
    const imageDoc = await Image.findById(body.image).select('_id').lean().exec();
    if (!imageDoc) {
      throw new AppError('Image not found', httpStatus.BAD_REQUEST);
    }
    category.image = new Types.ObjectId(body.image);
  }

  if (body.parentCategory === null) {
    category.parentCategory = null;
  } else if (typeof body.parentCategory === 'string') {
    if (body.parentCategory === id) {
      throw new AppError('Category cannot be its own parent', httpStatus.BAD_REQUEST);
    }
    const parentDoc = await Category.findOne({
      _id: body.parentCategory,
      isDeleted: false,
    })
      .lean()
      .exec();
    if (!parentDoc) {
      throw new AppError('Parent category not found', httpStatus.NOT_FOUND);
    }
    category.parentCategory = new Types.ObjectId(body.parentCategory);
  }

  const duplicate = await Category.findOne({
    _id: { $ne: category._id },
    categoryName: category.categoryName,
    parentCategory: category.parentCategory ?? null,
    isDeleted: false,
  })
    .lean()
    .exec();
  if (duplicate) {
    throw new AppError('Category already exists under this parent', httpStatus.CONFLICT);
  }

  await category.save();

  const refreshed = await Category.findById(category._id)
    .populate(IMAGE_POPULATE)
    .populate(PARENT_POPULATE)
    .lean()
    .exec();

  return refreshed;
};

/** Removes R2 object and Image row when only this category uses the asset. */
const deleteExclusiveCategoryImageAsset = async (
  categoryMongoId: Types.ObjectId,
  imageRefId: Types.ObjectId,
): Promise<void> => {
  const image = (await Image.findById(imageRefId).select('_id r2_key').lean().exec()) as
    | (Pick<IImage, 'r2_key'> & { _id: Types.ObjectId })
    | null;

  if (!image) {
    return;
  }

  const usedByOther = await Category.exists({
    _id: { $ne: categoryMongoId },
    image: image._id,
    isDeleted: false,
  });

  if (usedByOther) {
    throw new AppError(
      'Image is used by another category; detach or reassign before delete',
      httpStatus.CONFLICT,
    );
  }

  try {
    const client = getR2Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: getR2BucketName(),
        Key: image.r2_key,
      }),
    );
  } catch (err: unknown) {
    const aws = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
    const missing =
      aws.name === 'NotFound' ||
      aws.name === 'NoSuchKey' ||
      aws.Code === 'NoSuchKey' ||
      aws.$metadata?.httpStatusCode === 404;
    if (!missing) {
      throw err;
    }
  }

  await Image.findByIdAndDelete(image._id).exec();
};

const deleteCategoryFromDB = async (id: string) => {
  const hasChildren = await Category.exists({
    parentCategory: new Types.ObjectId(id),
    isDeleted: false,
  });
  if (hasChildren) {
    throw new AppError(
      'Cannot delete category with active subcategories',
      httpStatus.CONFLICT,
    );
  }

  const doc = await Category.findOne({ _id: id, isDeleted: false }).exec();
  if (!doc) {
    throw new AppError('Category not found', httpStatus.NOT_FOUND);
  }

  if (doc.image) {
    await deleteExclusiveCategoryImageAsset(doc._id as Types.ObjectId, doc.image as Types.ObjectId);
  }

  const deleted = await Category.findByIdAndDelete(doc._id).exec();
  if (!deleted) {
    throw new AppError('Category not found', httpStatus.NOT_FOUND);
  }
  return deleted;
};

export const CategoryService = {
  createCategoryIntoDB,
  getAllCategoriesFromDB,
  getCategoryByIdFromDB,
  updateCategoryInDB,
  deleteCategoryFromDB,
};
