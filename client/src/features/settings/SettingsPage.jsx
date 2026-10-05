import { useState } from 'react';
import { Info, Plus } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageSettingsTable } from './PackageSettingsTable';
import { PackageFormDialog } from './PackageFormDialog';
import { useDeletePackage } from './usePackageAdmin';

export const SettingsPage = () => {
  const deletePackage = useDeletePackage();
  const [form, setForm] = useState({ open: false, pkg: null });
  const [pendingDelete, setPendingDelete] = useState(null);

  const openCreate = () => setForm({ open: true, pkg: null });
  const openEdit = (pkg) => setForm({ open: true, pkg });

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Configure membership packages without a developer."
      />

      <Card className="max-w-3xl">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Membership packages</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            New plan
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <p className="flex items-start gap-2.5 border-b border-border/70 bg-secondary/30 px-5 py-3.5 text-sm text-muted-foreground dark:bg-secondary/20">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Changing a price only affects memberships sold from now on — existing members keep the
              price they were charged. Switch a plan off to stop selling it without losing its
              history.
            </span>
          </p>

          <PackageSettingsTable onEdit={openEdit} onDelete={setPendingDelete} onCreate={openCreate} />
        </CardContent>
      </Card>

      <PackageFormDialog
        open={form.open}
        pkg={form.pkg}
        onOpenChange={(open) => setForm((current) => ({ ...current, open }))}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete ${pendingDelete?.name}?`}
        description="Only plans no member has ever bought can be deleted. If members have bought it, switch it off instead."
        confirmLabel="Delete plan"
        isPending={deletePackage.isPending}
        onConfirm={async () => {
          try {
            await deletePackage.mutateAsync({ id: pendingDelete.id, name: pendingDelete.name });
          } finally {
            setPendingDelete(null);
          }
        }}
      />
    </>
  );
};
