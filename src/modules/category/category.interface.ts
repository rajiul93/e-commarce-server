import { Types } from 'mongoose';

export interface ICategory {
  userId: Types.ObjectId;
  categoryName: string;
  description?: string;
  image?: Types.ObjectId;
  parentCategory?: Types.ObjectId | null;
  slug?: string;
  level?: number;
  isDeleted?: boolean;
  deletedAt?: Date | null;
}
