import { useState } from 'react';
import { KeyRound, Pencil } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EditAccountDialog, ResetPasswordDialog } from '@/features/accounts/AccountDialogs';
import { gymAccountsKey, useGymAccounts } from './usePlatform';

/**
 * The people who sign in to a gym, for when an owner is locked out: give an
 * account a mobile number, or set a new password.
 */
export const GymAccounts = ({ gym }) => {
  const { data: accounts, isLoading } = useGymAccounts(gym.id);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const basePath = `/gyms/${gym.id}/accounts`;

  if (isLoading) return <Skeleton className="h-24 rounded-xl" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Staff sign in with their mobile number, or their email if they have one. If someone forgets
        their password, set a new one here and tell them what it is.
      </p>

      <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
        {accounts?.map((account) => (
          <li key={account.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-sm font-medium">
                {account.name}
                <Badge variant="outline" className="text-[0.625rem] uppercase">
                  {account.role === 'admin' ? 'Admin' : 'Staff'}
                </Badge>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {account.phone ?? <span className="text-warning">No mobile number yet</span>}
                {account.email && ` · ${account.email}`}
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${account.name}`} onClick={() => setEditing(account)}>
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Reset password for ${account.name}`}
              onClick={() => setResetting(account)}
            >
              <KeyRound className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <EditAccountDialog
        account={editing}
        basePath={basePath}
        invalidate={[gymAccountsKey(gym.id)]}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <ResetPasswordDialog
        account={resetting}
        basePath={basePath}
        open={Boolean(resetting)}
        onOpenChange={(open) => !open && setResetting(null)}
      />
    </div>
  );
};
