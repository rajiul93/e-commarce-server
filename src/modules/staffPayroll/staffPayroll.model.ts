import { Schema, model, Model } from 'mongoose';
import type { IStaffPayroll } from './staffPayroll.interface';

export type StaffPayrollModelType = Model<IStaffPayroll>;

const staffPayrollSchema = new Schema<IStaffPayroll, StaffPayrollModelType>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    year: { type: Number, required: true, min: 2000, max: 2100 },
    month: { type: Number, required: true, min: 1, max: 12 },
    monthlySalary: { type: Number, required: true, min: 0 },
    presentDays: { type: Number, required: true, min: 0 },
    workingDaysInMonth: { type: Number, required: true, min: 1 },
    calculatedPay: { type: Number, required: true, min: 0 },
    bonusType: { type: String, enum: ['fixed', 'percent'], required: false },
    bonusValue: { type: Number, min: 0, required: false },
    bonusAmount: { type: Number, required: true, min: 0, default: 0 },
    totalPay: { type: Number, required: true, min: 0 },
    workRating: { type: Number, min: 1, max: 5, required: false },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

staffPayrollSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });
staffPayrollSchema.index({ year: 1, month: 1 });

export const StaffPayroll = model<IStaffPayroll, StaffPayrollModelType>(
  'StaffPayroll',
  staffPayrollSchema,
);
