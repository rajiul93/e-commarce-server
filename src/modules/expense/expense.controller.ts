import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { AnalyticsPeriod } from '../analytics/analytics.service';
import { ExpenseService } from './expense.service';

const createExpenseType = catchAsync(async (req: Request, res: Response) => {
  const result = await ExpenseService.createExpenseTypeIntoDB(req.body.name, req.user!.userId);
  return sendResponse(res, httpStatus.CREATED, 'Expense type created', result);
});

const listExpenseTypes = catchAsync(async (_req: Request, res: Response) => {
  const result = await ExpenseService.listExpenseTypesFromDB();
  return sendResponse(res, httpStatus.OK, 'Expense types retrieved', result);
});

const updateExpenseType = catchAsync(async (req: Request, res: Response) => {
  const result = await ExpenseService.updateExpenseTypeInDB(String(req.params.id), req.body);
  return sendResponse(res, httpStatus.OK, 'Expense type updated', result);
});

const deleteExpenseType = catchAsync(async (req: Request, res: Response) => {
  await ExpenseService.deleteExpenseTypeFromDB(String(req.params.id));
  return sendResponse(res, httpStatus.OK, 'Expense type deleted', null);
});

const createExpense = catchAsync(async (req: Request, res: Response) => {
  const result = await ExpenseService.createExpenseIntoDB(req.body, req.user!.userId);
  return sendResponse(res, httpStatus.CREATED, 'Expense recorded', result);
});

const listExpenses = catchAsync(async (req: Request, res: Response) => {
  const raw = req.query.period;
  const period =
    raw === 'week' || raw === 'month' || raw === 'year' ? (raw as AnalyticsPeriod) : undefined;
  const result = await ExpenseService.listExpensesFromDB(period);
  return sendResponse(res, httpStatus.OK, 'Expenses retrieved', result);
});

const deleteExpense = catchAsync(async (req: Request, res: Response) => {
  await ExpenseService.deleteExpenseFromDB(String(req.params.id));
  return sendResponse(res, httpStatus.OK, 'Expense deleted', null);
});

export const ExpenseController = {
  createExpenseType,
  listExpenseTypes,
  updateExpenseType,
  deleteExpenseType,
  createExpense,
  listExpenses,
  deleteExpense,
};
