import type { TokenClaims } from './utils/jwt.util';

declare global {
  namespace Express {
    interface Request {
      user?: TokenClaims;
    }
  }
}

export {};
