import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { CreateUserAddressPayload } from './userAddress.service';
import { UserAddressService } from './userAddress.service';

const listAddresses = catchAsync(async (req: Request, res: Response) => {
  const result = await UserAddressService.listAddressesFromDB(req.user!.userId);
  return sendResponse(res, httpStatus.OK, 'Addresses retrieved successfully', result);
});

const createAddress = catchAsync(async (req: Request, res: Response) => {
  const result = await UserAddressService.createAddressIntoDB(
    req.user!.userId,
    req.body as CreateUserAddressPayload,
  );
  return sendResponse(res, httpStatus.CREATED, 'Address created successfully', result);
});

const updateAddress = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await UserAddressService.updateAddressInDB(req.user!.userId, id, req.body);
  return sendResponse(res, httpStatus.OK, 'Address updated successfully', result);
});

const deleteAddress = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await UserAddressService.deleteAddressFromDB(req.user!.userId, id);
  return sendResponse(res, httpStatus.OK, 'Address deleted successfully', null);
});

export const UserAddressController = {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};
