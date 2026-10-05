import { useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Power, PowerOff, Users } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { GymLogo } from '@/components/shared/GymLogo';
import { GymFormDialog } from './GymFormDialog';
import { GymEditSheet } from './GymEditSheet';
import { GymLoginUrl } from './GymLoginUrl';
import { ThemeSwatch } from './ThemeSwatch';
import { useGyms, useSetGymStatus } from './usePlatform';
import { getErrorMessage } from '@/lib/api';

export const GymsPage = () => {
  const { data, isLoading, isError, error } = useGyms();
  const setStatus = useSetGymStatus();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pendingGym, setPendingGym] = useState(null);
  // Held by id so the sheet shows fresh data after the list refetches.
  const [editing, setEditing] = useState(null);
  const editingGym = data?.data?.find((gym) => gym.id === editing?.id) ?? editing?.gym ?? null;

  const openEdit = (gym, tab = 'details') => setEditing({ id: gym.id, gym, tab });

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Gym',
        cell: (gym) => (
          <div className="flex min-w-0 items-center gap-3">
            <GymLogo name={gym.name} logoUrl={gym.logoUrl} className="size-9 rounded-lg text-xs" />
            <div className="min-w-0">
              <p className="truncate font-medium">{gym.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {gym.contactEmail || gym.contactPhone || 'No contact details'}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'theme',
        header: 'Theme',
        cell: (gym) => (
          <button
            type="button"
            onClick={() => openEdit(gym, 'branding')}
            className="flex items-center gap-2 rounded-md text-sm whitespace-nowrap transition-colors hover:text-primary"
            aria-label={`Change theme for ${gym.name} (${gym.theme?.name ?? 'default'})`}
          >
            <ThemeSwatch theme={gym.theme} />
            {gym.theme?.name ?? '—'}
          </button>
        ),
      },
      {
        key: 'login',
        header: 'Sign-in link',
        cell: (gym) => <GymLoginUrl slug={gym.slug} name={gym.name} />,
      },
      {
        key: 'members',
        header: 'Members',
        className: 'tabular-nums',
        cell: (gym) => gym.memberCount,
      },
      {
        key: 'staff',
        header: 'Accounts',
        className: 'tabular-nums',
        cell: (gym) => gym.staffCount,
      },
      {
        key: 'status',
        header: 'Status',
        cell: (gym) => (
          <Badge
            variant="outline"
            className={
              gym.isActive
                ? 'gap-1.5 py-1 pl-2 border-success/25 bg-success/12 text-success'
                : 'gap-1.5 py-1 pl-2 border-destructive/25 bg-destructive/12 text-destructive'
            }
          >
            <span
              aria-hidden
              className={`size-1.5 rounded-full ${gym.isActive ? 'bg-success' : 'bg-destructive'}`}
            />
            {gym.isActive ? 'Active' : 'Suspended'}
          </Badge>
        ),
      },
      {
        key: 'action',
        header: 'Actions',
        className: 'text-right',
        cell: (gym) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" aria-label={`Edit ${gym.name}`} onClick={() => openEdit(gym)}>
              <Pencil className="mr-1.5 size-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label={`${gym.isActive ? 'Suspend' : 'Reactivate'} ${gym.name}`}
              onClick={() => setPendingGym(gym)}
            >
              {gym.isActive ? (
                <>
                  <PowerOff className="mr-1.5 size-4" />
                  Suspend
                </>
              ) : (
                <>
                  <Power className="mr-1.5 size-4" />
                  Reactivate
                </>
              )}
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (isError) {
    return (
      <>
        <PageHeader eyebrow="Platform" title="Gyms" />
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3.5 text-sm text-destructive"
        >
          {getErrorMessage(error)}
        </p>
      </>
    );
  }

  const totals = data?.totals ?? { gyms: 0, activeGyms: 0, suspendedGyms: 0, members: 0 };

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Gyms"
        description="Every gym on the platform, and the accounts that run them."
        actions={
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add Gym
          </Button>
        }
      />

      <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gyms" value={totals.gyms} icon={Building2} delay={0} />
        <StatCard label="Active" value={totals.activeGyms} icon={Power} tone="success" delay={0.05} />
        <StatCard
          label="Suspended"
          value={totals.suspendedGyms}
          icon={PowerOff}
          tone="destructive"
          delay={0.1}
        />
        <StatCard label="Members overall" value={totals.members} icon={Users} delay={0.15} />
      </div>

      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={Building2}
            title="No gyms yet"
            description="Create the first gym and hand its administrator the keys."
            action={
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 size-4" />
                Add Gym
              </Button>
            }
          />
        }
      />

      <GymFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onAddLogo={(gym) => openEdit(gym, 'branding')}
      />

      <GymEditSheet
        gym={editingGym}
        open={Boolean(editing)}
        initialTab={editing?.tab}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingGym)}
        onOpenChange={(open) => !open && setPendingGym(null)}
        title={pendingGym?.isActive ? `Suspend ${pendingGym?.name}?` : `Reactivate ${pendingGym?.name}?`}
        description={
          pendingGym?.isActive
            ? 'Everyone at this gym is signed out immediately and cannot sign in again until it is reactivated. Nothing is deleted.'
            : 'Staff at this gym will be able to sign in again straight away.'
        }
        confirmLabel={pendingGym?.isActive ? 'Suspend gym' : 'Reactivate gym'}
        isPending={setStatus.isPending}
        onConfirm={async () => {
          await setStatus.mutateAsync({ id: pendingGym.id, isActive: !pendingGym.isActive });
          setPendingGym(null);
        }}
      />
    </>
  );
};
