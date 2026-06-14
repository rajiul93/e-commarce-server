import express from 'express';
import { auth, authorize, authorizeStaffProfile } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { StaffPayrollController } from './staffPayroll.controller';
import {
  listPayrollZodSchema,
  staffPayrollUserParamZodSchema,
  upsertPayrollZodSchema,
} from './staffPayroll.zod';

const router = express.Router();

router.get(
  '/',
  auth,
  authorize('ADMIN'),
  validateRequest(listPayrollZodSchema),
  StaffPayrollController.listPayroll,
);

router.get(
  '/me',
  auth,
  authorizeStaffProfile,
  StaffPayrollController.getMyPayroll,
);

router.get(
  '/user/:userId',
  auth,
  authorize('ADMIN'),
  validateRequest(staffPayrollUserParamZodSchema),
  StaffPayrollController.getStaffPayrollHistory,
);

router.post(
  '/',
  auth,
  authorize('ADMIN'),
  validateRequest(upsertPayrollZodSchema),
  StaffPayrollController.upsertPayroll,
);

export const StaffPayrollRoutes = router;
