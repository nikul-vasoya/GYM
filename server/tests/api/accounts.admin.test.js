import { describe, it, expect } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createGym, createUser } from '../helpers/factories.js';

const app = createApp();

const signIn = (identifier, password) =>
  request(app).post('/api/auth/login').send({ identifier, password });

describe('a gym admin managing colleagues', () => {
  it('adds a mobile number to an account, which can then sign in with it', async () => {
    const { header } = await authenticate({ role: 'admin' });
    const colleague = await createUser({ role: 'staff', phone: undefined });

    const response = await request(app)
      .patch(`/api/staff/${colleague.id}`)
      .set(header)
      .send({ phone: '98111 22233' });

    expect(response.status).toBe(200);
    expect((await signIn('9811122233', 'Test@123')).status).toBe(200);
  });

  it('removes an email, keeping the mobile', async () => {
    const { header } = await authenticate({ role: 'admin' });
    const colleague = await createUser({ role: 'staff' });

    const response = await request(app).patch(`/api/staff/${colleague.id}`).set(header).send({ email: '' });

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBeUndefined();
    expect(response.body.data.phone).toBe(colleague.phone);
  });

  it('resets a forgotten password', async () => {
    const { header } = await authenticate({ role: 'admin' });
    const colleague = await createUser({ role: 'staff' });

    const response = await request(app)
      .put(`/api/staff/${colleague.id}/password`)
      .set(header)
      .send({ password: 'Brandnew123' });

    expect(response.status).toBe(200);
    expect((await signIn(colleague.phone, 'Brandnew123')).status).toBe(200);
    expect((await signIn(colleague.phone, 'Test@123')).status).toBe(401);
  });

  it("cannot touch another gym's accounts", async () => {
    const { header } = await authenticate({ role: 'admin' });
    const outsider = await createUser({ gym: await createGym() });

    const response = await request(app)
      .put(`/api/staff/${outsider.id}/password`)
      .set(header)
      .send({ password: 'Hijacked123' });

    expect(response.status).toBe(404);
  });

  it('is closed to staff', async () => {
    const { header } = await authenticate({ role: 'staff' });
    const colleague = await createUser({ role: 'staff' });

    const response = await request(app)
      .put(`/api/staff/${colleague.id}/password`)
      .set(header)
      .send({ password: 'Brandnew123' });

    expect(response.status).toBe(403);
  });
});

describe("the platform administrator and a gym's accounts", () => {
  it("lists them, sets the owner's mobile and resets their password", async () => {
    const { header } = await authenticate({ role: 'superadmin' });
    const gym = await createGym();
    const owner = await createUser({ gym, role: 'admin', phone: undefined });

    const list = await request(app).get(`/api/gyms/${gym.id}/accounts`).set(header);
    expect(list.body.data.map((account) => account.id)).toEqual([owner.id]);

    await request(app).patch(`/api/gyms/${gym.id}/accounts/${owner.id}`).set(header).send({ phone: '9899911111' });
    const reset = await request(app)
      .put(`/api/gyms/${gym.id}/accounts/${owner.id}/password`)
      .set(header)
      .send({ password: 'Ownernew123' });

    expect(reset.status).toBe(200);
    expect((await signIn('9899911111', 'Ownernew123')).status).toBe(200);
  });

  it('only reaches accounts inside the named gym', async () => {
    const { header } = await authenticate({ role: 'superadmin' });
    const gym = await createGym();
    const elsewhere = await createUser({ gym: await createGym() });

    const response = await request(app)
      .put(`/api/gyms/${gym.id}/accounts/${elsewhere.id}/password`)
      .set(header)
      .send({ password: 'Ownernew123' });

    expect(response.status).toBe(404);
  });
});

describe('POST /api/members', () => {
  it('requires a mobile number', async () => {
    const { header } = await authenticate({ role: 'staff' });

    const response = await request(app)
      .post('/api/members')
      .set(header)
      .send({ name: 'No Phone', gender: 'male', packageId: '64b000000000000000000000' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.phone).toMatch(/mobile number is required/i);
  });
});
