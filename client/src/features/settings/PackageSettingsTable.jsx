import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePackages } from '@/features/members/useMembers';
import { api, getErrorMessage } from '@/lib/api';
import { TableSkeleton } from '@/components/shared/TableSkeleton';

const PackageRow = ({ pkg }) => {
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
    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-4 last:border-0">
      <div className="min-w-[140px] flex-1">
        <p className="font-medium">{pkg.name}</p>
        <p className="text-xs text-muted-foreground">
          {pkg.durationMonths} month{pkg.durationMonths === 1 ? '' : 's'}
        </p>
      </div>

      {!pkg.isActive && <Badge variant="outline">Retired</Badge>}

      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          className="w-32 tabular-nums"
          aria-label={`Price for ${pkg.name}`}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />

        <Button
          size="sm"
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
      </div>

      {error && (
        <p role="alert" className="w-full text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export const PackageSettingsTable = () => {
  const { data: packages = [], isLoading } = usePackages({ includeInactive: true });

  if (isLoading) return <TableSkeleton rows={4} columns={3} />;

  return (
    <div>
      {packages.map((pkg) => (
        <PackageRow key={pkg.id} pkg={pkg} />
      ))}
    </div>
  );
};
