import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createUser, createGym, createPackage } from '../helpers/factories.js';
import { User } from '../../src/models/User.js';

const app = createApp();
let header;
let gym;
let admin;

beforeEach(async () => {
  ({ header, gym, user: admin } = await authenticate({ role: 'admin' }));
});

const newStaff = (overrides = {}) => ({
  name: 'Front Desk',
  phone: '9800012345',
  email: 'desk@ironhouse.com',
  password: 'Frontdesk1',
  role: 'staff',
  ...overrides,
});

describe('POST /api/staff', () => {
  it('creates a colleague inside the admin’s own gym', async () => {
    const response = await request(app).post('/api/staff').set(header).send(newStaff());

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ email: 'desk@ironhouse.com', role: 'staff' });
    expect(response.body.data.passwordHash).toBeUndefined();

    const created = await User.findOne({ email: 'desk@ironhouse.com' });
    expect(String(created.gym)).toBe(gym.id);
  });

  it('lets the new colleague sign in', async () => {
    await request(app).post('/api/staff').set(header).send(newStaff());

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'desk@ironhouse.com', password: 'Frontdesk1' });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('staff');
    expect(response.body.gym.id).toBe(gym.id);
  });

  it('cannot mint a platform superadmin', async () => {
    const response = await request(app)
      .post('/api/staff')
      .set(header)
      .send(newStaff({ role: 'superadmin' }));

    expect(response.status).toBe(400);
    expect(await User.countDocuments({ role: 'superadmin' })).toBe(0);
  });

  it('refuses an email that is taken anywhere on the platform', async () => {
    const elsewhere = await createGym();
    await createUser({ gym: elsewhere, email: 'taken@example.com' });

    const response = await request(app)
      .post('/api/staff')
      .set(header)
      .send(newStaff({ email: 'taken@example.com' }));

    expect(response.status).toBe(409);
  });

  it('refuses a mobile number that is taken anywhere on the platform', async () => {
    await createUser({ gym: await createGym(), phone: '9800012345' });

    const response = await request(app).post('/api/staff').set(header).send(newStaff({ email: '' }));

    expect(response.status).toBe(409);
    expect(response.body.error.details.phone).toBeDefined();
  });

  it('creates an account with a mobile number and no email', async () => {
    const response = await request(app)
      .post('/api/staff')
      .set(header)
      .send(newStaff({ email: '', phone: '98000 99999' }));

    expect(response.status).toBe(201);
    expect(response.body.data.phone).toBe('9800099999');
    expect(response.body.data.email).toBeUndefined();

    const second = await request(app)
      .post('/api/staff')
      .set(header)
      .send(newStaff({ email: '', phone: '9800088888' }));
    expect(second.status).toBe(201);
  });

  it('requires a mobile number', async () => {
    const response = await request(app)
      .post('/api/staff')
      .set(header)
      .send(newStaff({ phone: undefined }));

    expect(response.status).toBe(400);
    expect(response.body.error.details.phone).toMatch(/mobile/i);
  });
});

describe('GET /api/staff', () => {
  it('lists only this gym’s accounts', async () => {
    const elsewhere = await createGym();
    await createUser({ gym: elsewhere, name: 'Rival Admin' });
    await request(app).post('/api/staff').set(header).send(newStaff());

    const response = await request(app).get('/api/staff').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.map((u) => u.name).sort()).toEqual([admin.name, 'Front Desk'].sort());
  });
});

describe('DELETE /api/staff/:id', () => {
  it('removes a colleague', async () => {
    const created = await request(app).post('/api/staff').set(header).send(newStaff());

    const response = await request(app).delete(`/api/staff/${created.body.data.id}`).set(header);

    expect(response.status).toBe(200);
    expect(await User.findById(created.body.data.id)).toBeNull();
  });

  it('refuses to remove your own account', async () => {
    const response = await request(app).delete(`/api/staff/${admin.id}`).set(header);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/your own account/i);
  });

  it('leaves the gym with an administrator however the accounts are removed', async () => {
    // Two admins. The second removes the first, then has only itself left —
    // and self-removal is refused, so an administrator always remains.
    const { header: secondHeader, user: second } = await authenticate({ gym, role: 'admin' });

    expect((await request(app).delete(`/api/staff/${admin.id}`).set(secondHeader)).status).toBe(200);

    const response = await request(app).delete(`/api/staff/${second.id}`).set(secondHeader);

    expect(response.status).toBe(400);
    expect(await User.countDocuments({ gym: gym._id, role: 'admin' })).toBe(1);
  });

  it('cannot reach into another gym', async () => {
    const elsewhere = await createGym();
    const outsider = await createUser({ gym: elsewhere });

    const response = await request(app).delete(`/api/staff/${outsider.id}`).set(header);

    expect(response.status).toBe(404);
    expect(await User.findById(outsider.id)).not.toBeNull();
  });
});

describe('what a staff account may not do (decision M3)', () => {
  let staffHeader;

  beforeEach(async () => {
    ({ header: staffHeader } = await authenticate({ gym, role: 'staff' }));
  });

  it('cannot see or manage staff accounts', async () => {
    expect((await request(app).get('/api/staff').set(staffHeader)).status).toBe(403);
    expect(
      (await request(app).post('/api/staff').set(staffHeader).send(newStaff())).status,
    ).toBe(403);
  });

  it('cannot change a package price', async () => {
    const pkg = await createPackage({ gym, price: 4000 });

    const response = await request(app)
      .patch(`/api/packages/${pkg.id}`)
      .set(staffHeader)
      .send({ price: 1 });

    expect(response.status).toBe(403);
    expect((await pkg.constructor.findById(pkg.id)).price).toBe(4000);
  });

  it('can still do the daily job — members, expenses and prices as read-only', async () => {
    const pkg = await createPackage({ gym });

    const created = await request(app)
      .post('/api/members')
      .set(staffHeader)
      .send({ name: 'Walk In', phone: '9812345678', gender: 'female', packageId: pkg.id });

    expect(created.status).toBe(201);
    expect((await request(app).get('/api/packages').set(staffHeader)).status).toBe(200);
    expect(
      (await request(app)
        .post('/api/expenses')
        .set(staffHeader)
        .send({ date: '2026-02-10', description: 'Cleaning', amount: 500 })).status,
    ).toBe(201);
    expect((await request(app).get('/api/dashboard/summary').set(staffHeader)).status).toBe(200);
  });
});
