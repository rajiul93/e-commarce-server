import { Types } from 'mongoose';

export interface IUserAddress {
  userId: Types.ObjectId;
  /** Recipient name */
  name: string;
  phone: string;
  country: string;
  state: string;
  city: string;
  /** Thana / upazila-style subdivision */
  thana: string;
  /** Street, building, landmark, etc. */
  localLocation: string;
  isDefault: boolean;
}
