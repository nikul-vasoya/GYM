import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePackages } from '@/features/members/useMembers';
import { api, getErrorMessage } from '@/lib/api';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import { useTogglePackage } from './usePackageAdmin';

/** On/off for whether new members can be sold this plan. */
const ActiveSwitch = ({ pkg }) => {
  const toggle = useTogglePackage();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={pkg.isActive}
      aria-label={`${pkg.name} available to sell`}
      disabled={toggle.isPending}
      onClick={() => toggle.mutate({ id: pkg.id, isActive: !pkg.isActive })}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60',
        pkg.isActive ? 'bg-primary' : 'bg-muted ring-1 ring-border',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block size-5 rounded-full bg-card shadow transition-transform',
          pkg.isActive ? 'translate-x-5.5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
};

const PackageRow = ({ pkg, onEdit, onDelete }) => {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(pkg.price);
  const [error, setError] = useState(null);

  const updatePrice = useMutation({
    mutationFn: async (value) => {
      const { data } = await api.patch(`/packages/${pkg.id}`, { price: value });
      return data.data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast.success(`${updated.name} price updated`);
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const onSave = () => {
    const value = Number(price);

    // Validate before the request so an obvious mistake never leaves the page.
    if (!Number.isInteger(value)) {
      setError('Price must be a whole number');
      return;
    }
    if (value < 0) {
      setError('Price cannot be negative');
      return;
    }

    setError(null);
    updatePrice.mutate(value);
  };

  const isDirty = Number(price) !== pkg.price;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 border-b border-border/60 px-5 py-4 transition-colors last:border-0 hover:bg-primary/[0.03]',
        !pkg.isActive && 'opacity-70',
      )}
    >
      <ActiveSwitch pkg={pkg} />

      <div className="min-w-[140px] flex-1">
        <p className="font-display font-medium">{pkg.name}</p>
        <p className="text-xs text-muted-foreground">
          {pkg.durationMonths} month{pkg.durationMonths === 1 ? '' : 's'}
          {pkg.description && ` · ${pkg.description}`}
        </p>
      </div>

      {!pkg.isActive && <Badge variant="outline">Inactive</Badge>}

      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          className="w-32 text-right tabular-nums"
          aria-label={`Price for ${pkg.name}`}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />

        <Button
          size="icon-sm"
          variant={isDirty ? 'default' : 'outline'}
          aria-label={`Save ${pkg.name}`}
          disabled={updatePrice.isPending}
          onClick={onSave}
        >
          {updatePrice.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
        </Button>

        <Button size="icon-sm" variant="ghost" aria-label={`Edit ${pkg.name}`} onClick={() => onEdit(pkg)}>
          <Pencil className="size-4" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Delete ${pkg.name}`}
          className="hover:text-destructive"
          onClick={() => onDelete(pkg)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {error && (
        <p role="alert" className="w-full text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export const PackageSettingsTable = ({ onEdit, onDelete, onCreate }) => {
  const { data: packages = [], isLoading } = usePackages({ includeInactive: true });

  if (isLoading) return <TableSkeleton rows={4} columns={3} />;

  if (packages.length === 0) {
    return (
      <EmptyState
        title="No plans yet"
        description="Add the memberships your gym sells."
        action={<Button onClick={onCreate}>New plan</Button>}
      />
    );
  }

  return (
    <div>
      {packages.map((pkg) => (
        <PackageRow key={pkg.id} pkg={pkg} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
};
