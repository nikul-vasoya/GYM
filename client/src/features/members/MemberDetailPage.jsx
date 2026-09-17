import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, RefreshCw } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useMember } from './useMembers';
import { MemberFormDrawer } from './MemberFormDrawer';
import { RenewDialog } from './RenewDialog';
import { formatCurrency, formatDate, formatDaysRemaining } from '@/lib/format';
import { getErrorMessage } from '@/lib/api';

const DetailRow = ({ label, children }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="text-sm font-medium">{children}</dd>
  </div>
);

export const MemberDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: member, isLoading, isError, error } = useMember(id);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);

  if (isError) {
    return (
      <>
        <PageHeader title="Member" />
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {getErrorMessage(error)}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/members')}>
          <ArrowLeft className="mr-2 size-4" />
          Back to members
        </Button>
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <Link
        to="/members"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to members
      </Link>

      <PageHeader
        title={member.name}
        description={`${member.packageName} · ${formatDaysRemaining(member.daysRemaining)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setIsEditOpen(true)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </Button>
            <Button onClick={() => setIsRenewOpen(true)}>
              <RefreshCw className="mr-2 size-4" />
              Renew
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="elevated">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Current membership</CardTitle>
            <StatusBadge status={member.status} />
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <DetailRow label="Package">{member.packageName}</DetailRow>
              <DetailRow label="Price">{formatCurrency(member.packagePrice)}</DetailRow>
              <DetailRow label="Duration">{member.durationMonths} months</DetailRow>
              <DetailRow label="Start date">{formatDate(member.startDate)}</DetailRow>
              <DetailRow label="End date">{formatDate(member.endDate)}</DetailRow>
              <DetailRow label="Remaining">{formatDaysRemaining(member.daysRemaining)}</DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Card className="elevated">
          <CardHeader>
            <CardTitle className="text-base">Contact details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <DetailRow label="Phone">{member.phone || '—'}</DetailRow>
              <DetailRow label="Email">{member.email || '—'}</DetailRow>
              <DetailRow label="Gender">
                <span className="capitalize">{member.gender}</span>
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        <Card className="elevated lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Membership history</CardTitle>
          </CardHeader>
          <CardContent>
            {member.history.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                No previous memberships. Renewals will be recorded here.
              </p>
            ) : (
              <ul className="space-y-3">
                {member.history
                  .slice()
                  .reverse()
                  .map((period, index) => (
                    <li key={`${period.startDate}-${index}`}>
                      {index > 0 && <Separator className="mb-3" />}
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{period.packageName}</span>
                        <span className="text-sm tabular-nums">
                          {formatCurrency(period.packagePrice)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(period.startDate)} – {formatDate(period.endDate)}
                      </p>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <MemberFormDrawer open={isEditOpen} onOpenChange={setIsEditOpen} member={member} />
      <RenewDialog open={isRenewOpen} onOpenChange={setIsRenewOpen} member={member} />
    </>
  );
};
