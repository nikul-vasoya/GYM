import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { hashPassword } from '../../src/lib/password.js';
import { createGym } from '../helpers/factories.js';

const app = createApp();
let gym;

beforeEach(async () => {
  gym = await createGym({ name: 'Iron House' });

  await User.create({
    name: 'Gym Admin',
    email: 'admin@gym.com',
    passwordHash: await hashPassword('Admin@123'),
    role: 'admin',
    gym: gym._id,
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

  it('returns the gym the account belongs to', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gym.com', password: 'Admin@123' });

    expect(response.body.gym).toMatchObject({ id: gym.id, name: 'Iron House' });
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
    expect(response.body.error.message).toBe('Invalid mobile number, email or password');
  });

  it('gives the same generic message for an unknown email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@gym.com', password: 'Admin@123' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid mobile number, email or password');
  });

  it('returns 400 when neither a mobile number nor an email is given', async () => {
    const response = await request(app).post('/api/auth/login').send({ password: 'Admin@123' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.identifier).toMatch(/mobile number or email/i);
  });

  it('signs in with a mobile number, however it is spaced', async () => {
    await User.updateOne({ email: 'admin@gym.com' }, { phone: '9810000001' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ identifier: '98100 00001', password: 'Admin@123' });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('admin@gym.com');
  });

  it('signs in with an email given as the identifier', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'Admin@Gym.com', password: 'Admin@123' });

    expect(response.status).toBe(200);
  });

  it('answers an unknown mobile number like a wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ identifier: '9999999999', password: 'Admin@123' });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid mobile number, email or password');
  });

  it('returns 400 when the password is missing', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'admin@gym.com' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.password).toBeDefined();
  });
});
