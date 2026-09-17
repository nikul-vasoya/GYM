import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/shared/FormField';
import { usePackages, useRenewMember } from './useMembers';
import { formatCurrency, formatDate } from '@/lib/format';

export const RenewDialog = ({ open, onOpenChange, member }) => {
  const { data: packages = [] } = usePackages();
  const renewMember = useRenewMember();
  // Defaults to no selection (not the member's current package): leaving it
  // unset means "renew with the same package", which posts an empty body —
  // an explicit pick here is what overrides to a different package.
  const [packageId, setPackageId] = useState('');

  useEffect(() => {
    if (open) setPackageId('');
  }, [open, member]);

  const onConfirm = async () => {
    await renewMember.mutateAsync({ id: member.id, packageId: packageId || undefined });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew membership</DialogTitle>
          <DialogDescription>
            The current period ({formatDate(member?.startDate)} – {formatDate(member?.endDate)})
            moves into this member&apos;s history and a new one begins.
          </DialogDescription>
        </DialogHeader>

        <FormField label="Package">
          {(field) => (
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger {...field}>
                <SelectValue placeholder="Select package" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} — {formatCurrency(pkg.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={renewMember.isPending}>
            {renewMember.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Confirm renewal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
