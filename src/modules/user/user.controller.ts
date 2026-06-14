import { Request, Response } from 'express';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';
import AppError from '../../errors/AppError';
import {
  expiresInMilliseconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt.util';
import config from '../../config';
import { IUser } from './user.interface';
import { UserService } from './user.service';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

const cookieOptions = () => {
  const isProd = config.node_env === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: expiresInMilliseconds(config.jwt_refresh_expires_in),
    path: '/',
  };
};

const buildAuthClaims = (
  doc: Omit<IUser, 'password'> & { _id: { toString(): string } },
) => ({
  userId: doc._id.toString(),
  email: doc.email,
  role: doc.role,
  name: doc.name,
});

const setRefreshTokenCookie = (res: Response, refreshToken: string) => {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions());
};

const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions());
};

const issueAuthResponse = (res: Response, tokenPayload: ReturnType<typeof buildAuthClaims>) => {
  const accessToken = signAccessToken({
    userId: tokenPayload.userId,
    email: tokenPayload.email,
    role: tokenPayload.role,
    name: tokenPayload.name,
  });
  const refreshToken = signRefreshToken({
    userId: tokenPayload.userId,
    email: tokenPayload.email,
    role: tokenPayload.role,
    name: tokenPayload.name,
  });

  setRefreshTokenCookie(res, refreshToken);

  return {
    accessToken,
    token: {
      userId: tokenPayload.userId,
      email: tokenPayload.email,
      role: tokenPayload.role,
      name: tokenPayload.name,
    },
  };
};

const createUser = catchAsync(async (req: Request, res: Response) => {
  const user = await UserService.registerIntoDB(req.body);
  const tokenPayload = buildAuthClaims(
    user as Omit<IUser, 'password'> & { _id: { toString(): string } },
  );
  const data = issueAuthResponse(res, tokenPayload);
  return sendResponse(res, httpStatus.CREATED, 'User created successfully', data);
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await UserService.loginIntoDB(email, password);
  const tokenPayload = buildAuthClaims(
    user as Omit<IUser, 'password'> & { _id: { toString(): string } },
  );
  const data = issueAuthResponse(res, tokenPayload);
  return sendResponse(res, httpStatus.OK, 'Logged in successfully', data);
});

const refresh = catchAsync(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_TOKEN_COOKIE];
  if (!raw || typeof raw !== 'string') {
    throw new AppError('Refresh token missing', httpStatus.UNAUTHORIZED);
  }

  let claims;
  try {
    claims = verifyRefreshToken(raw);
  } catch {
    clearRefreshTokenCookie(res);
    throw new AppError('Invalid refresh token', httpStatus.UNAUTHORIZED);
  }

  const session = await UserService.refreshSessionFromDB(claims);
  const data = issueAuthResponse(res, session);
  return sendResponse(res, httpStatus.OK, 'Token refreshed successfully', data);
});

const logout = catchAsync(async (_req: Request, res: Response) => {
  clearRefreshTokenCookie(res);
  return sendResponse(res, httpStatus.OK, 'Logged out successfully', null);
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getMyProfileFromDB(req.user!.userId);
  return sendResponse(res, httpStatus.OK, 'Profile retrieved successfully', result);
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAllUsersFromDB();
  return sendResponse(res, httpStatus.OK, 'Users retrieved successfully', result);
});

const createStaff = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.createStaffIntoDB(
    req.user!.role,
    req.user!.userId,
    req.body,
  );
  return sendResponse(res, httpStatus.CREATED, 'Staff account created successfully', result);
});

const listStaff = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.listStaffFromDB(req.user!.role, req.user!.userId);
  return sendResponse(res, httpStatus.OK, 'Staff retrieved successfully', result);
});

const getUserAdminById = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getUserAdminByIdFromDB(String(req.params.id));
  return sendResponse(res, httpStatus.OK, 'User retrieved successfully', result);
});

const updateUserAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateUserAdminFromDB(String(req.params.id), req.body);
  return sendResponse(res, httpStatus.OK, 'User updated successfully', result);
});

export const UserController = {
  createUser,
  login,
  refresh,
  logout,
  getMyProfile,
  getAllUsers,
  createStaff,
  listStaff,
  getUserAdminById,
  updateUserAdmin,
};
