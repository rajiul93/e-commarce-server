import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { AttributeCreateInput } from './attribute.interface';
import { AttributeService } from './attribute.service';

const createAttribute = catchAsync(async (req: Request, res: Response) => {
  const result = await AttributeService.createAttributeIntoDB(req.body as AttributeCreateInput);
  return sendResponse(res, httpStatus.CREATED, 'Attribute created successfully', result);
});

const getAllAttributes = catchAsync(async (_req: Request, res: Response) => {
  const result = await AttributeService.getAllAttributesFromDB();
  return sendResponse(res, httpStatus.OK, 'Attributes retrieved successfully', result);
});

const getAttributeById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await AttributeService.getAttributeByIdFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Attribute retrieved successfully', result);
});

const updateAttribute = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await AttributeService.updateAttributeInDB(id, req.body);
  return sendResponse(res, httpStatus.OK, 'Attribute updated successfully', result);
});

const deleteAttribute = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await AttributeService.deleteAttributeFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Attribute deleted successfully', null);
});

export const AttributeController = {
  createAttribute,
  getAllAttributes,
  getAttributeById,
  updateAttribute,
  deleteAttribute,
};
