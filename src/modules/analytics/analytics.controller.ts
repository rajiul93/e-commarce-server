import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AnalyticsService } from './analytics.service';

const getDashboard = catchAsync(async (req: Request, res: Response) => {
  const raw = req.query.period;
  const period =
    raw === 'week' || raw === 'month' || raw === 'year' ? raw : 'month';
  const result = await AnalyticsService.getDashboardAnalyticsFromDB(period);
  return sendResponse(res, httpStatus.OK, 'Dashboard analytics retrieved', result);
});

const listIncome = catchAsync(async (req: Request, res: Response) => {
  const raw = req.query.period;
  const period =
    raw === 'week' || raw === 'month' || raw === 'year' ? raw : 'month';
  const result = await AnalyticsService.listIncomeOrdersFromDB(period);
  return sendResponse(res, httpStatus.OK, 'Income orders retrieved', result);
});

export const AnalyticsController = {
  getDashboard,
  listIncome,
};
