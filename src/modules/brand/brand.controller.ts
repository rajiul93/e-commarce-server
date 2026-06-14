import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { BrandService } from './brand.service';

const createBrand = catchAsync(async (req: Request, res: Response) => {
  const result = await BrandService.createBrandIntoDB(req.body);
  return sendResponse(res, httpStatus.CREATED, 'Brand created successfully', result);
});

const getAllBrands = catchAsync(async (_req: Request, res: Response) => {
  const result = await BrandService.getAllBrandsFromDB();
  return sendResponse(res, httpStatus.OK, 'Brands retrieved successfully', result);
});

const getBrandById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await BrandService.getBrandByIdFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Brand retrieved successfully', result);
});

const updateBrand = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await BrandService.updateBrandInDB(id, req.body);
  return sendResponse(res, httpStatus.OK, 'Brand updated successfully', result);
});

const deleteBrand = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await BrandService.deleteBrandFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Brand deleted successfully', null);
});

export const BrandController = {
  createBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
};
