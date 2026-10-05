import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { hashPassword } from '../../src/lib/password.js';
import { createGym } from '../helpers/factories.js';

const app = createApp();

beforeEach(async () => {
  const midcity = await createGym({ name: 'Mid City', slug: 'midcity' });
  await createGym({ name: 'Iron House', slug: 'iron-house' });

  await User.create({
    name: 'Owner',
    email: 'owner@midcity.com',
    passwordHash: await hashPassword('Midcity123'),
    role: 'admin',
    gym: midcity._id,
  });
});

const login = (body) => request(app).post('/api/auth/login').send(body);

describe('POST /api/auth/login from a gym address', () => {
  it("signs in on the account's own gym page and returns its branding", async () => {
    const response = await login({ email: 'owner@midcity.com', password: 'Midcity123', gymSlug: 'midcity' });

    expect(response.status).toBe(200);
    expect(response.body.gym).toMatchObject({
      slug: 'midcity',
      logoUrl: null,
      theme: { name: 'Aura Gold' },
    });
  });

  it("refuses another gym's page with the same message as a wrong password", async () => {
    const wrongGym = await login({ email: 'owner@midcity.com', password: 'Midcity123', gymSlug: 'iron-house' });
    const wrongPassword = await login({ email: 'owner@midcity.com', password: 'Wrong1234', gymSlug: 'midcity' });

    expect(wrongGym.status).toBe(401);
    expect(wrongGym.body).toEqual(wrongPassword.body);
    expect(wrongGym.body.token).toBeUndefined();
  });

  it('still signs in from the unbranded page', async () => {
    const response = await login({ email: 'owner@midcity.com', password: 'Midcity123' });
    expect(response.status).toBe(200);
  });
});

describe('POST /api/auth/forgot-password for a gym account', () => {
  it("links to the reset page at the gym's own address", async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'owner@midcity.com' });

    expect(response.body.resetUrl).toMatch(/^http:\/\/localhost:5173\/midcity\/reset-password\?token=/);
  });
});
