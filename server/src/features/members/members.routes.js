import { Router } from 'express';

import { requireAuth, requireGymUser } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import {
  createMemberSchema,
  updateMemberSchema,
  renewMemberSchema,
  listMembersQuerySchema,
  memberIdParamsSchema,
} from './members.schema.js';
import * as membersController from './members.controller.js';

export const membersRouter = Router();

membersRouter.use(requireAuth, requireGymUser);

membersRouter.get(
  '/',
  validate(listMembersQuerySchema, 'query'),
  asyncHandler(membersController.list),
);

membersRouter.post('/', validate(createMemberSchema), asyncHandler(membersController.create));

membersRouter.get(
  '/:id',
  validate(memberIdParamsSchema, 'params'),
  asyncHandler(membersController.get),
);

membersRouter.patch(
  '/:id',
  validate(memberIdParamsSchema, 'params'),
  validate(updateMemberSchema),
  asyncHandler(membersController.update),
);

membersRouter.post(
  '/:id/renew',
  validate(memberIdParamsSchema, 'params'),
  validate(renewMemberSchema),
  asyncHandler(membersController.renew),
);
