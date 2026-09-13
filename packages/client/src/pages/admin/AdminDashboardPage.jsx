import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        { label: 'Total users', value: stats.users?.total },
        { label: 'Active learners', value: stats.users?.learners ?? stats.users?.active },
        { label: 'Courses', value: stats.courses?.total },
        { label: 'Enrollments', value: stats.enrollments?.total },
      ]
    : [];

  return (
    <>
      <PageHeader title="Admin dashboard" description="Platform overview and recent activity." />

      {dashboardQuery.isLoading && <p role="status">Loading dashboard…</p>}
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
            <Card key={item.label}>
              <CardHeader>
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="text-[length:var(--font-size-3xl)]">{item.value ?? '—'}</CardTitle>
              </CardHeader>
            </Card>
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
            <CardContent className="overflow-x-auto p-0">
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
