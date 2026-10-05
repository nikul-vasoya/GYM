import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createGym, createPackage, createMember, createExpense } from '../helpers/factories.js';
import { Gym } from '../../src/models/Gym.js';

const app = createApp();

/**
 * Tenant isolation.
 *
 * The single most important property of the multi-gym model: a signed-in user
 * sees their own gym and nothing else, whether they ask nicely (a list) or
 * with another gym's id in hand (a direct fetch, an update, a renewal).
 *
 * Each test sets up two fully-populated gyms and acts as the first one.
 */
let mine;
let theirs;
let header;

beforeEach(async () => {
  ({ header, gym: mine } = await authenticate());

  theirs = await createGym({ name: 'Rival Fitness' });
});

describe('member isolation', () => {
  it('lists only this gym’s members', async () => {
    await createMember({ gym: mine, name: 'My Member' });
    await createMember({ gym: theirs, name: 'Their Member' });

    const response = await request(app).get('/api/members').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.map((m) => m.name)).toEqual(['My Member']);
    expect(response.body.pagination.total).toBe(1);
  });

  it('cannot fetch another gym’s member by id', async () => {
    const other = await createMember({ gym: theirs });

    const response = await request(app).get(`/api/members/${other.id}`).set(header);

    // 404, not 403: the id should not even be acknowledged as existing.
    expect(response.status).toBe(404);
  });

  it('cannot edit another gym’s member', async () => {
    const other = await createMember({ gym: theirs, name: 'Untouched' });

    const response = await request(app)
      .patch(`/api/members/${other.id}`)
      .set(header)
      .send({ name: 'Hijacked' });

    expect(response.status).toBe(404);
    expect((await other.constructor.findById(other.id)).name).toBe('Untouched');
  });

  it('cannot renew another gym’s member', async () => {
    const other = await createMember({ gym: theirs });

    const response = await request(app).post(`/api/members/${other.id}/renew`).set(header).send({});

    expect(response.status).toBe(404);
  });

  it('cannot sell another gym’s package to its own member', async () => {
    const theirPackage = await createPackage({ gym: theirs, name: 'Rival Deal', price: 1 });

    const response = await request(app).post('/api/members').set(header).send({
      name: 'Bargain Hunter',
      phone: '9822222222',
      gender: 'male',
      packageId: theirPackage.id,
    });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toMatch(/package not found/i);
  });

  it('lets both gyms register the same phone number', async () => {
    await createMember({ gym: theirs, phone: '9811111111', email: undefined });
    const myPackage = await createPackage({ gym: mine });

    const response = await request(app).post('/api/members').set(header).send({
      name: 'Same Person',
      phone: '9811111111',
      gender: 'female',
      packageId: myPackage.id,
    });

    expect(response.status).toBe(201);
  });
});

describe('expense isolation', () => {
  it('lists and totals only this gym’s expenses', async () => {
    await createExpense({ gym: mine, description: 'Mine', amount: 500, date: '2026-02-10' });
    await createExpense({ gym: theirs, description: 'Theirs', amount: 9000, date: '2026-02-10' });

    const response = await request(app).get('/api/expenses?month=2026-02').set(header);

    expect(response.body.data.map((e) => e.description)).toEqual(['Mine']);
    expect(response.body.summary.total).toBe(500);
  });

  it('cannot fetch or edit another gym’s expense', async () => {
    const other = await createExpense({ gym: theirs });

    expect((await request(app).get(`/api/expenses/${other.id}`).set(header)).status).toBe(404);
    expect(
      (await request(app).patch(`/api/expenses/${other.id}`).set(header).send({ amount: 1 })).status,
    ).toBe(404);
  });
});

describe('package isolation', () => {
  it('lists only this gym’s packages', async () => {
    await createPackage({ gym: mine, name: 'Mine' });
    await createPackage({ gym: theirs, name: 'Theirs' });

    const response = await request(app).get('/api/packages').set(header);

    expect(response.body.data.map((p) => p.name)).toEqual(['Mine']);
  });

  it('cannot reprice another gym’s package', async () => {
    const other = await createPackage({ gym: theirs, price: 4000 });

    const response = await request(app)
      .patch(`/api/packages/${other.id}`)
      .set(header)
      .send({ price: 1 });

    expect(response.status).toBe(404);
    expect((await other.constructor.findById(other.id)).price).toBe(4000);
  });
});

describe('dashboard isolation', () => {
  it('counts only this gym', async () => {
    await createMember({ gym: mine });
    await createMember({ gym: theirs });
    await createMember({ gym: theirs });
    await createExpense({ gym: theirs, amount: 5000 });

    const response = await request(app).get('/api/dashboard/summary').set(header);

    expect(response.body.data.members.total).toBe(1);
    expect(response.body.data.recentMembers).toHaveLength(1);
    expect(response.body.data.expenseTrend.reduce((sum, m) => sum + m.total, 0)).toBe(0);
  });
});

describe('a suspended gym', () => {
  it('is locked out of its own data immediately, without waiting for the token to expire', async () => {
    await createMember({ gym: mine });
    expect((await request(app).get('/api/members').set(header)).status).toBe(200);

    await Gym.updateOne({ _id: mine._id }, { isActive: false });

    const response = await request(app).get('/api/members').set(header);

    expect(response.status).toBe(403);
    expect(response.body.error.message).toMatch(/suspended/i);
  });

  it('cannot sign in', async () => {
    await Gym.updateOne({ _id: mine._id }, { isActive: false });

    const { user } = await authenticate({ gym: mine });
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test@123' });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toMatch(/suspended/i);
  });
});
