import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { WishlistService } from './wishlist.service';

const addToWishlist = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.body as { productId: string };
  const result = await WishlistService.addToWishlistIntoDB(req.user!.userId, productId);
  return sendResponse(res, httpStatus.CREATED, 'Added to wishlist', result);
});

const listWishlist = catchAsync(async (req: Request, res: Response) => {
  const result = await WishlistService.listWishlistFromDB(req.user!.userId);
  return sendResponse(res, httpStatus.OK, 'Wishlist retrieved successfully', result);
});

const removeFromWishlist = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await WishlistService.removeWishlistItemFromDB(req.user!.userId, id);
  return sendResponse(res, httpStatus.OK, 'Removed from wishlist', null);
});

export const WishlistController = {
  addToWishlist,
  listWishlist,
  removeFromWishlist,
};
