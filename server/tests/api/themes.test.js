import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createGym } from '../helpers/factories.js';
import { Theme } from '../../src/models/Theme.js';
import { SYSTEM_THEMES, ensureSystemThemes } from '../../src/lib/systemThemes.js';

const app = createApp();
let header;

beforeEach(async () => {
  ({ header } = await authenticate({ role: 'superadmin' }));
});

describe('GET /api/themes', () => {
  it('lists the ten built-in themes first, with how many gyms use each', async () => {
    await ensureSystemThemes();
    const ocean = await Theme.findOne({ key: 'ocean-blue' });
    await createGym({ theme: ocean._id });
    await createGym({ theme: ocean._id });

    const response = await request(app).get('/api/themes').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(SYSTEM_THEMES.length);
    expect(response.body.data.every((theme) => theme.isSystem)).toBe(true);
    expect(response.body.data.find((theme) => theme.key === 'ocean-blue').gymCount).toBe(2);
  });

  it('is closed to gym administrators', async () => {
    const { header: gymAdmin } = await authenticate({ role: 'admin' });
    const response = await request(app).get('/api/themes').set(gymAdmin);
    expect(response.status).toBe(403);
  });
});

describe('POST /api/themes', () => {
  it('creates a custom theme, normalising colours to lowercase', async () => {
    const response = await request(app)
      .post('/api/themes')
      .set(header)
      .send({ name: 'Mid City Navy', primary: '#1E3A8A', accent: '' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: 'Mid City Navy',
      primary: '#1e3a8a',
      accent: null,
      isSystem: false,
      gymCount: 0,
    });
  });

  it('rejects a colour that is not #rrggbb', async () => {
    const response = await request(app)
      .post('/api/themes')
      .set(header)
      .send({ name: 'Bad', primary: 'blue' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.primary).toMatch(/colour/i);
  });

  it('refuses a name already taken, ignoring case', async () => {
    await ensureSystemThemes();
    const response = await request(app)
      .post('/api/themes')
      .set(header)
      .send({ name: 'ocean blue', primary: '#000000' });

    expect(response.status).toBe(409);
  });
});

describe('PATCH and DELETE /api/themes/:id', () => {
  it('edits a custom theme without clearing fields it was not sent', async () => {
    const theme = await Theme.create({ name: 'Mine', primary: '#111111', accent: '#222222' });

    const response = await request(app)
      .patch(`/api/themes/${theme.id}`)
      .set(header)
      .send({ primary: '#333333' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: 'Mine', primary: '#333333', accent: '#222222' });
  });

  it('never changes or deletes a built-in theme', async () => {
    await ensureSystemThemes();
    const aura = await Theme.findOne({ key: 'aura-gold' });

    const edit = await request(app).patch(`/api/themes/${aura.id}`).set(header).send({ primary: '#000000' });
    const remove = await request(app).delete(`/api/themes/${aura.id}`).set(header);

    expect(edit.status).toBe(403);
    expect(remove.status).toBe(403);
    expect(await Theme.exists({ _id: aura._id })).toBeTruthy();
  });

  it('refuses to delete a theme a gym is wearing', async () => {
    const theme = await Theme.create({ name: 'Worn', primary: '#111111' });
    await createGym({ theme: theme._id });

    const response = await request(app).delete(`/api/themes/${theme.id}`).set(header);

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/used by 1 gym/);
  });

  it('deletes an unused custom theme', async () => {
    const theme = await Theme.create({ name: 'Unused', primary: '#111111' });

    const response = await request(app).delete(`/api/themes/${theme.id}`).set(header);

    expect(response.status).toBe(204);
    expect(await Theme.exists({ _id: theme._id })).toBeNull();
  });
});
