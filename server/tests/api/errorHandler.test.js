import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

describe('errorHandler', () => {
  it('returns a 400 envelope for a malformed JSON body', async () => {
    const response = await request(createApp())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{invalid json');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/malformed|invalid json/i);
  });

  // An HTTP round trip can't distinguish buggy from fixed here: Express's
  // own dispatcher swallows a synchronous throw from an error handler, so
  // the client still receives the original response either way. The only
  // way to prove the fix is to call the handler directly and check that it
  // hands off to `next` instead of attempting a second write.
  it('hands off to next instead of writing again when headers are already sent', () => {
    const err = new Error('boom, but too late');
    const req = {};
    const res = {
      headersSent: true,
      status: vi.fn(() => res),
      json: vi.fn(),
    };
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(err);
  });
});
