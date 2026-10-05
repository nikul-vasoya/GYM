import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { Gym } from '../../models/Gym.js';
import { ApiError } from '../../lib/ApiError.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { publicGym } from '../../lib/gymBranding.js';

/** Enough for real page loads; too few to walk the slug space. */
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: { message: 'Too many requests. Please try again shortly.' } },
});

export const publicRouter = Router();

/**
 * The branding for `/<slug>/login`, fetched before anyone has signed in.
 *
 * A suspended gym answers exactly like an unknown one, so the endpoint cannot
 * be used to learn which gyms have been suspended.
 */
publicRouter.get(
  '/gyms/:slug',
  lookupLimiter,
  asyncHandler(async (req, res) => {
    const slug = String(req.params.slug).toLowerCase();
    const gym = await Gym.findOne({ slug, isActive: true }).populate('theme');

    if (!gym) throw ApiError.notFound('Gym not found');

    res.json({ data: publicGym(gym) });
  }),
);
