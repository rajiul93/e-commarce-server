import express from 'express';
import { auth, authorizeAdminOrManager, authorizeStaff } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { ProductController } from './product.controller';
import {
  createProductZodSchema,
  listProductsQueryZodSchema,
  posSearchQueryZodSchema,
  productIdParamZodSchema,
  productSlugParamZodSchema,
  updateProductZodSchema,
} from './product.zod';

const router = express.Router();

/** Public catalogue (SSG-friendly) */
router.get('/', validateRequest(listProductsQueryZodSchema), ProductController.listActiveProducts);
router.get('/slugs', ProductController.listProductSlugs);
router.get(
  '/pos-search',
  auth,
  authorizeStaff,
  validateRequest(posSearchQueryZodSchema),
  ProductController.posSearchProducts,
);
router.get(
  '/by-slug/:slug',
  validateRequest(productSlugParamZodSchema),
  ProductController.getProductBySlug,
);

router.get(
  '/admin/all',
  auth,
  authorizeAdminOrManager,
  ProductController.listAllProductsAdmin,
);

router.post(
  '/',
  auth,
  authorizeAdminOrManager,
  validateRequest(createProductZodSchema),
  ProductController.createProduct,
);

router.get(
  '/:id',
  validateRequest(productIdParamZodSchema),
  ProductController.getProductById,
);

router.patch(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(updateProductZodSchema),
  ProductController.updateProduct,
);

router.delete(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(productIdParamZodSchema),
  ProductController.deleteProduct,
);

export const ProductRoutes = router;
