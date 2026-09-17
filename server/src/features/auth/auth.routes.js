import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { loginSchema } from './auth.schema.js';
import * as authController from './auth.controller.js';

/** Blunt brute-force brake on the credential endpoints. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Rate limiting would make the test suite flaky and proves nothing here.
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: { message: 'Too many attempts. Please try again in 15 minutes.' } },
});

export const authRouter = Router();

authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login),
);
