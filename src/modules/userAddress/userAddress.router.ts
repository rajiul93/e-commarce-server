import express from 'express';
import { auth } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { UserAddressController } from './userAddress.controller';
import {
  createUserAddressZodSchema,
  updateUserAddressZodSchema,
  userAddressIdParamsZodSchema,
} from './userAddress.zod';

const router = express.Router();

router.get('/', auth, UserAddressController.listAddresses);

router.post(
  '/',
  auth,
  validateRequest(createUserAddressZodSchema),
  UserAddressController.createAddress,
);

router.patch(
  '/:id',
  auth,
  validateRequest(updateUserAddressZodSchema),
  UserAddressController.updateAddress,
);

router.delete(
  '/:id',
  auth,
  validateRequest(userAddressIdParamsZodSchema),
  UserAddressController.deleteAddress,
);

export const UserAddressRoutes = router;
