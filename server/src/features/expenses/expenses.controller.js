import { Expense } from '../../models/Expense.js';
import { ApiError } from '../../lib/ApiError.js';
import { monthRangeUtc, toUtcMidnight, toIsoDate } from '../../lib/dates.js';

/** Dates leave the API as YYYY-MM-DD so the client can render them directly. */
const toExpenseResponse = (expense) => ({
  ...expense.toJSON(),
  date: toIsoDate(expense.date),
});

export const list = async (req, res) => {
  const { month } = req.validatedQuery ?? {};

  // Half-open range: everything on the last day of the month is included.
  const filter = month
    ? (({ start, end }) => ({ date: { $gte: start, $lt: end } }))(monthRangeUtc(month))
    : {};

  const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });

  res.json({
    data: expenses.map(toExpenseResponse),
    // Computed server-side so a paginated or filtered view always shows the
    // true total, not just the total of the rows on screen.
    summary: {
      total: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      count: expenses.length,
    },
  });
};

export const get = async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw ApiError.notFound('Expense not found');

  res.json({ data: toExpenseResponse(expense) });
};

export const create = async (req, res) => {
  const expense = await Expense.create({ ...req.body, date: toUtcMidnight(req.body.date) });

  res.status(201).json({ data: toExpenseResponse(expense) });
};

export const update = async (req, res) => {
  const changes = { ...req.body };
  if (changes.date) changes.date = toUtcMidnight(changes.date);

  const expense = await Expense.findByIdAndUpdate(req.params.id, changes, {
    new: true,
    runValidators: true,
  });

  if (!expense) throw ApiError.notFound('Expense not found');

  res.json({ data: toExpenseResponse(expense) });
};
