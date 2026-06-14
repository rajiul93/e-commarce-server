import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { WishlistController } from './wishlist.controller';
import { addWishlistZodSchema, wishlistItemIdParamsZodSchema } from './wishlist.zod';

const router = express.Router();

router.get('/', auth, WishlistController.listWishlist);

router.post(
  '/',
  auth,
  validateRequest(addWishlistZodSchema),
  WishlistController.addToWishlist,
);

router.delete(
  '/:id',
  auth,
  validateRequest(wishlistItemIdParamsZodSchema),
  WishlistController.removeFromWishlist,
);

export const WishlistRoutes = router;
