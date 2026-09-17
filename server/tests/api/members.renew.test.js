import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createPackage, createMember } from '../helpers/factories.js';
import { toIsoDate, addDaysUtc, todayUtc } from '../../src/lib/dates.js';

const app = createApp();
let header;
let threeMonth;

beforeEach(async () => {
  ({ header } = await authenticate());
  threeMonth = await createPackage({ name: '3 Months', durationMonths: 3, price: 4000 });
});

describe('POST /api/members/:id/renew', () => {
  it('continues from the old end date when renewing early', async () => {
    const endDate = addDaysUtc(todayUtc(), 3);
    const member = await createMember({ package: threeMonth, durationMonths: 3, endDate });

    const response = await request(app)
      .post(`/api/members/${member.id}/renew`)
      .set(header)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data.startDate).toBe(toIsoDate(addDaysUtc(endDate, 1)));
    expect(response.body.data.status).toBe('active');
  });

  it('starts today when renewing after the membership lapsed', async () => {
    const member = await createMember({
      package: threeMonth,
      durationMonths: 3,
      endDate: new Date(Date.UTC(2000, 0, 1)),
    });

    const response = await request(app)
      .post(`/api/members/${member.id}/renew`)
      .set(header)
      .send({});

    expect(response.body.data.startDate).toBe(toIsoDate(todayUtc()));
  });

  it('archives the previous period into history', async () => {
    const member = await createMember({
      package: threeMonth,
      durationMonths: 3,
      startDate: '2026-01-01',
      endDate: new Date(Date.UTC(2026, 2, 31)),
    });

    const response = await request(app)
      .post(`/api/members/${member.id}/renew`)
      .set(header)
      .send({});

    expect(response.body.data.history).toHaveLength(1);
    expect(response.body.data.history[0]).toMatchObject({
      packageName: '3 Months',
      packagePrice: 4000,
      startDate: '2026-01-01',
      endDate: '2026-03-31',
    });
  });

  it('can renew onto a different package', async () => {
    const twelveMonth = await createPackage({
      name: '12 Months',
      durationMonths: 12,
      price: 14000,
    });
    const member = await createMember({ package: threeMonth, durationMonths: 3 });

    const response = await request(app)
      .post(`/api/members/${member.id}/renew`)
      .set(header)
      .send({ packageId: twelveMonth.id });

    expect(response.body.data).toMatchObject({
      packageName: '12 Months',
      packagePrice: 14000,
      durationMonths: 12,
    });
  });

  // Decision D7: a renewed member must leave the Expiry list.
  it('removes the member from the expired list', async () => {
    const member = await createMember({
      package: threeMonth,
      durationMonths: 3,
      endDate: new Date(Date.UTC(2000, 0, 1)),
    });

    const before = await request(app).get('/api/members?status=expired').set(header);
    expect(before.body.data).toHaveLength(1);

    await request(app).post(`/api/members/${member.id}/renew`).set(header).send({});

    const after = await request(app).get('/api/members?status=expired').set(header);
    expect(after.body.data).toHaveLength(0);
  });

  it('keeps the historical price when the package price has since changed', async () => {
    const member = await createMember({ package: threeMonth, durationMonths: 3 });
    await request(app).patch(`/api/packages/${threeMonth.id}`).set(header).send({ price: 5500 });

    const response = await request(app)
      .post(`/api/members/${member.id}/renew`)
      .set(header)
      .send({});

    expect(response.body.data.packagePrice).toBe(5500); // new period, new price
    expect(response.body.data.history[0].packagePrice).toBe(4000); // old period untouched
  });

  it('returns 404 for an unknown member', async () => {
    const response = await request(app)
      .post('/api/members/64b7f0f0f0f0f0f0f0f0f0f0/renew')
      .set(header)
      .send({});

    expect(response.status).toBe(404);
  });

  it('requires authentication', async () => {
    const member = await createMember({ package: threeMonth });
    const response = await request(app).post(`/api/members/${member.id}/renew`).send({});
    expect(response.status).toBe(401);
  });
});
