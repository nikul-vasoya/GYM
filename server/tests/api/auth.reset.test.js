import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { hashPassword } from '../../src/lib/password.js';
import { hashToken } from '../../src/lib/token.js';

const app = createApp();

beforeEach(async () => {
  await User.create({
    name: 'Gym Admin',
    email: 'admin@gym.com',
    passwordHash: await hashPassword('Admin@123'),
  });
});

const requestReset = () =>
  request(app).post('/api/auth/forgot-password').send({ email: 'admin@gym.com' });

describe('POST /api/auth/forgot-password', () => {
  it('confirms the request and stores only the token hash', async () => {
    const response = await requestReset();

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/reset link/i);

    const user = await User.findOne({ email: 'admin@gym.com' }).select(
      '+resetTokenHash +resetTokenExpiresAt',
    );
    expect(user.resetTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(user.resetTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());

    // The raw token must never be what is stored.
    expect(user.resetTokenHash).not.toBe(response.body.resetToken);
    expect(hashToken(response.body.resetToken)).toBe(user.resetTokenHash);
  });

  it('gives the same confirmation for an unregistered email', async () => {
    const known = await requestReset();
    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@gym.com' });

    expect(unknown.status).toBe(200);
    expect(unknown.body.message).toBe(known.body.message);
    expect(unknown.body.resetToken).toBeUndefined();
  });

  it('rejects a malformed email', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nope' });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('sets the new password and lets the user sign in with it', async () => {
    const { body } = await requestReset();

    const reset = await request(app).post('/api/auth/reset-password').send({
      token: body.resetToken,
      password: 'BrandNew1',
      confirmPassword: 'BrandNew1',
    });

    expect(reset.status).toBe(200);
    expect(reset.body.message).toMatch(/updated/i);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gym.com', password: 'BrandNew1' });
    expect(newLogin.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@gym.com', password: 'Admin@123' });
    expect(oldLogin.status).toBe(401);
  });

  it('invalidates the token after a successful reset', async () => {
    const { body } = await requestReset();
    const payload = {
      token: body.resetToken,
      password: 'BrandNew1',
      confirmPassword: 'BrandNew1',
    };

    await request(app).post('/api/auth/reset-password').send(payload);
    const second = await request(app).post('/api/auth/reset-password').send(payload);

    expect(second.status).toBe(400);
    expect(second.body.error.message).toMatch(/invalid or has expired/i);
  });

  it('rejects an expired token', async () => {
    const { body } = await requestReset();
    await User.updateOne(
      { email: 'admin@gym.com' },
      { resetTokenExpiresAt: new Date(Date.now() - 1000) },
    );

    const response = await request(app).post('/api/auth/reset-password').send({
      token: body.resetToken,
      password: 'BrandNew1',
      confirmPassword: 'BrandNew1',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/invalid or has expired/i);
  });

  it('rejects an unknown token', async () => {
    const response = await request(app).post('/api/auth/reset-password').send({
      token: 'totally-made-up-token',
      password: 'BrandNew1',
      confirmPassword: 'BrandNew1',
    });

    expect(response.status).toBe(400);
  });

  it('rejects a password that fails the policy', async () => {
    const { body } = await requestReset();

    const response = await request(app).post('/api/auth/reset-password').send({
      token: body.resetToken,
      password: 'short',
      confirmPassword: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details.password).toMatch(/8 characters/);
  });

  it('rejects mismatched confirmation', async () => {
    const { body } = await requestReset();

    const response = await request(app).post('/api/auth/reset-password').send({
      token: body.resetToken,
      password: 'BrandNew1',
      confirmPassword: 'Different1',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details.confirmPassword).toMatch(/do not match/i);
  });
});
