import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { hashPassword } from '../../src/lib/password.js';

const app = createApp();
let token;
let user;

beforeEach(async () => {
  user = await User.create({
    name: 'Gym Admin',
    email: 'admin@gym.com',
    passwordHash: await hashPassword('Admin@123'),
  });

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@gym.com', password: 'Admin@123' });

  token = response.body.token;
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user for a valid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('admin@gym.com');
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a request with no Authorization header', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.message).toMatch(/sign in/i);
  });

  it('rejects a malformed Authorization header', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', token);

    expect(response.status).toBe(401);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = jwt.sign({ sub: user.id }, 'a-different-secret-that-is-long-enough');

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${forged}`);

    expect(response.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '-1s' });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expired}`);

    expect(response.status).toBe(401);
    expect(response.body.error.message).toMatch(/expired/i);
  });

  it('rejects a valid token whose user has since been deleted', async () => {
    await User.deleteOne({ _id: user._id });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
