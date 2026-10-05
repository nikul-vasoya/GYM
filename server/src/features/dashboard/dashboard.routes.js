import { Router } from 'express';

import { requireAuth, requireGymUser } from '../../middleware/requireAuth.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import * as dashboardController from './dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth, requireGymUser);
dashboardRouter.get('/summary', asyncHandler(dashboardController.summary));
