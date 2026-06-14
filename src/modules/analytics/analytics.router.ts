import express from 'express';
import { auth, authorizeAdminOrManager } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { AnalyticsController } from './analytics.controller';
import { dashboardAnalyticsZodSchema } from './analytics.zod';

const router = express.Router();

router.get(
  '/dashboard',
  auth,
  authorizeAdminOrManager,
  validateRequest(dashboardAnalyticsZodSchema),
  AnalyticsController.getDashboard,
);

router.get(
  '/income',
  auth,
  authorizeAdminOrManager,
  validateRequest(dashboardAnalyticsZodSchema),
  AnalyticsController.listIncome,
);

export const AnalyticsRoutes = router;
