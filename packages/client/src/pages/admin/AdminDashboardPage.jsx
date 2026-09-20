import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { BookOpen, GraduationCap, UserCheck, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatTile } from '@/components/ui/stat-tile';
import { StatTileSkeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { formatPrice } from '@/lib/utils';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function AdminDashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.dashboard(),
  });

  const auditQuery = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => adminApi.auditLogs({ limit: '20' }),
  });

  const stats = dashboardQuery.data?.data;
  const logs = auditQuery.data?.data?.logs || [];

  const statCards = stats
    ? [
        { label: 'Total users', value: stats.users?.total, icon: Users },
        { label: 'Active learners', value: stats.users?.learners ?? stats.users?.active, icon: UserCheck, tone: 'success' },
        { label: 'Courses', value: stats.courses?.total, icon: BookOpen },
        { label: 'Enrollments', value: stats.enrollments?.total, icon: GraduationCap, tone: 'accent' },
      ]
    : [];

  return (
    <>
      <PageHeader eyebrow="Admin" title="Overview" documentTitle="Admin dashboard" description="Platform numbers and the latest audit activity." />

      {dashboardQuery.isLoading && (
        <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading dashboard">
          {[1, 2, 3, 4].map((i) => <StatTileSkeleton key={i} />)}
        </div>
      )}
      {dashboardQuery.error && <Alert variant="error">{dashboardQuery.error.message}</Alert>}
      {stats?.partialErrors?.length > 0 && (
        <Alert variant="warning" className="mb-6">
          Some services could not be reached: {stats.partialErrors.map((e) => e.service).join(', ')}.
          Stats may be incomplete.
        </Alert>
      )}

      {statCards.length > 0 && (
        <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((item) => (
            <StatTile key={item.label} label={item.label} value={item.value ?? 0} icon={item.icon} tone={item.tone} />
          ))}
        </div>
      )}

      {stats && (
        <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Completed courses</CardDescription>
              <CardTitle className="text-[length:var(--font-size-2xl)]">{stats.completions ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Certificates issued</CardDescription>
              <CardTitle className="text-[length:var(--font-size-2xl)]">{stats.certificates ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          {stats.revenue && (
            <Card>
              <CardHeader>
                <CardDescription>Revenue ({stats.revenue.currency || 'USD'})</CardDescription>
                <CardTitle className="text-[length:var(--font-size-2xl)]">
                  {formatPrice(stats.revenue.total ?? 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-[length:var(--font-size-sm)] text-brand-muted">
                {stats.revenue.successfulOrders ?? 0} successful orders ·{' '}
                {stats.revenue.pendingOrders ?? 0} pending
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <section aria-labelledby="audit-heading">
        <h2 id="audit-heading" className="mb-4 text-[length:var(--font-size-xl)] font-semibold">
          Recent audit log
        </h2>
        {auditQuery.isLoading && <p role="status">Loading audit log…</p>}
        {auditQuery.error && <Alert variant="error">{auditQuery.error.message}</Alert>}
        {logs.length > 0 && (
          <Card>
            <CardContent className="overflow-x-auto p-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink" tabIndex={0} role="region" aria-label="Table, scrolls sideways when wide">
              <table className="w-full min-w-[32rem] text-left text-[length:var(--font-size-base)]">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-surface">
                    <th className="px-4 py-3 font-semibold" scope="col">When</th>
                    <th className="px-4 py-3 font-semibold" scope="col">Action</th>
                    <th className="px-4 py-3 font-semibold" scope="col">Target</th>
                    <th className="px-4 py-3 font-semibold" scope="col">Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id || `${log.createdAt}-${log.action}`} className="border-b border-brand-border last:border-0">
                      <td className="px-4 py-3 text-brand-muted">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-3">{log.action}</td>
                      <td className="px-4 py-3">
                        {log.targetType}
                        {log.targetId ? `: ${log.targetId}` : ''}
                      </td>
                      <td className="px-4 py-3 text-brand-muted">{log.actorId || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
        {!auditQuery.isLoading && !auditQuery.error && logs.length === 0 && (
          <p className="text-brand-muted">No audit events recorded yet.</p>
        )}
      </section>
    </>
  );
}
