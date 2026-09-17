import * as membersService from './members.service.js';
import { toMemberResponse, toMemberListResponse } from './members.serializer.js';

export const list = async (req, res) => {
  const { members, pagination } = await membersService.listMembers(req.validatedQuery);
  res.json({ data: toMemberListResponse(members), pagination });
};

export const get = async (req, res) => {
  const member = await membersService.getMember(req.params.id);
  res.json({ data: toMemberResponse(member) });
};

export const create = async (req, res) => {
  const member = await membersService.createMember(req.body);
  res.status(201).json({ data: toMemberResponse(member) });
};

export const update = async (req, res) => {
  const member = await membersService.updateMember(req.params.id, req.body);
  res.json({ data: toMemberResponse(member) });
};

export const renew = async (req, res) => {
  const member = await membersService.renewMember(req.params.id, req.body);
  res.json({ data: toMemberResponse(member) });
};
