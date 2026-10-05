import { useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, Trash2, UserCog, Users } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StaffFormDialog } from './StaffFormDialog';
import { useStaff, useRemoveStaff, staffKeys } from './useStaff';
import { EditAccountDialog, ResetPasswordDialog } from '@/features/accounts/AccountDialogs';
import { useAuth } from '@/features/auth/useAuth';
import { formatDate } from '@/lib/format';

const ROLE_LABEL = { admin: 'Administrator', staff: 'Staff' };

export const StaffPage = () => {
  const { user, gym } = useAuth();
  const { data: staff = [], isLoading } = useStaff();
  const removeStaff = useRemoveStaff();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [pending, setPending] = useState(null);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        cell: (account) => (
          <div className="min-w-0">
            <p className="truncate font-medium">
              {account.name}
              {account.id === user?.id && (
                <span className="ml-2 text-xs text-muted-foreground">(you)</span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {[account.phone, account.email].filter(Boolean).join(' · ') || 'No mobile number yet'}
            </p>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        cell: (account) => (
          <Badge
            variant="outline"
            className={
              account.role === 'admin'
                ? 'border-primary/30 bg-primary/10 text-primary'
                : undefined
            }
          >
            {ROLE_LABEL[account.role] ?? account.role}
          </Badge>
        ),
      },
      {
        key: 'created',
        header: 'Added',
        className: 'whitespace-nowrap',
        cell: (account) => formatDate(account.createdAt),
      },
      {
        key: 'action',
        header: 'Action',
        className: 'text-right',
        cell: (account) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${account.name}`} onClick={() => setEditing(account)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Reset password for ${account.name}`}
              onClick={() => setResetting(account)}
            >
              <KeyRound className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${account.name}`}
              // Your own account is the one that keeps this gym administered.
              disabled={account.id === user?.id}
              onClick={() => setPending(account)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [user?.id],
  );

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Staff"
        description={
          gym
            ? `Accounts that can sign in to ${gym.name}.`
            : 'Accounts that can sign in to this gym.'
        }
        actions={
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add Staff
          </Button>
        }
      />

      <p className="mb-5 flex items-start gap-2.5 rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground dark:bg-secondary/20">
        <UserCog className="mt-0.5 size-4 shrink-0 text-primary" />
        Staff can do the daily job — members, renewals and expenses. Only an administrator can
        manage these accounts or change package prices.
      </p>

      <DataTable
        columns={columns}
        rows={staff}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={Users}
            title="No other accounts yet"
            description="Add a front-desk account so your team can sign in with their own credentials."
            action={
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 size-4" />
                Add Staff
              </Button>
            }
          />
        }
      />

      <StaffFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />

      <EditAccountDialog
        account={editing}
        basePath="/staff"
        invalidate={[staffKeys.all]}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ResetPasswordDialog
        account={resetting}
        basePath="/staff"
        open={Boolean(resetting)}
        onOpenChange={(open) => !open && setResetting(null)}
      />

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={`Remove ${pending?.name}?`}
        description="They will be signed out and will no longer be able to sign in. Members and expenses they recorded are not affected."
        confirmLabel="Remove account"
        isPending={removeStaff.isPending}
        onConfirm={async () => {
          await removeStaff.mutateAsync(pending.id);
          setPending(null);
        }}
      />
    </>
  );
};
