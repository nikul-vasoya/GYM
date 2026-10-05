/**
 * Gym addresses live at the root of the client's URL space (`/midcity/login`),
 * so a gym must never be given a slug that is already a route of its own.
 */
export const RESERVED_SLUGS = new Set([
  'admin',
  'admin-login',
  'api',
  'uploads',
  'assets',
  'static',
  'login',
  'logout',
  'forgot-password',
  'reset-password',
  'dashboard',
  'members',
  'expiry',
  'action-required',
  'expenses',
  'settings',
  'staff',
]);

/** Lowercase letters, digits and inner hyphens; 1–40 characters. */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export const isReservedSlug = (slug) => RESERVED_SLUGS.has(String(slug).toLowerCase());
