import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createExpense } from '../helpers/factories.js';
import { toUtcMidnight } from '../../src/lib/dates.js';

const app = createApp();
let header;

beforeEach(async () => {
  ({ header } = await authenticate());
});

describe('POST /api/expenses', () => {
  const validBody = () => ({
    date: '2026-02-10',
    description: 'Treadmill servicing',
    amount: 4500,
  });

  it('records an expense', async () => {
    const response = await request(app).post('/api/expenses').set(header).send(validBody());

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      date: '2026-02-10',
      description: 'Treadmill servicing',
      amount: 4500,
    });
    expect(response.body.data.id).toBeDefined();
  });

  it('trims the description', async () => {
    const response = await request(app)
      .post('/api/expenses')
      .set(header)
      .send({ ...validBody(), description: '  Dumbbell set  ' });

    expect(response.body.data.description).toBe('Dumbbell set');
  });

  it('rejects a zero or negative amount (SRS §6.2)', async () => {
    for (const amount of [0, -100]) {
      const response = await request(app)
        .post('/api/expenses')
        .set(header)
        .send({ ...validBody(), amount });

      expect(response.status).toBe(400);
      expect(response.body.error.details.amount).toBeDefined();
    }
  });

  it('rejects a non-numeric amount', async () => {
    const response = await request(app)
      .post('/api/expenses')
      .set(header)
      .send({ ...validBody(), amount: 'lots' });

    expect(response.status).toBe(400);
  });

  it('rejects a missing description', async () => {
    const { description, ...body } = validBody();
    const response = await request(app).post('/api/expenses').set(header).send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.details.description).toBeDefined();
  });

  it('rejects a malformed date', async () => {
    const response = await request(app)
      .post('/api/expenses')
      .set(header)
      .send({ ...validBody(), date: '10/02/2026' });

    expect(response.status).toBe(400);
  });

  it('requires authentication', async () => {
    const response = await request(app).post('/api/expenses').send(validBody());
    expect(response.status).toBe(401);
  });
});

describe('GET /api/expenses', () => {
  beforeEach(async () => {
    await createExpense({ date: toUtcMidnight('2026-01-31'), description: 'Jan last', amount: 100 });
    await createExpense({ date: toUtcMidnight('2026-02-01'), description: 'Feb first', amount: 200 });
    await createExpense({ date: toUtcMidnight('2026-02-28'), description: 'Feb last', amount: 300 });
    await createExpense({ date: toUtcMidnight('2026-03-01'), description: 'Mar first', amount: 400 });
  });

  it('returns every expense, newest first, when no month is given', async () => {
    const response = await request(app).get('/api/expenses').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.map((e) => e.description)).toEqual([
      'Mar first',
      'Feb last',
      'Feb first',
      'Jan last',
    ]);
  });

  // SRS §5.5 — the month filter must not leak the neighbouring months.
  it('filters to a single month inclusive of its first and last day', async () => {
    const response = await request(app).get('/api/expenses?month=2026-02').set(header);

    expect(response.body.data.map((e) => e.description)).toEqual(['Feb last', 'Feb first']);
  });

  it('returns the month total so the UI does not have to add up a page', async () => {
    const response = await request(app).get('/api/expenses?month=2026-02').set(header);

    expect(response.body.summary).toEqual({ total: 500, count: 2 });
  });

  it('returns an empty list and a zero total for a month with no expenses', async () => {
    const response = await request(app).get('/api/expenses?month=2026-07').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.summary).toEqual({ total: 0, count: 0 });
  });

  it('rejects a malformed month', async () => {
    const response = await request(app).get('/api/expenses?month=February').set(header);

    expect(response.status).toBe(400);
    expect(response.body.error.details.month).toMatch(/YYYY-MM/);
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/expenses');
    expect(response.status).toBe(401);
  });
});

describe('PATCH /api/expenses/:id', () => {
  it('updates an expense', async () => {
    const expense = await createExpense({ amount: 1000 });

    const response = await request(app)
      .patch(`/api/expenses/${expense.id}`)
      .set(header)
      .send({ amount: 1250, description: 'Corrected amount' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ amount: 1250, description: 'Corrected amount' });
  });

  it('rejects an empty update', async () => {
    const expense = await createExpense();
    const response = await request(app).patch(`/api/expenses/${expense.id}`).set(header).send({});

    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app)
      .patch('/api/expenses/64b7f0f0f0f0f0f0f0f0f0f0')
      .set(header)
      .send({ amount: 10 });

    expect(response.status).toBe(404);
  });
});

describe('GET /api/expenses/:id', () => {
  it('returns one expense', async () => {
    const expense = await createExpense({ description: 'Water cooler' });

    const response = await request(app).get(`/api/expenses/${expense.id}`).set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.description).toBe('Water cooler');
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app)
      .get('/api/expenses/64b7f0f0f0f0f0f0f0f0f0f0')
      .set(header);

    expect(response.status).toBe(404);
  });
});
