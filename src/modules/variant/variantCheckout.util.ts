import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { VariantModel } from './variant.model';

const assertValidObjectId = (id: string): void => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid id', httpStatus.BAD_REQUEST);
  }
};

/**
 * Resolves the variant for checkout / pricing (cart preview, orders).
 * If `variantIdRaw` is set it must belong to `productMongoId`; otherwise exactly one active variant must exist on the product.
 */
export const resolveVariantForProductCheckout = async (
  productMongoId: Types.ObjectId,
  variantIdRaw?: string | null,
) => {
  if (variantIdRaw?.trim()) {
    assertValidObjectId(variantIdRaw);
    const v = await VariantModel.findOne({
      _id: new Types.ObjectId(variantIdRaw),
      productId: productMongoId,
      status: 'active',
    }).exec();
    if (!v) {
      throw new AppError(
        'Variant not found or inactive for this product',
        httpStatus.BAD_REQUEST,
      );
    }
    return v;
  }

  const list = await VariantModel.find({
    productId: productMongoId,
    status: 'active',
  }).exec();

  if (list.length === 0) {
    throw new AppError('Product has no active variant for checkout', httpStatus.BAD_REQUEST);
  }

  if (list.length !== 1) {
    throw new AppError(
      'Please select a variant (multiple options exist for one or more items)',
      httpStatus.BAD_REQUEST,
    );
  }

  return list[0];
};
