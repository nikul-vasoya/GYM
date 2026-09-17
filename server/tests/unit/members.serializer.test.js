import { describe, it, expect } from 'vitest';
import { toMemberResponse } from '../../src/features/members/members.serializer.js';
import { createMember } from '../helpers/factories.js';

const TODAY = '2026-03-15';

describe('toMemberResponse', () => {
  it('adds status and daysRemaining to the member document', async () => {
    const member = await createMember({ startDate: '2026-01-01', durationMonths: 3 });

    const result = toMemberResponse(member, TODAY);

    // Starts 2026-01-01 for 3 months, so it ends 2026-03-31 — still active on 2026-03-15.
    expect(result.status).toBe('active');
    expect(result.daysRemaining).toBe(16);
  });

  it('reports an active membership with days remaining', async () => {
    const member = await createMember({ startDate: '2026-03-01', durationMonths: 3 });

    const result = toMemberResponse(member, TODAY);

    expect(result.status).toBe('active');
    expect(result.daysRemaining).toBe(77); // ends 2026-05-31
  });

  it('exposes id and hides the mongo internals', async () => {
    const member = await createMember();

    const result = toMemberResponse(member, TODAY);

    expect(result.id).toBe(member._id.toString());
    expect(result._id).toBeUndefined();
    expect(result.__v).toBeUndefined();
  });

  it('formats the dates as YYYY-MM-DD strings the client can render directly', async () => {
    const member = await createMember({ startDate: '2026-03-01', durationMonths: 3 });

    const result = toMemberResponse(member, TODAY);

    expect(result.startDate).toBe('2026-03-01');
    expect(result.endDate).toBe('2026-05-31');
  });

  it('maps a list of members', async () => {
    await createMember({ startDate: '2026-03-01' });
    await createMember({ startDate: '2026-03-01' });

    const { toMemberListResponse } = await import(
      '../../src/features/members/members.serializer.js'
    );
    const { Member } = await import('../../src/models/Member.js');

    const result = toMemberListResponse(await Member.find(), TODAY);

    expect(result).toHaveLength(2);
    expect(result.every((m) => m.status === 'active')).toBe(true);
  });
});
