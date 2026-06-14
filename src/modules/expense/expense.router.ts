import express from 'express';
import { auth, authorize, authorizeAdminOrManager } from '../../middlewares/auth.middleware';
import validateRequest from '../../middlewares/validateRequest';
import { ExpenseController } from './expense.controller';
import {
  createExpenseTypeZodSchema,
  createExpenseZodSchema,
  expenseIdParamZodSchema,
  expenseTypeIdParamZodSchema,
  listExpenseZodSchema,
  updateExpenseTypeZodSchema,
} from './expense.zod';

const router = express.Router();

router.post(
  '/types',
  auth,
  authorize('ADMIN'),
  validateRequest(createExpenseTypeZodSchema),
  ExpenseController.createExpenseType,
);

router.get('/types', auth, authorizeAdminOrManager, ExpenseController.listExpenseTypes);

router.patch(
  '/types/:id',
  auth,
  authorize('ADMIN'),
  validateRequest(updateExpenseTypeZodSchema),
  ExpenseController.updateExpenseType,
);

router.delete(
  '/types/:id',
  auth,
  authorize('ADMIN'),
  validateRequest(expenseTypeIdParamZodSchema),
  ExpenseController.deleteExpenseType,
);

router.post(
  '/',
  auth,
  authorizeAdminOrManager,
  validateRequest(createExpenseZodSchema),
  ExpenseController.createExpense,
);

router.get(
  '/',
  auth,
  authorizeAdminOrManager,
  validateRequest(listExpenseZodSchema),
  ExpenseController.listExpenses,
);

router.delete(
  '/:id',
  auth,
  authorizeAdminOrManager,
  validateRequest(expenseIdParamZodSchema),
  ExpenseController.deleteExpense,
);

export const ExpenseRoutes = router;
