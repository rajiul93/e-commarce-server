import { Types } from 'mongoose';

export interface ICollection {
  name: string;
  slug: string;
  banner?: Types.ObjectId;
  products: Types.ObjectId[];
  showBannerOnHome: boolean;
  sortOrder: number;
  isActive: boolean;
}
