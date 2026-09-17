import { Router } from 'express';

import { requireAuth } from '../../middleware/requireAuth.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import * as dashboardController from './dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get('/summary', asyncHandler(dashboardController.summary));
