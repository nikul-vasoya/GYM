import { Router } from 'express';

import {
  requireAuth,
  requireGymUser,
  requireGymAdmin,
} from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import {
  listPackagesQuerySchema,
  createPackageSchema,
  updatePackageSchema,
  packageIdParamsSchema,
} from './packages.schema.js';
import * as packagesController from './packages.controller.js';

export const packagesRouter = Router();

// Every package route is behind authentication (SRS §6.4).
packagesRouter.use(requireAuth, requireGymUser);

packagesRouter.get(
  '/',
  validate(listPackagesQuerySchema, 'query'),
  asyncHandler(packagesController.list),
);

// Reading packages is part of the daily job; managing them is not (M3).
packagesRouter.post(
  '/',
  requireGymAdmin,
  validate(createPackageSchema),
  asyncHandler(packagesController.create),
);

packagesRouter.patch(
  '/:id',
  requireGymAdmin,
  validate(packageIdParamsSchema, 'params'),
  validate(updatePackageSchema),
  asyncHandler(packagesController.update),
);

packagesRouter.delete(
  '/:id',
  requireGymAdmin,
  validate(packageIdParamsSchema, 'params'),
  asyncHandler(packagesController.remove),
);
