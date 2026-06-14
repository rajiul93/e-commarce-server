import { HydratedDocument, Model, Types } from 'mongoose';

export type UserRole = 'USER' | 'ADMIN' | 'MANAGER' | 'SELLER';

export const STAFF_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'SELLER'];

export interface IUser {
  name: string;
  role: UserRole;
  age?: string;
  otp?: string;
  isVerified?: boolean;
  phone?: string;
  profileImage?: Types.ObjectId;
  /** National ID number — admin managed */
  nid?: string;
  email: string;
  password: string;
  isDeleted?: boolean;
  isActive?: boolean;
  /** Staff account creator (manager/admin) */
  createdBy?: Types.ObjectId;
  /** Base monthly salary for payroll */
  monthlySalary?: number;
}

export interface UserModel extends Model<IUser> {
  isUserExistsByEmail(
    email: string,
  ): Promise<(HydratedDocument<IUser> & { password?: string }) | null>;
}
