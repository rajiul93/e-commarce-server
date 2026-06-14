import { Types } from 'mongoose';

/** Populated `image` from `Image` model */
export interface IBrand {
  brandName: string;
  image: Types.ObjectId;
}
