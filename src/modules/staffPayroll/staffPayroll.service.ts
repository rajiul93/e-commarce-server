import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { SettingsService } from '../settings/settings.service';
import { User } from '../user/user.model';
import type { StaffPayrollBonusType } from './staffPayroll.interface';
import { StaffPayroll } from './staffPayroll.model';

const calcBasePay = (monthlySalary: number, presentDays: number, workingDaysInMonth: number) => {
  if (workingDaysInMonth <= 0) return 0;
  return Math.round((monthlySalary / workingDaysInMonth) * presentDays);
};

const calcBonusAmount = (
  calculatedPay: number,
  bonusType?: StaffPayrollBonusType,
  bonusValue?: number,
) => {
  if (!bonusType || bonusValue == null || bonusValue <= 0) return 0;
  if (bonusType === 'fixed') return Math.round(bonusValue);
  return Math.round((calculatedPay * bonusValue) / 100);
};

export type UpsertPayrollPayload = {
  userId: string;
  year: number;
  month: number;
  presentDays: number;
  workingDaysInMonth?: number;
  monthlySalary?: number;
  bonusType?: StaffPayrollBonusType;
  bonusValue?: number;
  workRating?: number;
  notes?: string;
};

const upsertPayrollIntoDB = async (payload: UpsertPayrollPayload) => {
  if (!Types.ObjectId.isValid(payload.userId)) {
    throw new AppError('Invalid staff id', httpStatus.BAD_REQUEST);
  }

  const staff = await User.findById(payload.userId).select('role monthlySalary name email').lean().exec();
  if (!staff || !['MANAGER', 'SELLER'].includes(staff.role)) {
    throw new AppError('Staff member not found', httpStatus.NOT_FOUND);
  }

  const staffSettings = await SettingsService.getStaffSettingsFromDB();
  const workingDaysInMonth = payload.workingDaysInMonth ?? staffSettings.workingDaysPerMonth;
  const monthlySalary = payload.monthlySalary ?? staff.monthlySalary ?? 0;

  if (payload.presentDays > workingDaysInMonth) {
    throw new AppError('Present days cannot exceed working days in month', httpStatus.BAD_REQUEST);
  }

  if (payload.bonusType === 'percent' && payload.bonusValue != null && payload.bonusValue > 100) {
    throw new AppError('Bonus percent cannot exceed 100', httpStatus.BAD_REQUEST);
  }

  if (payload.workRating != null && (payload.workRating < 1 || payload.workRating > 5)) {
    throw new AppError('Work rating must be between 1 and 5', httpStatus.BAD_REQUEST);
  }

  const calculatedPay = calcBasePay(monthlySalary, payload.presentDays, workingDaysInMonth);
  const bonusAmount = calcBonusAmount(calculatedPay, payload.bonusType, payload.bonusValue);
  const totalPay = calculatedPay + bonusAmount;

  const hasBonus =
    payload.bonusType && payload.bonusValue != null && payload.bonusValue > 0;

  const updateDoc: Record<string, unknown> = {
    userId: new Types.ObjectId(payload.userId),
    year: payload.year,
    month: payload.month,
    monthlySalary,
    presentDays: payload.presentDays,
    workingDaysInMonth,
    calculatedPay,
    bonusAmount: hasBonus ? bonusAmount : 0,
      totalPay,
      ...(payload.workRating != null ? { workRating: payload.workRating } : {}),
      ...(payload.notes?.trim() ? { notes: payload.notes.trim() } : {}),
  };

  if (hasBonus) {
    updateDoc.bonusType = payload.bonusType;
    updateDoc.bonusValue = payload.bonusValue;
  }

  const doc = await StaffPayroll.findOneAndUpdate(
    {
      userId: new Types.ObjectId(payload.userId),
      year: payload.year,
      month: payload.month,
    },
    hasBonus
      ? updateDoc
      : {
          ...updateDoc,
          $unset: { bonusType: '', bonusValue: '' },
        },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
    .populate({ path: 'userId', select: 'name email role monthlySalary' })
    .lean()
    .exec();

  return doc;
};

const listPayrollFromDB = async (year: number, month: number) => {
  return StaffPayroll.find({ year, month })
    .populate({ path: 'userId', select: 'name email role monthlySalary' })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
};

const listPayrollByUserFromDB = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid staff id', httpStatus.BAD_REQUEST);
  }

  const staff = await User.findById(userId).select('name email role monthlySalary phone').lean().exec();
  if (!staff || !['MANAGER', 'SELLER'].includes(staff.role)) {
    throw new AppError('Staff member not found', httpStatus.NOT_FOUND);
  }

  const records = await StaffPayroll.find({ userId: new Types.ObjectId(userId) })
    .sort({ year: -1, month: -1 })
    .lean()
    .exec();

  return { staff, records };
};

const getMyPayrollFromDB = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user id', httpStatus.BAD_REQUEST);
  }

  const staff = await User.findById(userId).select('name email role monthlySalary phone').lean().exec();
  if (!staff || !['MANAGER', 'SELLER'].includes(staff.role)) {
    throw new AppError('Staff profile not found', httpStatus.NOT_FOUND);
  }

  const records = await StaffPayroll.find({ userId: new Types.ObjectId(userId) })
    .sort({ year: -1, month: -1 })
    .lean()
    .exec();

  const rated = records.filter((r) => r.workRating != null);
  const averageRating =
    rated.length > 0
      ? Math.round((rated.reduce((sum, r) => sum + (r.workRating ?? 0), 0) / rated.length) * 10) / 10
      : null;

  const totalEarned = records.reduce((sum, r) => sum + (r.totalPay ?? r.calculatedPay ?? 0), 0);
  const totalBonus = records.reduce((sum, r) => sum + (r.bonusAmount ?? 0), 0);

  return { staff, records, averageRating, totalEarned, totalBonus };
};

export const StaffPayrollService = {
  upsertPayrollIntoDB,
  listPayrollFromDB,
  listPayrollByUserFromDB,
  getMyPayrollFromDB,
};
