import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { AddCartItemPayload, CheckoutPreviewPayload } from './cart.service';
import { CartService } from './cart.service';

const getCart = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.getCartFromDB(req.user!.userId);
  return sendResponse(res, httpStatus.OK, 'Cart retrieved successfully', result);
});

const addItem = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.addItemToCartIntoDB(
    req.user!.userId,
    req.body as AddCartItemPayload,
  );
  return sendResponse(res, httpStatus.OK, 'Cart updated successfully', result);
});

const updateLineQty = catchAsync(async (req: Request, res: Response) => {
  const { lineId } = req.params as { lineId: string };
  const body = req.body as { quantity?: number; isSelected?: boolean };
  const result = await CartService.updateCartLineInDB(req.user!.userId, lineId, {
    ...(body.quantity !== undefined ? { quantity: body.quantity } : {}),
    ...(body.isSelected !== undefined ? { isSelected: body.isSelected } : {}),
  });
  return sendResponse(res, httpStatus.OK, 'Cart updated successfully', result);
});

const removeLine = catchAsync(async (req: Request, res: Response) => {
  const { lineId } = req.params as { lineId: string };
  const result = await CartService.removeCartLineFromDB(req.user!.userId, lineId);
  return sendResponse(res, httpStatus.OK, 'Cart updated successfully', result);
});

const checkoutPreview = catchAsync(async (req: Request, res: Response) => {
  const result = await CartService.getCheckoutPreviewFromDB(req.user!.userId, req.body as CheckoutPreviewPayload);
  return sendResponse(res, httpStatus.OK, 'Checkout totals calculated', result);
});

export const CartController = {
  getCart,
  addItem,
  updateLineQty,
  removeLine,
  checkoutPreview,
};
