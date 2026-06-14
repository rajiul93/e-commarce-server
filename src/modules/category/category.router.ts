import express from 'express';
import { auth, authorizeAdminOrManager } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { CategoryController } from './category.controller';
import {
  categoryIdParamZodSchema,
  createCategoryZodSchema,
  updateCategoryZodSchema,
} from './category.validation';

const router = express.Router();

router.post(
  '/create',
  auth,
  authorizeAdminOrManager,
  validateRequest(createCategoryZodSchema),
  CategoryController.createCategory,
);

/** Public catalogue */
router.get('/', CategoryController.getAllCategories);

router.get(
  '/:id',
  validateRequest(categoryIdParamZodSchema),
  CategoryController.getCategoryById,
);

router.patch(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(updateCategoryZodSchema),
  CategoryController.updateCategory,
);

router.delete(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(categoryIdParamZodSchema),
  CategoryController.deleteCategory,
);

export const CategoryRoutes = router;
