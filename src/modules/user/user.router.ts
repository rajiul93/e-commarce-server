import express from 'express';
import { auth, authorize, authorizeAdminOrManager } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import {
  adminUpdateUserZodSchema,
  adminUserIdParamZodSchema,
  createStaffZodSchema,
  createUserZodSchema,
  loginZodSchema,
} from './user.zod';

const router = express.Router();

router.post(
  '/create',
  validateRequest(createUserZodSchema),
  UserController.createUser,
);

router.post('/login', validateRequest(loginZodSchema), UserController.login);

router.post('/refresh', UserController.refresh);

router.post('/logout', UserController.logout);

router.get('/me', auth, UserController.getMyProfile);

router.get(
  '/admin/:id',
  auth,
  authorize('ADMIN'),
  validateRequest(adminUserIdParamZodSchema),
  UserController.getUserAdminById,
);

router.patch(
  '/admin/:id',
  auth,
  authorize('ADMIN'),
  validateRequest(adminUpdateUserZodSchema),
  UserController.updateUserAdmin,
);

router.get('/staff', auth, authorizeAdminOrManager, UserController.listStaff);

router.post(
  '/staff',
  auth,
  authorizeAdminOrManager,
  validateRequest(createStaffZodSchema),
  UserController.createStaff,
);

router.get('/', auth, authorizeAdminOrManager, UserController.getAllUsers);

export const UserRoutes = router;
