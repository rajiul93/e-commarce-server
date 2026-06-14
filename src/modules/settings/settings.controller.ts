import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { SettingsService } from './settings.service';

const getOrderSettings = catchAsync(async (_req: Request, res: Response) => {
  const result = await SettingsService.getOrderSettingsFromDB();
  return sendResponse(res, httpStatus.OK, 'Order settings retrieved', result);
});

const updateOrderSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingsService.updateOrderSettingsInDB(req.body);
  return sendResponse(res, httpStatus.OK, 'Order settings updated', result);
});

const getHeroSettings = catchAsync(async (_req: Request, res: Response) => {
  const result = await SettingsService.getHeroSettingsFromDB();
  return sendResponse(res, httpStatus.OK, 'Home hero settings retrieved', result);
});

const updateHeroSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingsService.updateHeroSettingsInDB(req.body);
  return sendResponse(res, httpStatus.OK, 'Home hero settings updated', result);
});

const getStaffSettings = catchAsync(async (_req: Request, res: Response) => {
  const result = await SettingsService.getStaffSettingsFromDB();
  return sendResponse(res, httpStatus.OK, 'Staff settings retrieved', result);
});

const updateStaffSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingsService.updateStaffSettingsInDB(req.body);
  return sendResponse(res, httpStatus.OK, 'Staff settings updated', result);
});

const getBrandingSettings = catchAsync(async (_req: Request, res: Response) => {
  const result = await SettingsService.getBrandingSettingsFromDB();
  return sendResponse(res, httpStatus.OK, 'Branding settings retrieved', result);
});

const updateBrandingSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await SettingsService.updateBrandingSettingsInDB(req.body);
  return sendResponse(res, httpStatus.OK, 'Branding settings updated', result);
});

export const SettingsController = {
  getOrderSettings,
  updateOrderSettings,
  getHeroSettings,
  updateHeroSettings,
  getStaffSettings,
  updateStaffSettings,
  getBrandingSettings,
  updateBrandingSettings,
};
