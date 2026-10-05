import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createGym, createMember } from '../helpers/factories.js';
import { Gym } from '../../src/models/Gym.js';
import { User } from '../../src/models/User.js';
import { Package } from '../../src/models/Package.js';

const app = createApp();
let header;

beforeEach(async () => {
  ({ header } = await authenticate({ role: 'superadmin' }));
});

const newGymBody = (overrides = {}) => ({
  name: 'Iron House',
  contactEmail: 'hello@ironhouse.com',
  admin: { name: 'Ravi Kumar', phone: '9876500001', email: 'ravi@ironhouse.com', password: 'Ironhouse1' },
  ...overrides,
});

describe('POST /api/gyms', () => {
  it('creates the gym, its first admin and its default packages', async () => {
    const response = await request(app).post('/api/gyms').set(header).send(newGymBody());

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ name: 'Iron House', slug: 'iron-house', isActive: true });
    expect(response.body.admin).toMatchObject({ email: 'ravi@ironhouse.com', role: 'admin' });
    expect(response.body.admin.passwordHash).toBeUndefined();

    const gym = await Gym.findById(response.body.data.id);
    expect(await Package.countDocuments({ gym: gym._id })).toBe(4);
    expect(await User.countDocuments({ gym: gym._id, role: 'admin' })).toBe(1);
  });

  it('lets the new admin sign in straight away', async () => {
    await request(app).post('/api/gyms').set(header).send(newGymBody());

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ravi@ironhouse.com', password: 'Ironhouse1' });

    expect(response.status).toBe(200);
    expect(response.body.gym.name).toBe('Iron House');
  });

  it('gives two gyms of the same name distinct addresses', async () => {
    await request(app).post('/api/gyms').set(header).send(newGymBody());

    const response = await request(app)
      .post('/api/gyms')
      .set(header)
      .send(newGymBody({ admin: { name: 'Second', phone: '9876500002', email: 'second@x.com', password: 'Second123' } }));

    expect(response.status).toBe(201);
    expect(response.body.data.slug).toBe('iron-house-2');
  });

  it('refuses an email that already has an account, and creates nothing', async () => {
    await request(app).post('/api/gyms').set(header).send(newGymBody());
    const before = await Gym.countDocuments();

    const response = await request(app)
      .post('/api/gyms')
      .set(header)
      .send(newGymBody({ name: 'Another Gym', admin: { ...newGymBody().admin, phone: '9876500009' } }));

    expect(response.status).toBe(409);
    expect(await Gym.countDocuments()).toBe(before);
  });

  it('rejects a weak admin password with field details', async () => {
    const response = await request(app)
      .post('/api/gyms')
      .set(header)
      .send(newGymBody({ admin: { name: 'Ravi', phone: '9876500003', email: 'r@x.com', password: 'short' } }));

    expect(response.status).toBe(400);
    expect(response.body.error.details['admin.password']).toBeDefined();
  });
});

describe('GET /api/gyms', () => {
  it('lists every gym with its member and staff counts', async () => {
    await request(app).post('/api/gyms').set(header).send(newGymBody());
    const gym = await Gym.findOne({ slug: 'iron-house' });
    await createMember({ gym });
    await createMember({ gym });

    const response = await request(app).get('/api/gyms').set(header);

    expect(response.status).toBe(200);
    const listed = response.body.data.find((row) => row.slug === 'iron-house');
    expect(listed).toMatchObject({ memberCount: 2, staffCount: 1 });
    expect(response.body.totals).toMatchObject({ gyms: 1, activeGyms: 1, suspendedGyms: 0 });
  });
});

describe('PATCH /api/gyms/:id/status', () => {
  it('suspends and reactivates a gym', async () => {
    const gym = await createGym();

    const suspended = await request(app)
      .patch(`/api/gyms/${gym.id}/status`)
      .set(header)
      .send({ isActive: false });

    expect(suspended.status).toBe(200);
    expect(suspended.body.data.isActive).toBe(false);

    const restored = await request(app)
      .patch(`/api/gyms/${gym.id}/status`)
      .set(header)
      .send({ isActive: true });

    expect(restored.body.data.isActive).toBe(true);
  });

  it('404s for a gym that does not exist', async () => {
    const response = await request(app)
      .patch('/api/gyms/6512a1b2c3d4e5f6a7b8c9d0/status')
      .set(header)
      .send({ isActive: false });

    expect(response.status).toBe(404);
  });
});

describe('platform routes are the superadmin’s alone', () => {
  it.each([
    ['admin', 'admin'],
    ['staff', 'staff'],
  ])('refuses a gym %s', async (_label, role) => {
    const { header: gymHeader } = await authenticate({ role });

    expect((await request(app).get('/api/gyms').set(gymHeader)).status).toBe(403);
    expect(
      (await request(app).post('/api/gyms').set(gymHeader).send(newGymBody())).status,
    ).toBe(403);
  });

  it('refuses an unauthenticated caller', async () => {
    expect((await request(app).get('/api/gyms')).status).toBe(401);
  });
});

describe('the superadmin has no gym data of their own', () => {
  it('is kept out of every gym-scoped route', async () => {
    for (const path of ['/api/members', '/api/expenses', '/api/packages', '/api/dashboard/summary']) {
      const response = await request(app).get(path).set(header);
      expect(response.status, `GET ${path}`).toBe(403);
    }
  });
});

describe('the two sign-in doors', () => {
  it('refuses a gym account on the platform door', async () => {
    const { user } = await authenticate({ role: 'admin' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test@123', scope: 'platform' });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toMatch(/gym sign-in/i);
  });

  it('refuses the platform account on the gym door', async () => {
    const { user } = await authenticate({ role: 'superadmin' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test@123', scope: 'gym' });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toMatch(/admin-login/i);
  });

  it('signs the platform account in on its own door, with no gym', async () => {
    const { user } = await authenticate({ role: 'superadmin' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Test@123', scope: 'platform' });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('superadmin');
    expect(response.body.gym).toBeNull();
  });
});
