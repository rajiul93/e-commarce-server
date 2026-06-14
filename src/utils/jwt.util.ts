import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import config from '../config';
import type { UserRole } from '../modules/user/user.interface';

const VALID_TOKEN_ROLES: UserRole[] = ['USER', 'ADMIN', 'MANAGER', 'SELLER'];

export interface TokenClaims {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

export function expiresInMilliseconds(expiresIn: string): number {
  const m = /^(\d+)(s|m|h|d)$/.exec(expiresIn.trim());
  if (!m) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const n = Number(m[1]);
  const unit = m[2];
  const multiplier =
    unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return n * multiplier;
}

export function signAccessToken(payload: TokenClaims): string {
  const opts: SignOptions = {
    expiresIn: config.jwt_access_expires_in as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt_access_secret as Secret, opts);
}

export function signRefreshToken(payload: TokenClaims): string {
  const opts: SignOptions = {
    expiresIn: config.jwt_refresh_expires_in as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt_refresh_secret as Secret, opts);
}

export function verifyAccessToken(token: string): TokenClaims {
  const decoded = jwt.verify(token, config.jwt_access_secret as Secret);

  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    throw new jwt.JsonWebTokenError('Malformed token payload');
  }

  const payload = decoded as JwtPayloadPayload;
  const { userId, email, role, name } = payload;

  if (typeof userId !== 'string' || typeof email !== 'string' || typeof role !== 'string' || typeof name !== 'string') {
    throw new jwt.JsonWebTokenError('Incomplete token payload');
  }

  if (!VALID_TOKEN_ROLES.includes(role as UserRole)) {
    throw new jwt.JsonWebTokenError('Invalid role in token');
  }

  return { userId, email, role: role as UserRole, name };
}

export function verifyRefreshToken(token: string): TokenClaims {
  const decoded = jwt.verify(token, config.jwt_refresh_secret as Secret);

  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    throw new jwt.JsonWebTokenError('Malformed token payload');
  }

  const payload = decoded as JwtPayloadPayload;
  const { userId, email, role, name } = payload;

  if (typeof userId !== 'string' || typeof email !== 'string' || typeof role !== 'string' || typeof name !== 'string') {
    throw new jwt.JsonWebTokenError('Incomplete token payload');
  }

  if (!VALID_TOKEN_ROLES.includes(role as UserRole)) {
    throw new jwt.JsonWebTokenError('Invalid role in token');
  }

  return { userId, email, role: role as UserRole, name };
}

type JwtPayloadPayload = {
  userId?: unknown;
  email?: unknown;
  role?: unknown;
  name?: unknown;
};
