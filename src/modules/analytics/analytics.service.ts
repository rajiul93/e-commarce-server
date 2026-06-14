import { Coupon } from '../coupon/coupon.model';
import { ExpenseService } from '../expense/expense.service';
import { Order } from '../order/order.model';
import { Product } from '../product/product.model';
import { StaffPayroll } from '../staffPayroll/staffPayroll.model';
import { User } from '../user/user.model';

export type AnalyticsPeriod = 'week' | 'month' | 'year';

export type SalesChartPoint = {
  label: string;
  sales: number;
  orders: number;
};

export type DashboardAnalytics = {
  period: AnalyticsPeriod;
  income: number;
  expense: number;
  profit: number;
  productCost: number;
  staffExpense: number;
  manualExpense: number;
  runningOffers: number;
  activeCoupons: number;
  totalUsers: number;
  totalStaff: number;
  salesChart: SalesChartPoint[];
};

const SALES_STATUSES = ['delivered'] as const;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function formatDayLabel(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatMonthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function getPeriodRange(period: AnalyticsPeriod): { start: Date; end: Date } {
  const end = new Date();
  const start = startOfDay(end);

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

function buildChartBuckets(period: AnalyticsPeriod, start: Date, end: Date): SalesChartPoint[] {
  if (period === 'year') {
    const buckets: SalesChartPoint[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= endMonth) {
      buckets.push({
        label: formatMonthLabel(cursor.getFullYear(), cursor.getMonth() + 1),
        sales: 0,
        orders: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }

  const days = period === 'week' ? 7 : 30;
  const buckets: SalesChartPoint[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(start, i);
    buckets.push({ label: formatDayLabel(day), sales: 0, orders: 0 });
  }
  return buckets;
}

function bucketIndexForOrder(period: AnalyticsPeriod, start: Date, createdAt: Date, bucketCount: number) {
  if (period === 'year') {
    const months =
      (createdAt.getFullYear() - start.getFullYear()) * 12 +
      (createdAt.getMonth() - start.getMonth());
    return months >= 0 && months < bucketCount ? months : -1;
  }

  const dayStart = startOfDay(start);
  const orderDay = startOfDay(createdAt);
  const diff = Math.floor((orderDay.getTime() - dayStart.getTime()) / 86_400_000);
  return diff >= 0 && diff < bucketCount ? diff : -1;
}

function payrollInRange(start: Date, end: Date, year: number, month: number) {
  const d = new Date(year, month - 1, 1);
  const rangeStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const rangeEnd = new Date(end.getFullYear(), end.getMonth() + 1, 0, 23, 59, 59, 999);
  return d >= rangeStart && d <= rangeEnd;
}

const getDashboardAnalyticsFromDB = async (period: AnalyticsPeriod): Promise<DashboardAnalytics> => {
  const { start, end } = getPeriodRange(period);
  const salesChart = buildChartBuckets(period, start, end);

  const orders = await Order.find({
    status: { $in: SALES_STATUSES },
    createdAt: { $gte: start, $lte: end },
  })
    .select('totalAmount items createdAt')
    .lean()
    .exec();

  let income = 0;
  let productCost = 0;

  for (const order of orders) {
    income += order.totalAmount ?? 0;
    const createdAt = (order as { createdAt?: Date }).createdAt
      ? new Date((order as { createdAt?: Date }).createdAt!)
      : new Date();
    const idx = bucketIndexForOrder(period, start, createdAt, salesChart.length);
    if (idx >= 0) {
      salesChart[idx].sales += order.totalAmount ?? 0;
      salesChart[idx].orders += 1;
    }

    for (const item of order.items ?? []) {
      const buy = item.buyUnitPrice ?? 0;
      productCost += buy * (item.quantity ?? 0);
    }
  }

  const payrollRows = await StaffPayroll.find().select('year month totalPay calculatedPay').lean().exec();
  let staffExpense = 0;
  for (const row of payrollRows) {
    if (payrollInRange(start, end, row.year, row.month)) {
      staffExpense += row.totalPay ?? row.calculatedPay ?? 0;
    }
  }

  const manualExpense = await ExpenseService.sumManualExpensesInRange(start, end);

  const now = new Date();
  const [runningOffers, activeCoupons, totalUsers, totalStaff] = await Promise.all([
    Product.countDocuments({
      status: 'active',
      offerType: { $in: ['percent', 'fixed'] },
      offerValue: { $gt: 0 },
    }).exec(),
    Coupon.countDocuments({
      isActive: true,
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
    }).exec(),
    User.countDocuments({ role: 'USER', isDeleted: { $ne: true } }).exec(),
    User.countDocuments({ role: { $in: ['MANAGER', 'SELLER'] }, isDeleted: { $ne: true } }).exec(),
  ]);

  const expense = Math.round(productCost + staffExpense + manualExpense);
  const roundedIncome = Math.round(income);

  return {
    period,
    income: roundedIncome,
    expense,
    profit: roundedIncome - expense,
    productCost: Math.round(productCost),
    staffExpense: Math.round(staffExpense),
    manualExpense: Math.round(manualExpense),
    runningOffers,
    activeCoupons,
    totalUsers,
    totalStaff,
    salesChart: salesChart.map((b) => ({
      ...b,
      sales: Math.round(b.sales),
    })),
  };
};

const listIncomeOrdersFromDB = async (period: AnalyticsPeriod) => {
  const { start, end } = getPeriodRange(period);
  return Order.find({
    status: { $in: SALES_STATUSES },
    createdAt: { $gte: start, $lte: end },
  })
    .select('orderNumber totalAmount status channel paymentStatus paymentMethod createdAt items')
    .sort({ createdAt: -1 })
    .lean()
    .exec();
};

export const AnalyticsService = {
  getDashboardAnalyticsFromDB,
  listIncomeOrdersFromDB,
};
