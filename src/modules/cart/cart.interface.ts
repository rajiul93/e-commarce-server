import { Types } from 'mongoose';

export interface ICartItem {
  _id?: Types.ObjectId;
  productId: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  quantity: number;
  /** Checkbox for checkout inclusion; omit/undefined treated as selected (legacy carts). */
  isSelected?: boolean;
}

export interface ICart {
  userId: Types.ObjectId;
  items: ICartItem[];
}
