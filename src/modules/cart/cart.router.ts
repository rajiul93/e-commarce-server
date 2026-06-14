import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { CartController } from './cart.controller';
import {
  addCartItemZodSchema,
  cartLineIdParamsZodSchema,
  checkoutPreviewZodSchema,
  patchCartLineZodSchema,
} from './cart.zod';

const router = express.Router();

router.get('/', auth, CartController.getCart);

router.post(
  '/checkout-preview',
  auth,
  validateRequest(checkoutPreviewZodSchema),
  CartController.checkoutPreview,
);

router.post(
  '/items',
  auth,
  validateRequest(addCartItemZodSchema),
  CartController.addItem,
);

router.patch(
  '/items/:lineId',
  auth,
  validateRequest(patchCartLineZodSchema),
  CartController.updateLineQty,
);

router.delete(
  '/items/:lineId',
  auth,
  validateRequest(cartLineIdParamsZodSchema),
  CartController.removeLine,
);

export const CartRoutes = router;
