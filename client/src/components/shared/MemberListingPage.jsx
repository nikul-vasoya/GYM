import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from './PageHeader';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { useMembers } from '@/features/members/useMembers';
import { buildMemberColumns } from '@/features/members/memberColumns';

const PAGE_SIZE = 20;

/**
 * A read-only member listing filtered to one status.
 *
 * Shared by Expiry (SRS §3) and Action Required (SRS §4) so the two screens
 * cannot drift apart in layout or behaviour.
 */
export const MemberListingPage = ({ title, description, status, sort = 'endDate', emptyState }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMembers({ status, sort, page, limit: PAGE_SIZE });

  const columns = useMemo(
    () => buildMemberColumns({ onView: (member) => navigate(`/members/${member.id}`) }),
    [navigate],
  );

  return (
    <>
      <PageHeader title={title} description={description} />

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        isLoading={isLoading}
        startIndex={(page - 1) * PAGE_SIZE}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={(member) => navigate(`/members/${member.id}`)}
        emptyState={<EmptyState {...emptyState} />}
      />
    </>
  );
};
