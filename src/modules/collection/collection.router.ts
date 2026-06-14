import express from 'express';
import { auth, authorizeAdminOrManager } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { CollectionController } from './collection.controller';
import {
  collectionIdParamZodSchema,
  createCollectionZodSchema,
  listCollectionsQueryZodSchema,
  updateCollectionZodSchema,
} from './collection.zod';

const router = express.Router();

router.get(
  '/admin/all',
  auth,
  authorizeAdminOrManager,
  CollectionController.listAllCollectionsAdmin,
);

router.post(
  '/create',
  auth,
  authorizeAdminOrManager,
  validateRequest(createCollectionZodSchema),
  CollectionController.createCollection,
);

router.get(
  '/',
  validateRequest(listCollectionsQueryZodSchema),
  CollectionController.listCollections,
);

router.get(
  '/:id',
  validateRequest(collectionIdParamZodSchema),
  CollectionController.getCollectionById,
);

router.patch(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(updateCollectionZodSchema),
  CollectionController.updateCollection,
);

router.delete(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(collectionIdParamZodSchema),
  CollectionController.deleteCollection,
);

export const CollectionRoutes = router;
