import express from 'express';
import { auth, authorizeAdminOrManager } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { AttributeController } from './attribute.controller';
import {
  attributeIdParamsZodSchema,
  createAttributeZodSchema,
  updateAttributeZodSchema,
} from './attribute.zod';

const router = express.Router();

router.get('/', auth, AttributeController.getAllAttributes);

router.get(
  '/:id',
  auth,
  validateRequest(attributeIdParamsZodSchema),
  AttributeController.getAttributeById,
);

router.post(
  '/',
  auth,
  authorizeAdminOrManager,
  validateRequest(createAttributeZodSchema),
  AttributeController.createAttribute,
);

router.patch(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(updateAttributeZodSchema),
  AttributeController.updateAttribute,
);

router.delete(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(attributeIdParamsZodSchema),
  AttributeController.deleteAttribute,
);

export const AttributeRoutes = router;
