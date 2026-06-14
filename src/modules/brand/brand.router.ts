import express from 'express';
import { auth, authorizeAdminOrManager } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { BrandController } from './brand.controller';
import {
  brandIdParamsZodSchema,
  createBrandZodSchema,
  updateBrandZodSchema,
} from './brand.zod';

const router = express.Router();

/** Public catalogue */
router.get('/', BrandController.getAllBrands);

router.get('/:id', validateRequest(brandIdParamsZodSchema), BrandController.getBrandById);

router.post(
  '/',
  auth,
  authorizeAdminOrManager,
  validateRequest(createBrandZodSchema),
  BrandController.createBrand,
);

router.patch(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(updateBrandZodSchema),
  BrandController.updateBrand,
);

router.delete(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(brandIdParamsZodSchema),
  BrandController.deleteBrand,
);

export const BrandRoutes = router;
