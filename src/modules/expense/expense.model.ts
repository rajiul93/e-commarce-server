import { Schema, model, Model } from 'mongoose';
import type { IExpense, IExpenseType } from './expense.interface';

export type ExpenseTypeModelType = Model<IExpenseType>;
export type ExpenseModelType = Model<IExpense>;

const expenseTypeSchema = new Schema<IExpenseType, ExpenseTypeModelType>(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 120 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const expenseSchema = new Schema<IExpense, ExpenseModelType>(
  {
    typeId: { type: Schema.Types.ObjectId, ref: 'ExpenseType', required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    amount: { type: Number, required: true, min: 0 },
    imageId: { type: Schema.Types.ObjectId, ref: 'Image' },
    expenseDate: { type: Date, required: true, default: Date.now, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const ExpenseType = model<IExpenseType, ExpenseTypeModelType>('ExpenseType', expenseTypeSchema);
export const Expense = model<IExpense, ExpenseModelType>('Expense', expenseSchema);
