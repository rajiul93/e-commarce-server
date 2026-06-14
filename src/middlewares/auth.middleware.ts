import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import AppError from '../errors/AppError';
import type { UserRole } from '../modules/user/user.interface';
import { STAFF_ROLES } from '../modules/user/user.interface';
import { verifyAccessToken } from '../utils/jwt.util';

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized: missing bearer token', httpStatus.UNAUTHORIZED));
  }

  const raw = authHeader.slice(7).trim();
  if (!raw) {
    return next(new AppError('Unauthorized: empty token', httpStatus.UNAUTHORIZED));
  }

  try {
    req.user = verifyAccessToken(raw);
    return next();
  } catch {
    return next(new AppError('Unauthorized: invalid access token', httpStatus.UNAUTHORIZED));
  }
};

export const authorize =
  (...allowedRoles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', httpStatus.UNAUTHORIZED));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Forbidden', httpStatus.FORBIDDEN));
    }
    return next();
  };

/** ADMIN, MANAGER, or SELLER — POS and staff catalogue search */
export const authorizeStaff = authorize(...STAFF_ROLES);

/** ADMIN or MANAGER — catalogue, coupons, orders admin, staff accounts */
export const authorizeAdminOrManager = authorize('ADMIN', 'MANAGER');

/** MANAGER or SELLER — own payroll profile */
export const authorizeStaffProfile = authorize('MANAGER', 'SELLER');
