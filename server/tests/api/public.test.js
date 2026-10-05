import { describe, it, expect } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { createGym } from '../helpers/factories.js';
import { Theme } from '../../src/models/Theme.js';
import { ensureSystemThemes } from '../../src/lib/systemThemes.js';

const app = createApp();

describe('GET /api/public/gyms/:slug', () => {
  it('returns the branding for an active gym, and nothing private', async () => {
    await ensureSystemThemes();
    const ocean = await Theme.findOne({ key: 'ocean-blue' });
    await createGym({
      name: 'Mid City',
      slug: 'midcity',
      contactEmail: 'owner@midcity.com',
      theme: ocean._id,
      logoUrl: '/uploads/logos/x.png',
    });

    const response = await request(app).get('/api/public/gyms/midcity');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      name: 'Mid City',
      slug: 'midcity',
      logoUrl: '/uploads/logos/x.png',
      theme: { id: ocean.id, name: 'Ocean Blue', primary: '#2563eb', accent: '#06b6d4' },
    });
    expect(JSON.stringify(response.body)).not.toContain('owner@midcity.com');
  });

  it('matches the slug case-insensitively', async () => {
    await createGym({ name: 'Mid City', slug: 'midcity' });
    const response = await request(app).get('/api/public/gyms/MidCity');
    expect(response.status).toBe(200);
  });

  it('falls back to the default theme when a gym has none', async () => {
    await createGym({ name: 'Old Gym', slug: 'old-gym', theme: null });

    const response = await request(app).get('/api/public/gyms/old-gym');

    expect(response.body.data.theme).toMatchObject({ name: 'Aura Gold', primary: '#c9a227' });
  });

  it('answers 404 for an unknown gym', async () => {
    const response = await request(app).get('/api/public/gyms/nowhere');
    expect(response.status).toBe(404);
  });

  it('answers a suspended gym exactly like an unknown one', async () => {
    await createGym({ name: 'Closed', slug: 'closed', isActive: false });

    const suspended = await request(app).get('/api/public/gyms/closed');
    const unknown = await request(app).get('/api/public/gyms/nowhere');

    expect(suspended.status).toBe(404);
    expect(suspended.body).toEqual(unknown.body);
  });
});
