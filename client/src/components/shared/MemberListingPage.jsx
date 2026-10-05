import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGymPath } from '@/features/branding/useGymPath';

import { PageHeader } from './PageHeader';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { useMembers } from '@/features/members/useMembers';
import { buildMemberColumns } from '@/features/members/memberColumns';
import { RenewDialog } from '@/features/members/RenewDialog';

const PAGE_SIZE = 20;

/**
 * A read-only member listing filtered to one status.
 *
 * Shared by Expiry (SRS §3) and Action Required (SRS §4) so the two screens
 * cannot drift apart in layout or behaviour.
 */
export const MemberListingPage = ({
  eyebrow,
  title,
  description,
  status,
  sort = 'endDate',
  emptyState,
  canRenew = false,
}) => {
  const navigate = useNavigate();
  const to = useGymPath();
  const [page, setPage] = useState(1);
  // Renewing from the list saves a trip to the member's page; once renewed
  // the member leaves this list, because its query is refetched.
  const [renewing, setRenewing] = useState(null);

  const { data, isLoading } = useMembers({ status, sort, page, limit: PAGE_SIZE });

  const columns = useMemo(
    () =>
      buildMemberColumns({
        onView: (member) => navigate(to(`/members/${member.id}`)),
        onRenew: canRenew ? setRenewing : undefined,
      }),
    [navigate, to, canRenew],
  );

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        isLoading={isLoading}
        startIndex={(page - 1) * PAGE_SIZE}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={(member) => navigate(to(`/members/${member.id}`))}
        emptyState={<EmptyState {...emptyState} />}
      />

      {canRenew && (
        <RenewDialog
          open={Boolean(renewing)}
          onOpenChange={(open) => !open && setRenewing(null)}
          member={renewing}
        />
      )}
    </>
  );
};
