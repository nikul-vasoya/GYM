import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';

import { createApp } from '../../src/app.js';
import { authenticate } from '../helpers/auth.js';
import { createGym, createMember, createPackage } from '../helpers/factories.js';
import { Package } from '../../src/models/Package.js';

const app = createApp();
let header;

beforeEach(async () => {
  ({ header } = await authenticate({ role: 'admin' }));
});

describe('POST /api/packages', () => {
  it('creates a plan at the end of the list', async () => {
    await createPackage({ sortOrder: 4 });

    const response = await request(app)
      .post('/api/packages')
      .set(header)
      .send({ name: 'Summer Special', durationMonths: 2, price: 2500, description: 'Includes PT' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: 'Summer Special',
      durationMonths: 2,
      price: 2500,
      description: 'Includes PT',
      isActive: true,
      sortOrder: 5,
    });
  });

  it('can create a plan switched off', async () => {
    const response = await request(app)
      .post('/api/packages')
      .set(header)
      .send({ name: 'Draft', durationMonths: 1, price: 100, isActive: false });

    expect(response.body.data.isActive).toBe(false);
  });

  it('refuses a duplicate name, ignoring case', async () => {
    await createPackage({ name: 'Gold' });

    const response = await request(app)
      .post('/api/packages')
      .set(header)
      .send({ name: 'gold', durationMonths: 1, price: 100 });

    expect(response.status).toBe(409);
    expect(response.body.error.details.name).toBeDefined();
  });

  it('allows the same name in another gym', async () => {
    await createPackage({ name: 'Gold', gym: await createGym() });

    const response = await request(app)
      .post('/api/packages')
      .set(header)
      .send({ name: 'Gold', durationMonths: 1, price: 100 });

    expect(response.status).toBe(201);
  });

  it('validates the fields', async () => {
    const response = await request(app)
      .post('/api/packages')
      .set(header)
      .send({ name: 'X', durationMonths: 0, price: -1 });

    expect(response.status).toBe(400);
    expect(Object.keys(response.body.error.details)).toEqual(
      expect.arrayContaining(['name', 'durationMonths', 'price']),
    );
  });

  it('is closed to staff', async () => {
    const { header: staff } = await authenticate({ role: 'staff' });

    const response = await request(app)
      .post('/api/packages')
      .set(staff)
      .send({ name: 'Nope', durationMonths: 1, price: 100 });

    expect(response.status).toBe(403);
  });
});

describe('PATCH /api/packages/:id', () => {
  it('renames and redescribes a plan', async () => {
    const pkg = await createPackage({ name: 'Old' });

    const response = await request(app)
      .patch(`/api/packages/${pkg.id}`)
      .set(header)
      .send({ name: 'New', description: 'Now with sauna' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: 'New', description: 'Now with sauna' });
  });

  it('refuses a name another plan has', async () => {
    await createPackage({ name: 'Taken' });
    const pkg = await createPackage({ name: 'Mine' });

    const response = await request(app).patch(`/api/packages/${pkg.id}`).set(header).send({ name: 'Taken' });

    expect(response.status).toBe(409);
  });

  it('keeps its own name without calling it a duplicate', async () => {
    const pkg = await createPackage({ name: 'Same' });

    const response = await request(app)
      .patch(`/api/packages/${pkg.id}`)
      .set(header)
      .send({ name: 'Same', price: 999 });

    expect(response.status).toBe(200);
  });
});

describe('DELETE /api/packages/:id', () => {
  it('deletes a plan nobody has bought', async () => {
    const pkg = await createPackage();

    const response = await request(app).delete(`/api/packages/${pkg.id}`).set(header);

    expect(response.status).toBe(204);
    expect(await Package.exists({ _id: pkg._id })).toBeNull();
  });

  it('keeps a plan that is on a membership, and says to deactivate it', async () => {
    const pkg = await createPackage();
    await createMember({ package: pkg });

    const response = await request(app).delete(`/api/packages/${pkg.id}`).set(header);

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/deactivate/i);
  });

  it("cannot delete another gym's plan", async () => {
    const pkg = await createPackage({ gym: await createGym() });

    const response = await request(app).delete(`/api/packages/${pkg.id}`).set(header);

    expect(response.status).toBe(404);
  });
});
