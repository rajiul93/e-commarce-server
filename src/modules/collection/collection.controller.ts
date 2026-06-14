import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CollectionService } from './collection.service';

const createCollection = catchAsync(async (req: Request, res: Response) => {
  const result = await CollectionService.createCollectionIntoDB(req.body);
  return sendResponse(res, httpStatus.CREATED, 'Collection created successfully', result);
});

const listCollections = catchAsync(async (req: Request, res: Response) => {
  const forHome = req.query.forHome === 'true';
  const result = await CollectionService.listCollectionsFromDB(forHome);
  return sendResponse(res, httpStatus.OK, 'Collections retrieved successfully', result);
});

const listAllCollectionsAdmin = catchAsync(async (_req: Request, res: Response) => {
  const result = await CollectionService.listAllCollectionsAdminFromDB();
  return sendResponse(res, httpStatus.OK, 'Collections retrieved successfully', result);
});

const getCollectionById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await CollectionService.getCollectionByIdFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Collection retrieved successfully', result);
});

const updateCollection = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await CollectionService.updateCollectionInDB(id, req.body);
  return sendResponse(res, httpStatus.OK, 'Collection updated successfully', result);
});

const deleteCollection = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await CollectionService.deleteCollectionFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Collection deleted successfully', result);
});

export const CollectionController = {
  createCollection,
  listCollections,
  listAllCollectionsAdmin,
  getCollectionById,
  updateCollection,
  deleteCollection,
};
