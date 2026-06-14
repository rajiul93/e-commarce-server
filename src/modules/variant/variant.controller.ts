import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { Variant } from './variant.interface';
import { VariantService } from './variant.service';

const createVariant = catchAsync(async (req: Request, res: Response) => {
  const body = req.body as Omit<Variant, '_id'> & Partial<Pick<Variant, 'status'>>;
  const result = await VariantService.createVariantIntoDB(body);
  return sendResponse(res, httpStatus.CREATED, 'Variant created successfully', result);
});

const getAllVariants = catchAsync(async (req: Request, res: Response) => {
  const productId =
    typeof req.query.productId === 'string' && req.query.productId.trim() !== ''
      ? req.query.productId.trim()
      : undefined;
  const result = await VariantService.getAllVariantsFromDB(productId);
  return sendResponse(res, httpStatus.OK, 'Variants retrieved successfully', result);
});

const getVariantById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await VariantService.getVariantByIdFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Variant retrieved successfully', result);
});

const updateVariant = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await VariantService.updateVariantInDB(id, req.body);
  return sendResponse(res, httpStatus.OK, 'Variant updated successfully', result);
});

const deleteVariant = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await VariantService.deleteVariantFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Variant deleted successfully', null);
});

export const VariantController = {
  createVariant,
  getAllVariants,
  getVariantById,
  updateVariant,
  deleteVariant,
};
