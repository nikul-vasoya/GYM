import { Info } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageSettingsTable } from './PackageSettingsTable';

export const SettingsPage = () => (
  <>
    <PageHeader
      title="Settings"
      description="Configure membership packages without a developer."
    />

    <Card className="elevated max-w-3xl">
      <CardHeader>
        <CardTitle className="text-base">Membership packages</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <p className="flex items-start gap-2 border-b bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          Changing a price only affects memberships sold from now on — existing members keep the
          price they were charged.
        </p>

        <PackageSettingsTable />
      </CardContent>
    </Card>
  </>
);
