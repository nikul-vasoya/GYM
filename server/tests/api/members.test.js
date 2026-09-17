import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createPackage, createMember } from '../helpers/factories.js';
import { Member } from '../../src/models/Member.js';

const app = createApp();
let header;
let threeMonth;

beforeEach(async () => {
  ({ header } = await authenticate());
  threeMonth = await createPackage({ name: '3 Months', durationMonths: 3, price: 4000 });
});

describe('POST /api/members', () => {
  const validBody = () => ({
    name: 'Priya Sharma',
    phone: '9811111111',
    email: 'priya@example.com',
    gender: 'female',
    packageId: threeMonth.id,
    startDate: '2026-01-10',
  });

  it('creates a member and derives price and end date from the package', async () => {
    const response = await request(app).post('/api/members').set(header).send(validBody());

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: 'Priya Sharma',
      gender: 'female',
      packageName: '3 Months',
      packagePrice: 4000, // SRS §2.3.1 — never entered by the user
      durationMonths: 3,
      startDate: '2026-01-10',
      endDate: '2026-04-09', // SRS §2.3.4
    });
    expect(response.body.data.id).toBeDefined();
  });

  it('ignores a price sent by the client', async () => {
    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), price: 1, packagePrice: 1 });

    expect(response.body.data.packagePrice).toBe(4000);
  });

  it('defaults the start date to today when omitted', async () => {
    const { startDate, ...withoutStart } = validBody();

    const response = await request(app).post('/api/members').set(header).send(withoutStart);

    expect(response.status).toBe(201);
    expect(response.body.data.startDate).toBe(new Date().toISOString().slice(0, 10));
  });

  it('lowercases the email', async () => {
    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), email: 'PRIYA@Example.COM' });

    expect(response.body.data.email).toBe('priya@example.com');
  });

  it('stores a blank email as absent so other blanks do not collide', async () => {
    await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), email: '', phone: '9800000001' });

    const second = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), name: 'Other', email: '', phone: '9800000002' });

    expect(second.status).toBe(201);
    expect(second.body.data.email).toBeUndefined();
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/members').set(header).send(validBody());

    const duplicate = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), name: 'Someone Else', phone: '9899999999' });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.message).toMatch(/already exists/i);
  });

  // SRS §2.3.5 — mandatory field validation
  it('rejects a missing name', async () => {
    const { name, ...body } = validBody();
    const response = await request(app).post('/api/members').set(header).send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.details.name).toBeDefined();
  });

  it('rejects an invalid email format', async () => {
    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.email).toMatch(/valid email/i);
  });

  it('rejects an invalid phone format', async () => {
    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), phone: 'call me' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.phone).toBeDefined();
  });

  it('rejects a missing package', async () => {
    const { packageId, ...body } = validBody();
    const response = await request(app).post('/api/members').set(header).send(body);

    expect(response.status).toBe(400);
  });

  it('rejects an unknown package id with 404', async () => {
    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), packageId: '64b7f0f0f0f0f0f0f0f0f0f0' });

    expect(response.status).toBe(404);
  });

  it('rejects a retired package', async () => {
    const retired = await createPackage({ name: 'Retired', isActive: false });

    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ ...validBody(), packageId: retired.id });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/no longer available/i);
  });

  it('requires authentication', async () => {
    const response = await request(app).post('/api/members').send(validBody());
    expect(response.status).toBe(401);
  });
});

describe('GET /api/members', () => {
  it('returns the newest members first (SRS §2.1)', async () => {
    await createMember({ name: 'First', package: threeMonth });
    await createMember({ name: 'Second', package: threeMonth });

    const response = await request(app).get('/api/members').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.map((m) => m.name)).toEqual(['Second', 'First']);
  });

  it('includes the computed status and days remaining on every row', async () => {
    await createMember({ package: threeMonth, startDate: '2026-01-01' });

    const response = await request(app).get('/api/members').set(header);

    expect(response.body.data[0].status).toMatch(/active|expiring-soon|expired/);
    expect(typeof response.body.data[0].daysRemaining).toBe('number');
  });

  it('paginates', async () => {
    for (let i = 0; i < 25; i += 1) {
      await createMember({ package: threeMonth });
    }

    const page1 = await request(app).get('/api/members?page=1&limit=10').set(header);
    const page3 = await request(app).get('/api/members?page=3&limit=10').set(header);

    expect(page1.body.data).toHaveLength(10);
    expect(page3.body.data).toHaveLength(5);
    expect(page1.body.pagination).toEqual({ page: 1, limit: 10, total: 25, totalPages: 3 });
  });

  it('searches by name', async () => {
    await createMember({ name: 'Priya Sharma', package: threeMonth });
    await createMember({ name: 'Rahul Verma', package: threeMonth });

    const response = await request(app).get('/api/members?search=priya').set(header);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Priya Sharma');
  });

  it('filters to expired members for the Expiry module', async () => {
    await createMember({
      name: 'Lapsed',
      package: threeMonth,
      endDate: new Date(Date.UTC(2000, 0, 1)),
    });
    await createMember({
      name: 'Current',
      package: threeMonth,
      endDate: new Date(Date.UTC(2099, 0, 1)),
    });

    const response = await request(app).get('/api/members?status=expired').set(header);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Lapsed');
    expect(response.body.data[0].status).toBe('expired');
  });

  it('rejects an unsupported status value', async () => {
    const response = await request(app).get('/api/members?status=nonsense').set(header);
    expect(response.status).toBe(400);
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/members');
    expect(response.status).toBe(401);
  });
});

describe('GET /api/members/:id', () => {
  it('returns the full member record (SRS §2.4)', async () => {
    const member = await createMember({ name: 'Priya Sharma', package: threeMonth });

    const response = await request(app).get(`/api/members/${member.id}`).set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Priya Sharma');
    expect(response.body.data.history).toEqual([]);
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app)
      .get('/api/members/64b7f0f0f0f0f0f0f0f0f0f0')
      .set(header);

    expect(response.status).toBe(404);
  });

  it('returns 400 for a malformed id rather than a 500', async () => {
    const response = await request(app).get('/api/members/not-an-id').set(header);
    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/members/:id', () => {
  it('updates contact details without touching the membership dates', async () => {
    const member = await createMember({ package: threeMonth, startDate: '2026-01-10' });

    const response = await request(app)
      .patch(`/api/members/${member.id}`)
      .set(header)
      .send({ name: 'Priya S.', phone: '9877777777' });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Priya S.');
    expect(response.body.data.startDate).toBe('2026-01-10');
    expect(response.body.data.endDate).toBe('2026-04-09');
  });

  it('recalculates the end date when the package changes (SRS §2.4)', async () => {
    const member = await createMember({ package: threeMonth, startDate: '2026-01-10' });
    const oneMonth = await createPackage({ name: '1 Month', durationMonths: 1, price: 1500 });

    const response = await request(app)
      .patch(`/api/members/${member.id}`)
      .set(header)
      .send({ packageId: oneMonth.id });

    expect(response.body.data).toMatchObject({
      packageName: '1 Month',
      packagePrice: 1500,
      durationMonths: 1,
      startDate: '2026-01-10',
      endDate: '2026-02-09',
    });
  });

  it('recalculates the end date when the start date changes', async () => {
    const member = await createMember({ package: threeMonth, startDate: '2026-01-10' });

    const response = await request(app)
      .patch(`/api/members/${member.id}`)
      .set(header)
      .send({ startDate: '2026-02-01' });

    expect(response.body.data.endDate).toBe('2026-04-30');
  });

  it('rejects an empty update', async () => {
    const member = await createMember({ package: threeMonth });

    const response = await request(app).patch(`/api/members/${member.id}`).set(header).send({});

    expect(response.status).toBe(400);
  });

  it('rejects a duplicate email with 409', async () => {
    await createMember({ email: 'taken@example.com', package: threeMonth });
    const member = await createMember({ package: threeMonth });

    const response = await request(app)
      .patch(`/api/members/${member.id}`)
      .set(header)
      .send({ email: 'taken@example.com' });

    expect(response.status).toBe(409);
  });

  it('does not create a second document', async () => {
    const member = await createMember({ package: threeMonth });

    await request(app).patch(`/api/members/${member.id}`).set(header).send({ name: 'Renamed' });

    expect(await Member.countDocuments()).toBe(1);
  });

  it('requires authentication', async () => {
    const member = await createMember({ package: threeMonth });
    const response = await request(app).patch(`/api/members/${member.id}`).send({ name: 'X' });
    expect(response.status).toBe(401);
  });
});
