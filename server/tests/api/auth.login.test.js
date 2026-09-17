import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { hashPassword } from '../../src/lib/password.js';

const app = createApp();

beforeEach(async () => {
  await User.create({
    name: 'Gym Admin',
    email: 'admin@gym.com',
    passwordHash: await hashPassword('Admin@123'),
    role: 'admin',
  });
});

describe('POST /api/auth/login', () => {
  it('returns a signed token and the user for correct credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gym.com', password: 'Admin@123' });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      email: 'admin@gym.com',
      name: 'Gym Admin',
      role: 'admin',
    });
    expect(response.body.user.passwordHash).toBeUndefined();

    const payload = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(payload.sub).toBe(response.body.user.id);
  });

  it('accepts the email in any casing or with stray whitespace', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '  Admin@Gym.com ', password: 'Admin@123' });

    expect(response.status).toBe(200);
  });

  it('rejects a wrong password with 401 and a generic message', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gym.com', password: 'WrongPass1' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid email or password');
  });

  it('gives the same generic message for an unknown email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@gym.com', password: 'Admin@123' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid email or password');
  });

  it('returns 400 with field details when the email is malformed', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'Admin@123' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.email).toMatch(/valid email/i);
  });

  it('returns 400 when the password is missing', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'admin@gym.com' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.password).toBeDefined();
  });
});
