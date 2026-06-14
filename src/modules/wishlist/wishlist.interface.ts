import { Types } from 'mongoose';

export interface IWishlistEntry {
  userId: Types.ObjectId;
  productId: Types.ObjectId;
}
