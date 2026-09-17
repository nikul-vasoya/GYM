import { Member } from '../../models/Member.js';
import { Expense } from '../../models/Expense.js';
import { MEMBERSHIP_STATUS } from '../../lib/membership.js';
import { buildStatusFilter } from '../members/members.query.js';
import { toMemberListResponse } from '../members/members.serializer.js';
import { monthRangeUtc, todayUtc, toIsoDate, addMonthsUtc } from '../../lib/dates.js';

const RECENT_MEMBER_COUNT = 6;
const TREND_MONTHS = 6;

/** `YYYY-MM` for a date. */
const monthKey = (date) => toIsoDate(date).slice(0, 7);

/** The last `TREND_MONTHS` month keys, oldest first, ending with this month. */
const recentMonthKeys = (today) =>
  Array.from({ length: TREND_MONTHS }, (_, index) =>
    monthKey(addMonthsUtc(today, index - (TREND_MONTHS - 1))),
  );

const sumAmounts = (docs) => docs.reduce((total, doc) => total + doc.amount, 0);

export const summary = async (req, res) => {
  const today = todayUtc();
  const thisMonth = monthKey(today);
  const { start: monthStart, end: monthEnd } = monthRangeUtc(thisMonth);

  const [total, active, expiringSoon, expired] = await Promise.all([
    Member.countDocuments(),
    Member.countDocuments(buildStatusFilter(MEMBERSHIP_STATUS.ACTIVE, today)),
    Member.countDocuments(buildStatusFilter(MEMBERSHIP_STATUS.EXPIRING_SOON, today)),
    Member.countDocuments(buildStatusFilter(MEMBERSHIP_STATUS.EXPIRED, today)),
  ]);

  const [monthExpenses, monthMemberships, recentMembers, trendRows] = await Promise.all([
    Expense.find({ date: { $gte: monthStart, $lt: monthEnd } }),
    Member.find({ startDate: { $gte: monthStart, $lt: monthEnd } }).select('packagePrice'),
    Member.find().sort({ createdAt: -1 }).limit(RECENT_MEMBER_COUNT),
    Expense.aggregate([
      { $match: { date: { $gte: monthRangeUtc(recentMonthKeys(today)[0]).start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: 'UTC' } },
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  // Zero-fill so the chart always draws six bars, including quiet months.
  const totalsByMonth = new Map(trendRows.map((row) => [row._id, row.total]));
  const expenseTrend = recentMonthKeys(today).map((month) => ({
    month,
    total: totalsByMonth.get(month) ?? 0,
  }));

  res.json({
    data: {
      members: { total, active, expiringSoon, expired },
      expenses: {
        month: thisMonth,
        total: sumAmounts(monthExpenses),
        count: monthExpenses.length,
      },
      revenue: {
        month: thisMonth,
        // Memberships SOLD this month. Historical renewals are not counted —
        // see the note under this task if the gym wants recognised revenue.
        monthToDate: monthMemberships.reduce((sum, m) => sum + m.packagePrice, 0),
      },
      recentMembers: toMemberListResponse(recentMembers, today),
      expenseTrend,
    },
  });
};
