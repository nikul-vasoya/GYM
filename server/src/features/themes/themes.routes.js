import { Router } from 'express';

import { requireAuth, requirePlatformAdmin } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { createThemeSchema, updateThemeSchema, themeIdParamsSchema } from './themes.schema.js';
import * as themesController from './themes.controller.js';

export const themesRouter = Router();

// Themes are a platform concern: gyms wear them, only the operator makes them.
themesRouter.use(requireAuth, requirePlatformAdmin);

themesRouter.get('/', asyncHandler(themesController.list));

themesRouter.post('/', validate(createThemeSchema), asyncHandler(themesController.create));

themesRouter.patch(
  '/:id',
  validate(themeIdParamsSchema, 'params'),
  validate(updateThemeSchema),
  asyncHandler(themesController.update),
);

themesRouter.delete(
  '/:id',
  validate(themeIdParamsSchema, 'params'),
  asyncHandler(themesController.remove),
);
