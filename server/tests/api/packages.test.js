import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createPackage, createMember } from '../helpers/factories.js';

const app = createApp();
let header;

beforeEach(async () => {
  ({ header } = await authenticate());
});

describe('GET /api/packages', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/api/packages');
    expect(response.status).toBe(401);
  });

  it('returns packages in sort order', async () => {
    await createPackage({ name: '3 Months', durationMonths: 3, price: 4000, sortOrder: 2 });
    await createPackage({ name: '1 Month', durationMonths: 1, price: 1500, sortOrder: 1 });

    const response = await request(app).get('/api/packages').set(header);

    expect(response.status).toBe(200);
    expect(response.body.data.map((p) => p.name)).toEqual(['1 Month', '3 Months']);
    expect(response.body.data[0]).toMatchObject({ durationMonths: 1, price: 1500 });
    expect(response.body.data[0].id).toBeDefined();
  });

  it('hides inactive packages unless asked for them', async () => {
    await createPackage({ name: 'Retired', isActive: false });
    await createPackage({ name: 'Current', isActive: true });

    const active = await request(app).get('/api/packages').set(header);
    expect(active.body.data.map((p) => p.name)).toEqual(['Current']);

    const all = await request(app).get('/api/packages?includeInactive=true').set(header);
    expect(all.body.data).toHaveLength(2);
  });
});

describe('PATCH /api/packages/:id', () => {
  it('updates the price', async () => {
    const pkg = await createPackage({ price: 1500 });

    const response = await request(app)
      .patch(`/api/packages/${pkg.id}`)
      .set(header)
      .send({ price: 1800 });

    expect(response.status).toBe(200);
    expect(response.body.data.price).toBe(1800);
  });

  it('can deactivate a package', async () => {
    const pkg = await createPackage();

    const response = await request(app)
      .patch(`/api/packages/${pkg.id}`)
      .set(header)
      .send({ isActive: false });

    expect(response.body.data.isActive).toBe(false);
  });

  it('never rewrites what an existing member was charged', async () => {
    const pkg = await createPackage({ price: 1500, durationMonths: 1 });
    const member = await createMember({ package: pkg });

    await request(app).patch(`/api/packages/${pkg.id}`).set(header).send({ price: 9999 });

    const { Member } = await import('../../src/models/Member.js');
    const reloaded = await Member.findById(member.id);
    expect(reloaded.packagePrice).toBe(1500);
  });

  it('rejects a negative price', async () => {
    const pkg = await createPackage();

    const response = await request(app)
      .patch(`/api/packages/${pkg.id}`)
      .set(header)
      .send({ price: -5 });

    expect(response.status).toBe(400);
    expect(response.body.error.details.price).toBeDefined();
  });

  it('rejects an empty update', async () => {
    const pkg = await createPackage();

    const response = await request(app).patch(`/api/packages/${pkg.id}`).set(header).send({});

    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app)
      .patch('/api/packages/64b7f0f0f0f0f0f0f0f0f0f0')
      .set(header)
      .send({ price: 100 });

    expect(response.status).toBe(404);
  });

  it('requires authentication', async () => {
    const pkg = await createPackage();
    const response = await request(app).patch(`/api/packages/${pkg.id}`).send({ price: 100 });
    expect(response.status).toBe(401);
  });
});
