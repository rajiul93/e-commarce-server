import express from 'express';
import { auth, authorize } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { SettingsController } from './settings.controller';
import { updateBrandingSettingsZodSchema, updateHeroSettingsZodSchema, updateOrderSettingsZodSchema, updateStaffSettingsZodSchema } from './settings.zod';

const router = express.Router();

router.get('/order', SettingsController.getOrderSettings);

router.patch(
  '/order',
  auth,
  authorize('ADMIN'),
  validateRequest(updateOrderSettingsZodSchema),
  SettingsController.updateOrderSettings,
);

router.get('/home-hero', SettingsController.getHeroSettings);

router.patch(
  '/home-hero',
  auth,
  authorize('ADMIN'),
  validateRequest(updateHeroSettingsZodSchema),
  SettingsController.updateHeroSettings,
);

router.get('/staff', auth, authorize('ADMIN'), SettingsController.getStaffSettings);

router.patch(
  '/staff',
  auth,
  authorize('ADMIN'),
  validateRequest(updateStaffSettingsZodSchema),
  SettingsController.updateStaffSettings,
);

router.get('/branding', SettingsController.getBrandingSettings);

router.patch(
  '/branding',
  auth,
  authorize('ADMIN'),
  validateRequest(updateBrandingSettingsZodSchema),
  SettingsController.updateBrandingSettings,
);

export const SettingsRoutes = router;
