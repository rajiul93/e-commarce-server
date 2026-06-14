import { randomUUID } from 'crypto';

export const generatePaymentTransactionId = (): string =>
  `TXN-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`;
