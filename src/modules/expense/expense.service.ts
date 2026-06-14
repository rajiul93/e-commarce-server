import httpStatus from 'http-status';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import type { AnalyticsPeriod } from '../analytics/analytics.service';
import { Image } from '../media/image.model';
import { Expense, ExpenseType } from './expense.model';

function getPeriodRange(period: AnalyticsPeriod): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);

  if (period === 'week') {
    start.setDate(start.getDate() - 6);
    return { start, end };
  }
  if (period === 'month') {
    start.setDate(start.getDate() - 29);
    return { start, end };
  }
  start.setFullYear(start.getFullYear() - 1);
  start.setDate(1);
  return { start, end };
}

const createExpenseTypeIntoDB = async (name: string, adminUserId: string) => {
  const trimmed = name.trim();
  const exists = await ExpenseType.findOne({ name: new RegExp(`^${trimmed}$`, 'i') }).lean().exec();
  if (exists) {
    throw new AppError('Expense type already exists', httpStatus.CONFLICT);
  }
  return ExpenseType.create({
    name: trimmed,
    isActive: true,
    createdBy: new Types.ObjectId(adminUserId),
  });
};

const listExpenseTypesFromDB = async (activeOnly = false) => {
  return ExpenseType.find(activeOnly ? { isActive: true } : {})
    .sort({ name: 1 })
    .lean()
    .exec();
};

const updateExpenseTypeInDB = async (
  id: string,
  patch: { name?: string; isActive?: boolean },
) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid expense type id', httpStatus.BAD_REQUEST);
  }
  const doc = await ExpenseType.findById(id).exec();
  if (!doc) {
    throw new AppError('Expense type not found', httpStatus.NOT_FOUND);
  }
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    const dup = await ExpenseType.findOne({
      _id: { $ne: doc._id },
      name: new RegExp(`^${trimmed}$`, 'i'),
    })
      .lean()
      .exec();
    if (dup) {
      throw new AppError('Expense type already exists', httpStatus.CONFLICT);
    }
    doc.name = trimmed;
  }
  if (patch.isActive !== undefined) {
    doc.isActive = patch.isActive;
  }
  await doc.save();
  return doc.toObject();
};

const deleteExpenseTypeFromDB = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid expense type id', httpStatus.BAD_REQUEST);
  }
  const used = await Expense.exists({ typeId: new Types.ObjectId(id) }).exec();
  if (used) {
    throw new AppError('Cannot delete type that has expenses', httpStatus.BAD_REQUEST);
  }
  const doc = await ExpenseType.findByIdAndDelete(id).lean().exec();
  if (!doc) {
    throw new AppError('Expense type not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const createExpenseIntoDB = async (
  payload: {
    typeId: string;
    description: string;
    amount: number;
    imageId?: string;
    expenseDate?: string;
  },
  userId: string,
) => {
  if (!Types.ObjectId.isValid(payload.typeId)) {
    throw new AppError('Invalid expense type', httpStatus.BAD_REQUEST);
  }
  const type = await ExpenseType.findById(payload.typeId).exec();
  if (!type || !type.isActive) {
    throw new AppError('Expense type not found', httpStatus.NOT_FOUND);
  }
  if (payload.imageId) {
    if (!Types.ObjectId.isValid(payload.imageId)) {
      throw new AppError('Invalid image id', httpStatus.BAD_REQUEST);
    }
    const img = await Image.findById(payload.imageId).select('_id').lean().exec();
    if (!img) {
      throw new AppError('Image not found', httpStatus.BAD_REQUEST);
    }
  }

  const doc = await Expense.create({
    typeId: new Types.ObjectId(payload.typeId),
    description: payload.description.trim(),
    amount: payload.amount,
    ...(payload.imageId ? { imageId: new Types.ObjectId(payload.imageId) } : {}),
    expenseDate: payload.expenseDate ? new Date(payload.expenseDate) : new Date(),
    createdBy: new Types.ObjectId(userId),
  });

  return Expense.findById(doc._id)
    .populate({ path: 'typeId', select: 'name isActive' })
    .populate({ path: 'imageId', select: 'url alt name' })
    .populate({ path: 'createdBy', select: 'name email' })
    .lean()
    .exec();
};

const listExpensesFromDB = async (period?: AnalyticsPeriod) => {
  const filter: Record<string, unknown> = {};
  if (period) {
    const { start, end } = getPeriodRange(period);
    filter.expenseDate = { $gte: start, $lte: end };
  }

  return Expense.find(filter)
    .populate({ path: 'typeId', select: 'name isActive' })
    .populate({ path: 'imageId', select: 'url alt name' })
    .populate({ path: 'createdBy', select: 'name email' })
    .sort({ expenseDate: -1 })
    .lean()
    .exec();
};

const deleteExpenseFromDB = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid expense id', httpStatus.BAD_REQUEST);
  }
  const doc = await Expense.findByIdAndDelete(id).lean().exec();
  if (!doc) {
    throw new AppError('Expense not found', httpStatus.NOT_FOUND);
  }
  return doc;
};

const sumManualExpensesInRange = async (start: Date, end: Date) => {
  const rows = await Expense.find({ expenseDate: { $gte: start, $lte: end } })
    .select('amount')
    .lean()
    .exec();
  return rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
};

export const ExpenseService = {
  createExpenseTypeIntoDB,
  listExpenseTypesFromDB,
  updateExpenseTypeInDB,
  deleteExpenseTypeFromDB,
  createExpenseIntoDB,
  listExpensesFromDB,
  deleteExpenseFromDB,
  sumManualExpensesInRange,
};
