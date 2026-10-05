import { describe, it, expect } from 'vitest';

import { getErrorMessage, signInPathForScope } from './api';

describe('getErrorMessage', () => {
  it('prefers the API’s own message', () => {
    const error = { response: { status: 400, data: { error: { message: 'Name is required' } } } };
    expect(getErrorMessage(error)).toBe('Name is required');
  });

  it('explains an unreachable API rather than passing on axios’s wording', () => {
    // The dev-server proxy answers with a body-less 500 when nothing is
    // listening on the API port; axios would call that "Request failed with
    // status code 500", which sends people looking in the wrong place.
    const error = { response: { status: 500, data: '' }, message: 'Request failed with status code 500' };

    expect(getErrorMessage(error)).toMatch(/cannot reach the api server/i);
  });

  it('still shows a real server error from the API', () => {
    const error = {
      response: { status: 500, data: { error: { message: 'Something went wrong' } } },
    };

    expect(getErrorMessage(error)).toBe('Something went wrong');
  });

  it('names a network failure', () => {
    expect(getErrorMessage({ code: 'ERR_NETWORK' })).toMatch(/cannot reach the server/i);
  });
});

describe('signInPathForScope', () => {
  it('sends the platform operator back to their own door', () => {
    expect(signInPathForScope('platform')).toBe('/admin-login');
    expect(signInPathForScope('gym', null)).toBe('/login');
    expect(signInPathForScope('gym', 'midcity')).toBe('/midcity/login');
    expect(signInPathForScope('platform', 'midcity')).toBe('/admin-login');
  });
});
