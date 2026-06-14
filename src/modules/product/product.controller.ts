import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import type { ProductCreatePayload, ProductUpdatePayload } from './product.service';
import { ProductService } from './product.service';

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.createProductIntoDB(req.body as ProductCreatePayload);
  return sendResponse(res, httpStatus.CREATED, 'Product created successfully', result);
});

const listActiveProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.listActiveProductsFromDB({
    category: req.query.category as string | undefined,
    brand: req.query.brand as string | undefined,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
    minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
    sort: req.query.sort as
      | 'newest'
      | 'price_asc'
      | 'price_desc'
      | 'rating_asc'
      | 'rating_desc'
      | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  return sendResponse(res, httpStatus.OK, 'Products retrieved successfully', result);
});

const listProductSlugs = catchAsync(async (_req: Request, res: Response) => {
  const result = await ProductService.getActiveProductSlugsFromDB();
  return sendResponse(res, httpStatus.OK, 'Product slugs retrieved successfully', result);
});

const getProductBySlug = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string };
  const result = await ProductService.getActiveProductBySlugFromDB(slug);
  return sendResponse(res, httpStatus.OK, 'Product retrieved successfully', result);
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ProductService.getActiveProductByIdFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Product retrieved successfully', result);
});

const listAllProductsAdmin = catchAsync(async (_req: Request, res: Response) => {
  const result = await ProductService.listAllProductsAdminFromDB();
  return sendResponse(res, httpStatus.OK, 'Products retrieved successfully', result);
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ProductService.updateProductInDB(id, req.body as ProductUpdatePayload);
  return sendResponse(res, httpStatus.OK, 'Product updated successfully', result);
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ProductService.deleteProductFromDB(id);
  return sendResponse(res, httpStatus.OK, 'Product deleted successfully', result);
});

const posSearchProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.posSearchProductsFromDB({
    q: req.query.q as string | undefined,
    sku: req.query.sku as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
  });
  return sendResponse(res, httpStatus.OK, 'Products retrieved successfully', result);
});

export const ProductController = {
  createProduct,
  listActiveProducts,
  listProductSlugs,
  getProductBySlug,
  getProductById,
  listAllProductsAdmin,
  updateProduct,
  deleteProduct,
  posSearchProducts,
};
