import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createMember, createPackage, createExpense } from '../helpers/factories.js';
import { todayUtc, addDaysUtc, toIsoDate } from '../../src/lib/dates.js';

const app = createApp();
let header;

beforeEach(async () => {
  ({ header } = await authenticate());
});

describe('GET /api/dashboard/summary', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/api/dashboard/summary');
    expect(response.status).toBe(401);
  });

  it('counts members by status', async () => {
    const threeMonth = await createPackage({ durationMonths: 3 });

    await createMember({ package: threeMonth, durationMonths: 3, endDate: addDaysUtc(todayUtc(), 90) });
    await createMember({ package: threeMonth, durationMonths: 3, endDate: addDaysUtc(todayUtc(), 3) });
    await createMember({ package: threeMonth, durationMonths: 3, endDate: addDaysUtc(todayUtc(), -1) });
    await createMember({ package: threeMonth, durationMonths: 3, endDate: addDaysUtc(todayUtc(), -40) });

    const response = await request(app).get('/api/dashboard/summary').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.members).toEqual({
      total: 4,
      active: 1,
      expiringSoon: 1,
      expired: 2,
    });
  });

  it('totals this month expenses', async () => {
    const thisMonth = toIsoDate(todayUtc()).slice(0, 7);

    await createExpense({ date: new Date(`${thisMonth}-01T00:00:00.000Z`), amount: 1200 });
    await createExpense({ date: new Date(`${thisMonth}-02T00:00:00.000Z`), amount: 800 });
    await createExpense({ date: new Date('2000-01-15T00:00:00.000Z'), amount: 999999 });

    const response = await request(app).get('/api/dashboard/summary').set(header);

    expect(response.body.data.expenses).toEqual({ month: thisMonth, total: 2000, count: 2 });
  });

  it('totals revenue from memberships that started this month', async () => {
    const pkg = await createPackage({ durationMonths: 3, price: 4000 });

    await createMember({ package: pkg, durationMonths: 3, startDate: toIsoDate(todayUtc()) });
    await createMember({ package: pkg, durationMonths: 3, startDate: '2000-01-01' });

    const response = await request(app).get('/api/dashboard/summary').set(header);

    expect(response.body.data.revenue.monthToDate).toBe(4000);
  });

  it('returns the six most recent members for the activity panel', async () => {
    const pkg = await createPackage();
    for (let i = 0; i < 8; i += 1) {
      await createMember({ name: `Member ${i}`, package: pkg });
    }

    const response = await request(app).get('/api/dashboard/summary').set(header);

    expect(response.body.data.recentMembers).toHaveLength(6);
    expect(response.body.data.recentMembers[0].name).toBe('Member 7');
    expect(response.body.data.recentMembers[0].status).toBeDefined();
  });

  it('returns a six-month expense trend, oldest first, with zero-filled gaps', async () => {
    const response = await request(app).get('/api/dashboard/summary').set(header);

    const { expenseTrend } = response.body.data;
    expect(expenseTrend).toHaveLength(6);
    expect(expenseTrend.every((point) => /^\d{4}-\d{2}$/.test(point.month))).toBe(true);
    expect(expenseTrend.every((point) => typeof point.total === 'number')).toBe(true);
    expect(expenseTrend[5].month).toBe(toIsoDate(todayUtc()).slice(0, 7));
  });

  it('returns zeroes on an empty database rather than failing', async () => {
    const response = await request(app).get('/api/dashboard/summary').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.members).toEqual({
      total: 0,
      active: 0,
      expiringSoon: 0,
      expired: 0,
    });
    expect(response.body.data.expenses.total).toBe(0);
    expect(response.body.data.revenue.monthToDate).toBe(0);
    expect(response.body.data.recentMembers).toEqual([]);
  });
});
