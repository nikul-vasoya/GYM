/**
 * Builds a path inside one gym's address space: `gymPath('midcity', '/members')`
 * → `/midcity/members`. The one place that knows gym routes are prefixed.
 */
export const gymPath = (slug, path = '/dashboard') =>
  `/${slug}${path.startsWith('/') ? path : `/${path}`}`;

/** Where a gym account lands after signing in. */
export const gymHomePath = (slug) => gymPath(slug, '/dashboard');

/** The shareable sign-in link for a gym, including the current origin. */
export const gymLoginUrl = (slug, origin = window.location.origin) => `${origin}/${slug}/login`;

/**
 * Moves a path from one gym's address to another's, keeping the page:
 * `/iron-house/members/42` → `/midcity/members/42`.
 */
export const swapGymSlug = (pathname, slug) => {
  const [, , ...rest] = pathname.split('/');
  return `/${slug}/${rest.join('/')}`.replace(/\/$/, '') || `/${slug}`;
};

/**
 * Proposes a slug from a gym name. Mirrors `slugify` in
 * `server/src/models/Gym.js`; the server has the final say.
 */
export const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');

/** Mirrors `server/src/lib/reservedSlugs.js`. */
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

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
