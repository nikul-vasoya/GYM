import { Link } from 'react-router-dom';
import { useGymPath } from '@/features/branding/useGymPath';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BellRing, CalendarX2, Receipt, TrendingUp, UserCheck, Users } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDashboardSummary } from './useDashboard';
import { formatCurrency, formatDate, formatDaysRemaining, initialsOf } from '@/lib/format';
import { getErrorMessage } from '@/lib/api';

const LoadingTiles = () => (
  <div role="status" aria-label="Loading dashboard" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <Skeleton key={index} className="h-[116px] rounded-2xl" />
    ))}
  </div>
);

export const DashboardPage = () => {
  const { data, isLoading, isError, error } = useDashboardSummary();
  const to = useGymPath();

  if (isError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3.5 text-sm text-destructive"
        >
          {getErrorMessage(error)}
        </p>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <LoadingTiles />
      </>
    );
  }

  const { members, expenses, revenue, recentMembers, expenseTrend } = data;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Today's snapshot of memberships and spending."
        actions={
          members.expiringSoon > 0 && (
            <Button asChild variant="outline">
              <Link to={to('/action-required')}>
                <BellRing className="mr-2 size-4" />
                {members.expiringSoon} need follow-up
              </Link>
            </Button>
          )
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total members" value={members.total} icon={Users} delay={0} />
        <StatCard
          label="Active"
          value={members.active}
          icon={UserCheck}
          tone="success"
          delay={0.05}
        />
        <StatCard
          label="Expiring soon"
          value={members.expiringSoon}
          icon={BellRing}
          tone="warning"
          delay={0.1}
        />
        <StatCard
          label="Expired"
          value={members.expired}
          icon={CalendarX2}
          tone="destructive"
          delay={0.15}
        />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <StatCard
          label={`Revenue this month`}
          value={revenue.monthToDate}
          icon={TrendingUp}
          tone="success"
          format={formatCurrency}
          delay={0.2}
        />
        <StatCard
          label={`Expenses this month (${expenses.count})`}
          value={expenses.total}
          icon={Receipt}
          format={formatCurrency}
          delay={0.25}
        />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Expenses, last 6 months</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseTrend} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  {/* Bars are lit from the top, like every other gold surface here. */}
                  <linearGradient id="expense-bar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--gold-1)" />
                    <stop offset="100%" stopColor="var(--gold-3)" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeOpacity={0.6} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-muted-foreground)"
                  tickFormatter={(month) => month.slice(5)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-muted-foreground)"
                  width={64}
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  cursor={{ fill: 'var(--color-primary)', fillOpacity: 0.06 }}
                  contentStyle={{
                    background: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lifted)',
                    color: 'var(--color-popover-foreground)',
                  }}
                  formatter={(value) => [formatCurrency(value), 'Total']}
                />
                <Bar dataKey="total" fill="url(#expense-bar)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recently added</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentMembers.length === 0 ? (
              <EmptyState icon={Users} title="No members yet" description="Add your first member to see them here." />
            ) : (
              <ul className="divide-y divide-border/60">
                {recentMembers.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-primary/[0.035]"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground ring-1 ring-primary/20">
                      {initialsOf(member.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.packageName} · until {formatDate(member.endDate)}
                      </p>
                    </div>
                    {/*
                      A StatusBadge here would read "Active" / "Expiring
                      soon" / "Expired" — the exact wording of the stat
                      tiles above — making the two ambiguous to any exact
                      text query (and to a screen reader skimming the
                      page). daysRemaining is the same server-computed
                      field without the collision.
                    */}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDaysRemaining(member.daysRemaining)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};
