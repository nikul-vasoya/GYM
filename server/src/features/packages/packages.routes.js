import { Router } from 'express';

import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { listPackagesQuerySchema, updatePackageSchema } from './packages.schema.js';
import * as packagesController from './packages.controller.js';

export const packagesRouter = Router();

// Every package route is behind authentication (SRS §6.4).
packagesRouter.use(requireAuth);

packagesRouter.get(
  '/',
  validate(listPackagesQuerySchema, 'query'),
  asyncHandler(packagesController.list),
);

packagesRouter.patch(
  '/:id',
  validate(updatePackageSchema),
  asyncHandler(packagesController.update),
);
