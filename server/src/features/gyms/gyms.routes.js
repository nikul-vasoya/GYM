import { Router } from 'express';

import { requireAuth, requirePlatformAdmin } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import {
  createGymSchema,
  updateGymSchema,
  updateGymStatusSchema,
  gymIdParamsSchema,
} from './gyms.schema.js';
import * as gymsController from './gyms.controller.js';
import {
  updateAccountSchema,
  resetPasswordByAdminSchema,
} from '../staff/staff.schema.js';
import * as staffService from '../staff/staff.service.js';
import { z } from 'zod';

const accountParams = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid gym id'),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid account id'),
});

export const gymsRouter = Router();

// The platform operator's routes, and only theirs. A gym admin reaching here
// is a 403, never a filtered result.
gymsRouter.use(requireAuth, requirePlatformAdmin);

gymsRouter.get('/', asyncHandler(gymsController.list));

gymsRouter.post('/', validate(createGymSchema), asyncHandler(gymsController.create));

gymsRouter.patch(
  '/:id/status',
  validate(gymIdParamsSchema, 'params'),
  validate(updateGymStatusSchema),
  asyncHandler(gymsController.setStatus),
);

gymsRouter.patch(
  '/:id',
  validate(gymIdParamsSchema, 'params'),
  validate(updateGymSchema),
  asyncHandler(gymsController.update),
);

gymsRouter.post(
  '/:id/logo',
  validate(gymIdParamsSchema, 'params'),
  gymsController.receiveLogo,
  asyncHandler(gymsController.uploadLogo),
);

gymsRouter.delete(
  '/:id/logo',
  validate(gymIdParamsSchema, 'params'),
  asyncHandler(gymsController.removeLogo),
);

/*
 * A gym's accounts, as the platform administrator sees them: enough to give an
 * owner a mobile number or a new password when they are locked out. Member
 * data stays out of reach.
 */
gymsRouter.get(
  '/:id/accounts',
  validate(gymIdParamsSchema, 'params'),
  asyncHandler(async (req, res) => {
    const accounts = await staffService.listStaff(req.params.id);
    res.json({ data: accounts.map((user) => user.toJSON()) });
  }),
);

gymsRouter.patch(
  '/:id/accounts/:userId',
  validate(accountParams, 'params'),
  validate(updateAccountSchema),
  asyncHandler(async (req, res) => {
    const user = await staffService.updateAccount(req.params.id, req.params.userId, req.body);
    res.json({ data: user.toJSON() });
  }),
);

gymsRouter.put(
  '/:id/accounts/:userId/password',
  validate(accountParams, 'params'),
  validate(resetPasswordByAdminSchema),
  asyncHandler(async (req, res) => {
    await staffService.resetAccountPassword(req.params.id, req.params.userId, req.body.password);
    res.json({ message: 'Password updated' });
  }),
);
