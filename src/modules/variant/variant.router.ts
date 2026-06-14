import express from 'express';
import { auth, authorizeAdminOrManager } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { VariantController } from './variant.controller';
import {
  createVariantZodSchema,
  listVariantsQueryZodSchema,
  updateVariantZodSchema,
  variantIdParamsZodSchema,
} from './variant.zod';

const router = express.Router();

router.get(
  '/',
  auth,
  validateRequest(listVariantsQueryZodSchema),
  VariantController.getAllVariants,
);

router.get(
  '/:id',
  auth,
  validateRequest(variantIdParamsZodSchema),
  VariantController.getVariantById,
);

router.post(
  '/',
  auth,
  authorizeAdminOrManager,
  validateRequest(createVariantZodSchema),
  VariantController.createVariant,
);

router.patch(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(updateVariantZodSchema),
  VariantController.updateVariant,
);

router.delete(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(variantIdParamsZodSchema),
  VariantController.deleteVariant,
);

export const VariantRoutes = router;
