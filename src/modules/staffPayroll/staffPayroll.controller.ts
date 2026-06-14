import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { StaffPayrollService } from './staffPayroll.service';

const upsertPayroll = catchAsync(async (req: Request, res: Response) => {
  const result = await StaffPayrollService.upsertPayrollIntoDB(req.body);
  return sendResponse(res, httpStatus.OK, 'Payroll saved successfully', result);
});

const listPayroll = catchAsync(async (req: Request, res: Response) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  const result = await StaffPayrollService.listPayrollFromDB(year, month);
  return sendResponse(res, httpStatus.OK, 'Payroll retrieved successfully', result);
});

const getStaffPayrollHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.params.userId);
  const result = await StaffPayrollService.listPayrollByUserFromDB(userId);
  return sendResponse(res, httpStatus.OK, 'Staff payroll history retrieved', result);
});

const getMyPayroll = catchAsync(async (req: Request, res: Response) => {
  const result = await StaffPayrollService.getMyPayrollFromDB(req.user!.userId);
  return sendResponse(res, httpStatus.OK, 'Your payroll profile retrieved', result);
});

export const StaffPayrollController = {
  upsertPayroll,
  listPayroll,
  getStaffPayrollHistory,
  getMyPayroll,
};
