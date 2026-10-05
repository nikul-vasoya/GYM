import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGymPath } from '@/features/branding/useGymPath';
import { Plus, Search, Users } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMembers } from './useMembers';
import { buildMemberColumns } from './memberColumns';
import { MemberFormDrawer } from './MemberFormDrawer';

const PAGE_SIZE = 20;
const ALL_STATUSES = 'all';

export const MembersPage = () => {
  const navigate = useNavigate();
  const to = useGymPath();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL_STATUSES);
  const [page, setPage] = useState(1);
  const [editingMember, setEditingMember] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Debounce so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useMembers({
    search,
    status: status === ALL_STATUSES ? undefined : status,
    page,
    limit: PAGE_SIZE,
  });

  const columns = useMemo(
    () =>
      buildMemberColumns({
        onView: (member) => navigate(to(`/members/${member.id}`)),
        onEdit: (member) => {
          setEditingMember(member);
          setIsFormOpen(true);
        },
      }),
    [navigate, to],
  );

  const openAddForm = () => {
    setEditingMember(null);
    setIsFormOpen(true);
  };

  const rows = data?.data ?? [];
  const isFiltered = Boolean(search) || status !== ALL_STATUSES;

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Members"
        description="Everyone registered at the gym."
        actions={
          <Button onClick={openAddForm}>
            <Plus className="mr-2 size-4" />
            Add New Member
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search members"
            placeholder="Search by name, phone or email…"
            className="pl-10"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[190px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring-soon">Expiring soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        startIndex={(page - 1) * PAGE_SIZE}
        pagination={data?.pagination}
        onPageChange={setPage}
        onRowClick={(member) => navigate(to(`/members/${member.id}`))}
        emptyState={
          <EmptyState
            icon={Users}
            title={isFiltered ? 'No members match those filters' : 'No members yet'}
            description={
              isFiltered
                ? 'Try a different search term or clear the status filter.'
                : 'Add your first member to get started.'
            }
            action={
              !isFiltered && (
                <Button onClick={openAddForm}>
                  <Plus className="mr-2 size-4" />
                  Add New Member
                </Button>
              )
            }
          />
        }
      />

      <MemberFormDrawer open={isFormOpen} onOpenChange={setIsFormOpen} member={editingMember} />
    </>
  );
};
