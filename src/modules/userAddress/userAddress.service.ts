import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import type { IUserAddress } from './userAddress.interface';
import { UserAddress } from './userAddress.model';

const assertValidObjectId = (id: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }
};

const unsetOtherDefaults = async (
  userId: string,
  exceptAddressId?: Types.ObjectId,
): Promise<void> => {
  await UserAddress.updateMany(
    {
      userId: new Types.ObjectId(userId),
      ...(exceptAddressId ? { _id: { $ne: exceptAddressId } } : {}),
    },
    { $set: { isDefault: false } },
  ).exec();
};

const promoteOneDefaultIfNone = async (userId: string): Promise<void> => {
  const hasDefault = await UserAddress.exists({
    userId: new Types.ObjectId(userId),
    isDefault: true,
  }).exec();
  if (hasDefault) return;

  const first = await UserAddress.findOne({
    userId: new Types.ObjectId(userId),
  })
    .sort({ createdAt: 1 })
    .exec();
  if (!first) return;
  first.isDefault = true;
  await first.save();
};

export type CreateUserAddressPayload = Omit<IUserAddress, 'userId'> &
  Partial<Pick<IUserAddress, 'isDefault'>>;

const listAddressesFromDB = async (userId: string) => {
  assertValidObjectId(userId);
  return UserAddress.find({ userId: new Types.ObjectId(userId) })
    .sort({ isDefault: -1, updatedAt: -1 })
    .lean()
    .exec();
};

const createAddressIntoDB = async (userId: string, payload: CreateUserAddressPayload) => {
  assertValidObjectId(userId);
  const isDefault = payload.isDefault ?? false;

  if (isDefault) {
    await unsetOtherDefaults(userId);
  }

  const doc = await UserAddress.create({
    userId: new Types.ObjectId(userId),
    name: payload.name.trim(),
    phone: payload.phone.trim(),
    country: payload.country.trim(),
    state: payload.state.trim(),
    city: payload.city.trim(),
    thana: payload.thana.trim(),
    localLocation: payload.localLocation.trim(),
    isDefault,
  });

  const count = await UserAddress.countDocuments({ userId: new Types.ObjectId(userId) }).exec();
  if (count === 1 && !doc.isDefault) {
    doc.isDefault = true;
    await doc.save();
  }

  if (
    !(await UserAddress.exists({
      userId: new Types.ObjectId(userId),
      isDefault: true,
    }).exec())
  ) {
    await promoteOneDefaultIfNone(userId);
  }

  return UserAddress.findById(doc._id).lean().exec();
};

const updateAddressInDB = async (
  userId: string,
  addressId: string,
  body: Partial<Omit<IUserAddress, 'userId'>>,
) => {
  assertValidObjectId(userId);
  assertValidObjectId(addressId);

  const doc = await UserAddress.findOne({
    _id: addressId,
    userId: new Types.ObjectId(userId),
  }).exec();

  if (!doc) {
    throw new AppError('Address not found', httpStatus.NOT_FOUND);
  }

  if (body.name !== undefined) doc.name = body.name.trim();
  if (body.phone !== undefined) doc.phone = body.phone.trim();
  if (body.country !== undefined) doc.country = body.country.trim();
  if (body.state !== undefined) doc.state = body.state.trim();
  if (body.city !== undefined) doc.city = body.city.trim();
  if (body.thana !== undefined) doc.thana = body.thana.trim();
  if (body.localLocation !== undefined) doc.localLocation = body.localLocation.trim();

  if (body.isDefault === true) {
    await unsetOtherDefaults(userId, doc._id as Types.ObjectId);
    doc.isDefault = true;
  } else if (body.isDefault === false) {
    doc.isDefault = false;
  }

  await doc.save();

  if (!(await UserAddress.exists({ userId: doc.userId, isDefault: true }).exec())) {
    await promoteOneDefaultIfNone(userId);
  }

  return UserAddress.findById(doc._id).lean().exec();
};

const deleteAddressFromDB = async (userId: string, addressId: string) => {
  assertValidObjectId(userId);
  assertValidObjectId(addressId);

  const doc = await UserAddress.findOne({
    _id: addressId,
    userId: new Types.ObjectId(userId),
  }).exec();

  if (!doc) {
    throw new AppError('Address not found', httpStatus.NOT_FOUND);
  }

  const wasDefault = doc.isDefault;
  await doc.deleteOne();

  if (wasDefault) {
    await promoteOneDefaultIfNone(userId);
  }
};

export const UserAddressService = {
  listAddressesFromDB,
  createAddressIntoDB,
  updateAddressInDB,
  deleteAddressFromDB,
};
