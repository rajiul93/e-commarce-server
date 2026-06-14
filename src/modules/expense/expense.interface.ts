import { Types } from 'mongoose';

export interface IExpenseType {
  name: string;
  isActive: boolean;
  createdBy: Types.ObjectId;
}

export interface IExpense {
  typeId: Types.ObjectId;
  description: string;
  amount: number;
  imageId?: Types.ObjectId;
  expenseDate: Date;
  createdBy: Types.ObjectId;
}
