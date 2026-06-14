import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { Image } from '../media/image.model';
import { IUser } from './user.interface';
import { User } from './user.model';

export type RegisterInput = Pick<IUser, 'name' | 'email' | 'password'>;

const stripPassword = <T extends { password?: string }>(doc: T) => {
  const copy = { ...doc };
  delete copy.password;
  return copy as Omit<T, 'password'>;
};

const registerIntoDB = async (payload: RegisterInput) => {
  const normalizedEmail = payload.email.toLowerCase().trim();
  const exists = await User.findOne({
    email: normalizedEmail,
  });
  if (exists) {
    throw new AppError('Email already exists', httpStatus.CONFLICT);
  }

  const user = await User.create({
    name: payload.name.trim(),
    email: normalizedEmail,
    password: payload.password,
    role: 'USER',
    isVerified: true,
    isActive: true,
    isDeleted: false,
  });

  const userObj = user.toObject({ versionKey: false });
  return stripPassword(userObj as IUser & { password: string });
};

const loginIntoDB = async (email: string, rawPassword: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.isUserExistsByEmail(normalizedEmail);

  if (!user || user.isDeleted) {
    throw new AppError('Invalid email or password', httpStatus.UNAUTHORIZED);
  }
  if (user.isActive === false) {
    throw new AppError('Account is disabled', httpStatus.FORBIDDEN);
  }

  const match = await bcrypt.compare(rawPassword, user.password);
  if (!match) {
    throw new AppError('Invalid email or password', httpStatus.UNAUTHORIZED);
  }

  const userObj = user.toObject({ versionKey: false }) as IUser & { password: string };
  return stripPassword(userObj);
};

const getMyProfileFromDB = async (userId: string) => {
  const user = await User.findById(userId);

  if (!user || user.isDeleted) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }
  if (user.isActive === false) {
    throw new AppError('Account is disabled', httpStatus.FORBIDDEN);
  }

  const userObj = user.toObject({ versionKey: false });
  return stripPassword(userObj as IUser & { password?: string });
};

const PROFILE_IMAGE_POPULATE = {
  path: 'profileImage',
  select: '_id url alt name',
} as const;

const getAllUsersFromDB = async () => {
  return User.find({ isDeleted: { $ne: true } })
    .select('-password -nid')
    .populate(PROFILE_IMAGE_POPULATE)
    .sort({ createdAt: -1 })
    .lean()
    .exec();
};

const getUserAdminByIdFromDB = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user id', httpStatus.BAD_REQUEST);
  }
  const user = await User.findById(userId)
    .select('-password')
    .populate(PROFILE_IMAGE_POPULATE)
    .lean()
    .exec();
  if (!user || user.isDeleted) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }
  return user;
};

export type AdminUpdateUserPayload = {
  password?: string;
  profileImageId?: string | null;
  nid?: string | null;
  name?: string;
  phone?: string | null;
};

const updateUserAdminFromDB = async (userId: string, payload: AdminUpdateUserPayload) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user id', httpStatus.BAD_REQUEST);
  }
  const user = await User.findById(userId).select('+password');
  if (!user || user.isDeleted) {
    throw new AppError('User not found', httpStatus.NOT_FOUND);
  }

  if (payload.name !== undefined) {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      throw new AppError('Name is required', httpStatus.BAD_REQUEST);
    }
    user.name = trimmed;
  }

  if (payload.phone !== undefined) {
    user.phone = payload.phone?.trim() ? payload.phone.trim() : undefined;
  }

  if (payload.nid !== undefined) {
    user.nid = payload.nid?.trim() ? payload.nid.trim() : undefined;
  }

  if (payload.profileImageId !== undefined) {
    if (payload.profileImageId === null || payload.profileImageId === '') {
      user.profileImage = undefined;
    } else {
      if (!Types.ObjectId.isValid(payload.profileImageId)) {
        throw new AppError('Invalid profile image id', httpStatus.BAD_REQUEST);
      }
      const img = await Image.findById(payload.profileImageId).select('_id').lean().exec();
      if (!img) {
        throw new AppError('Profile image not found', httpStatus.BAD_REQUEST);
      }
      user.profileImage = new Types.ObjectId(payload.profileImageId);
    }
  }

  if (payload.password !== undefined) {
    if (payload.password.length < 6) {
      throw new AppError('Password must be at least 6 characters', httpStatus.BAD_REQUEST);
    }
    user.password = payload.password;
  }

  await user.save();

  return User.findById(user._id)
    .select('-password')
    .populate(PROFILE_IMAGE_POPULATE)
    .lean()
    .exec();
};

export type CreateStaffPayload = {
  name: string;
  email: string;
  password: string;
  role: 'MANAGER' | 'SELLER';
  phone?: string;
  monthlySalary?: number;
};

const createStaffIntoDB = async (
  creatorRole: IUser['role'],
  creatorId: string,
  payload: CreateStaffPayload,
) => {
  if (creatorRole === 'SELLER' || creatorRole === 'USER') {
    throw new AppError('Forbidden', httpStatus.FORBIDDEN);
  }
  if (creatorRole === 'MANAGER' && payload.role !== 'SELLER') {
    throw new AppError('Managers can only create seller accounts', httpStatus.FORBIDDEN);
  }

  const normalizedEmail = payload.email.toLowerCase().trim();
  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    throw new AppError('Email already exists', httpStatus.CONFLICT);
  }

  const user = await User.create({
    name: payload.name.trim(),
    email: normalizedEmail,
    password: payload.password,
    role: payload.role,
    ...(payload.phone?.trim() ? { phone: payload.phone.trim() } : {}),
    monthlySalary: payload.monthlySalary ?? 0,
    createdBy: new Types.ObjectId(creatorId),
    isVerified: true,
    isActive: true,
    isDeleted: false,
  });

  const userObj = user.toObject({ versionKey: false });
  return stripPassword(userObj as IUser & { password: string });
};

const refreshSessionFromDB = async (claims: {
  userId: string;
  email: string;
  role: IUser['role'];
  name: string;
}) => {
  const user = await User.findById(claims.userId);
  if (!user || user.isDeleted || user.isActive === false) {
    throw new AppError('User not found or inactive', httpStatus.UNAUTHORIZED);
  }
  return {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    name: user.name,
  };
};

const listStaffFromDB = async (viewerRole: IUser['role'], viewerId: string) => {
  if (viewerRole === 'ADMIN') {
    return User.find({ role: { $in: ['MANAGER', 'SELLER'] } })
      .select('-password -nid')
      .populate(PROFILE_IMAGE_POPULATE)
      .populate({ path: 'createdBy', select: 'name email role' })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
  if (viewerRole === 'MANAGER') {
    return User.find({ role: { $in: ['MANAGER', 'SELLER'] } })
      .select('-password -nid')
      .populate(PROFILE_IMAGE_POPULATE)
      .populate({ path: 'createdBy', select: 'name email role' })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
  throw new AppError('Forbidden', httpStatus.FORBIDDEN);
};

export const UserService = {
  registerIntoDB,
  loginIntoDB,
  getMyProfileFromDB,
  getAllUsersFromDB,
  getUserAdminByIdFromDB,
  updateUserAdminFromDB,
  createStaffIntoDB,
  listStaffFromDB,
  refreshSessionFromDB,
};
