import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

import { authenticate } from '../helpers/auth.js';
import { createGym } from '../helpers/factories.js';
import { Gym } from '../../src/models/Gym.js';
import { Theme } from '../../src/models/Theme.js';
import { ensureSystemThemes } from '../../src/lib/systemThemes.js';

// Logos are written to a throwaway directory, never the real uploads folder.
const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gym-logos-'));
process.env.UPLOAD_DIR = uploadDir;
const { createApp } = await import('../../src/app.js');
const app = createApp();

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
const SVG = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>');

let header;

beforeEach(async () => {
  ({ header } = await authenticate({ role: 'superadmin' }));
});

afterAll(async () => {
  delete process.env.UPLOAD_DIR;
  await fs.rm(uploadDir, { recursive: true, force: true });
});

const newGymBody = (overrides = {}) => ({
  name: 'Mid City',
  admin: { name: 'Owner', phone: '9876511111', email: 'owner@midcity.com', password: 'Midcity123' },
  ...overrides,
});

describe('POST /api/gyms with branding', () => {
  it('wears the default theme when none is chosen', async () => {
    const response = await request(app).post('/api/gyms').set(header).send(newGymBody());

    expect(response.status).toBe(201);
    expect(response.body.data.theme).toMatchObject({ name: 'Aura Gold' });
  });

  it('takes a chosen theme and slug', async () => {
    await ensureSystemThemes();
    const teal = await Theme.findOne({ key: 'teal' });

    const response = await request(app)
      .post('/api/gyms')
      .set(header)
      .send(newGymBody({ slug: 'midcity', theme: teal.id }));

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ slug: 'midcity', theme: { name: 'Teal' } });
  });

  it('refuses a reserved slug', async () => {
    const response = await request(app)
      .post('/api/gyms')
      .set(header)
      .send(newGymBody({ slug: 'admin' }));

    expect(response.status).toBe(400);
    expect(response.body.error.details.slug).toMatch(/reserved/i);
  });

  it('never derives a reserved slug from a gym name', async () => {
    const response = await request(app)
      .post('/api/gyms')
      .set(header)
      .send(newGymBody({ name: 'Admin' }));

    expect(response.status).toBe(201);
    expect(response.body.data.slug).toBe('admin-2');
  });
});

describe('PATCH /api/gyms/:id', () => {
  it('edits details, address and theme together', async () => {
    await ensureSystemThemes();
    const rose = await Theme.findOne({ key: 'rose' });
    const gym = await createGym({ name: 'Mid City', slug: 'midcity', contactPhone: '9876543210' });

    const response = await request(app)
      .patch(`/api/gyms/${gym.id}`)
      .set(header)
      .send({ name: 'Mid City Fitness', slug: 'midcity-fit', theme: rose.id, contactPhone: '' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      name: 'Mid City Fitness',
      slug: 'midcity-fit',
      contactPhone: null,
      theme: { name: 'Rose', primary: '#e11d48' },
    });
  });

  it('refuses a slug another gym uses', async () => {
    await createGym({ slug: 'taken' });
    const gym = await createGym({ slug: 'mine' });

    const response = await request(app).patch(`/api/gyms/${gym.id}`).set(header).send({ slug: 'taken' });

    expect(response.status).toBe(409);
    expect(response.body.error.details.slug).toBeDefined();
  });

  it('refuses a malformed slug', async () => {
    const gym = await createGym();

    const response = await request(app).patch(`/api/gyms/${gym.id}`).set(header).send({ slug: '-Bad Slug-' });

    expect(response.status).toBe(400);
  });

  it('refuses a theme that does not exist', async () => {
    const gym = await createGym();

    const response = await request(app)
      .patch(`/api/gyms/${gym.id}`)
      .set(header)
      .send({ theme: '64b000000000000000000000' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.theme).toBeDefined();
  });

  it('is closed to a gym administrator', async () => {
    const { header: gymAdmin, gym } = await authenticate({ role: 'admin' });

    const response = await request(app).patch(`/api/gyms/${gym.id}`).set(gymAdmin).send({ name: 'Mine now' });

    expect(response.status).toBe(403);
  });
});

describe('gym logo', () => {
  it('stores a PNG, serves it inert, and replaces it on the next upload', async () => {
    const gym = await createGym();

    const first = await request(app)
      .post(`/api/gyms/${gym.id}/logo`)
      .set(header)
      .attach('logo', PNG, 'logo.png');

    expect(first.status).toBe(200);
    expect(first.body.data.logoUrl).toMatch(/^\/uploads\/logos\/.+\.png$/);

    const served = await request(app).get(first.body.data.logoUrl);
    expect(served.status).toBe(200);
    expect(served.headers['content-security-policy']).toContain('sandbox');
    expect(served.headers['x-content-type-options']).toBe('nosniff');

    const second = await request(app)
      .post(`/api/gyms/${gym.id}/logo`)
      .set(header)
      .attach('logo', SVG, 'logo.svg');

    expect(second.body.data.logoUrl).toMatch(/\.svg$/);
    const files = await fs.readdir(path.join(uploadDir, 'logos'));
    expect(files).toHaveLength(1);
  });

  it('rejects a file that only claims to be an image', async () => {
    const gym = await createGym();

    const response = await request(app)
      .post(`/api/gyms/${gym.id}/logo`)
      .set(header)
      .attach('logo', Buffer.from('<html><script>alert(1)</script></html>'), {
        filename: 'logo.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.details.logo).toMatch(/PNG, JPG, WebP or SVG/);
  });

  it('rejects a logo over 1 MB', async () => {
    const gym = await createGym();
    const big = Buffer.concat([PNG, Buffer.alloc(1024 * 1024)]);

    const response = await request(app)
      .post(`/api/gyms/${gym.id}/logo`)
      .set(header)
      .attach('logo', big, 'big.png');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/1 MB/);
  });

  it('removes a logo', async () => {
    const gym = await createGym();
    await request(app).post(`/api/gyms/${gym.id}/logo`).set(header).attach('logo', PNG, 'logo.png');

    const response = await request(app).delete(`/api/gyms/${gym.id}/logo`).set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.logoUrl).toBeNull();
    expect((await Gym.findById(gym.id)).logoUrl).toBeNull();
  });
});
