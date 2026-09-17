import { getMembershipStatus, daysUntilExpiry } from '../../lib/membership.js';
import { toIsoDate, todayUtc } from '../../lib/dates.js';

/**
 * Shapes a Member document for the API.
 *
 * Status and days-remaining are computed here, once, so the client can render
 * badges without knowing any of the business rules.
 *
 * @param {import('mongoose').Document} member
 * @param {Date|string} [today] Injectable for deterministic tests
 */
export const toMemberResponse = (member, today = todayUtc()) => {
  const json = member.toJSON();

  return {
    ...json,
    startDate: toIsoDate(json.startDate),
    endDate: toIsoDate(json.endDate),
    history: (json.history ?? []).map((period) => ({
      ...period,
      startDate: toIsoDate(period.startDate),
      endDate: toIsoDate(period.endDate),
    })),
    status: getMembershipStatus(
      { endDate: json.endDate, durationMonths: json.durationMonths },
      today,
    ),
    daysRemaining: daysUntilExpiry(json.endDate, today),
  };
};

export const toMemberListResponse = (members, today = todayUtc()) =>
  members.map((member) => toMemberResponse(member, today));
