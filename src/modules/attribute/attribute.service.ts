import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import type { AttributeCreateInput } from './attribute.interface';
import { Attribute } from './attribute.model';

const assertValidObjectId = (id: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }
};

const normalizeValues = (values: string[]): string[] => {
  const trimmed = values.map((v) => v.trim()).filter(Boolean);
  return [...new Set(trimmed)];
};

const createAttributeIntoDB = async (payload: AttributeCreateInput) => {
  const name = payload.name.trim();
  if (!name) {
    throw new AppError('Name is required', httpStatus.BAD_REQUEST);
  }

  const values = normalizeValues(payload.values);
  if (!values.length) {
    throw new AppError('At least one value is required', httpStatus.BAD_REQUEST);
  }

  const dup = await Attribute.findOne({
    name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
  })
    .lean()
    .exec();
  if (dup) {
    throw new AppError('Attribute name already exists', httpStatus.CONFLICT);
  }

  const doc = await Attribute.create({
    name,
    values,
    status: payload.status ?? 'active',
  });

  return Attribute.findById(doc._id).lean().exec();
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const getAllAttributesFromDB = async () => {
  return Attribute.find({}).sort({ name: 1 }).lean().exec();
};

const getAttributeByIdFromDB = async (id: string) => {
  assertValidObjectId(id);
  const doc = await Attribute.findById(id).lean().exec();
  if (!doc) {
    throw new AppError('Attribute not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const updateAttributeInDB = async (
  id: string,
  body: Partial<Pick<AttributeCreateInput, 'name' | 'values' | 'status'>>,
) => {
  assertValidObjectId(id);
  const attr = await Attribute.findById(id).exec();
  if (!attr) {
    throw new AppError('Attribute not found', httpStatus.NOT_FOUND);
  }

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      throw new AppError('Name is required', httpStatus.BAD_REQUEST);
    }
    const duplicate = await Attribute.findOne({
      _id: { $ne: attr._id },
      name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    })
      .lean()
      .exec();
    if (duplicate) {
      throw new AppError('Attribute name already exists', httpStatus.CONFLICT);
    }
    attr.name = name;
  }

  if (body.values !== undefined) {
    const values = normalizeValues(body.values);
    if (!values.length) {
      throw new AppError('At least one value is required', httpStatus.BAD_REQUEST);
    }
    attr.values = values;
  }

  if (body.status !== undefined) {
    attr.status = body.status;
  }

  await attr.save();
  return Attribute.findById(attr._id).lean().exec();
};

const deleteAttributeFromDB = async (id: string) => {
  assertValidObjectId(id);
  const result = await Attribute.findByIdAndDelete(id).exec();
  if (!result) {
    throw new AppError('Attribute not found', httpStatus.NOT_FOUND);
  }
};

export const AttributeService = {
  createAttributeIntoDB,
  getAllAttributesFromDB,
  getAttributeByIdFromDB,
  updateAttributeInDB,
  deleteAttributeFromDB,
};
