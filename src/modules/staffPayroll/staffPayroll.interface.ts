import { Types } from 'mongoose';

export type StaffPayrollBonusType = 'fixed' | 'percent';

export interface IStaffPayroll {
  userId: Types.ObjectId;
  year: number;
  month: number;
  monthlySalary: number;
  presentDays: number;
  workingDaysInMonth: number;
  calculatedPay: number;
  bonusType?: StaffPayrollBonusType;
  bonusValue?: number;
  bonusAmount: number;
  totalPay: number;
  workRating?: number;
  notes?: string;
}
