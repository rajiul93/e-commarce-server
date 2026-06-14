import express from 'express';
import { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { CollectionRoutes } from './src/modules/collection/collection.router';
import { SettingsRoutes } from './src/modules/settings/settings.router';
import { AttributeRoutes } from './src/modules/attribute/attribute.router';
import { BrandRoutes } from './src/modules/brand/brand.router';
import { CartRoutes } from './src/modules/cart/cart.router';
import { CategoryRoutes } from './src/modules/category/category.router';
import { MediaRoutes } from './src/modules/media/media.router';
import { CouponRoutes } from './src/modules/coupon/coupon.router';
import { OrderRoutes } from './src/modules/order/order.router';
import { PaymentRoutes } from './src/modules/payment/payment.router';
import { ProductRoutes } from './src/modules/product/product.router';
import { UserAddressRoutes } from './src/modules/userAddress/userAddress.router';
import { UserRoutes } from './src/modules/user/user.router';
import { WishlistRoutes } from './src/modules/wishlist/wishlist.router';
import { VariantRoutes } from './src/modules/variant/variant.router';
import { StaffPayrollRoutes } from './src/modules/staffPayroll/staffPayroll.router';
import { AnalyticsRoutes } from './src/modules/analytics/analytics.router';
import { ExpenseRoutes } from './src/modules/expense/expense.router';
import { connectDB } from './src/lib/db';

const app = express();

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/+$/, '');
}

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const allowsVercelPreviews = allowedOrigins.some((origin) => origin.includes('.vercel.app'));

function isOriginAllowed(origin: string) {
  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.includes(normalized)) return true;
  if (allowsVercelPreviews && normalized.endsWith('.vercel.app')) return true;
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      // Server-to-server, curl, health checks — no Origin header
      if (!origin) {
        callback(null, true);
        return;
      }
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});
app.use('/api/v1/user', UserRoutes);
app.use('/api/v1/address', UserAddressRoutes);
app.use('/api/v1/wishlist', WishlistRoutes);
app.use('/api/v1/cart', CartRoutes);
app.use('/api/v1/media', MediaRoutes);
app.use('/api/v1/product', ProductRoutes);
app.use('/api/v1/order', OrderRoutes);
app.use('/api/v1/coupon', CouponRoutes);
app.use('/api/v1/payment', PaymentRoutes);
app.use('/api/v1/brand', BrandRoutes);
app.use('/api/v1/category', CategoryRoutes);
app.use('/api/v1/settings', SettingsRoutes);
app.use('/api/v1/collection', CollectionRoutes);
app.use('/api/v1/attribute', AttributeRoutes);
app.use('/api/v1/variant', VariantRoutes);
app.use('/api/v1/staff/payroll', StaffPayrollRoutes);
app.use('/api/v1/analytics', AnalyticsRoutes);
app.use('/api/v1/expense', ExpenseRoutes);

import AppError from './src/errors/AppError';
// 404 handler for unknown routes
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

import globalErrorHandler from './src/middlewares/globalErrorHandler';
app.use(globalErrorHandler);
export default app;
