import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentAdminApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);

  const ordersQuery = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => paymentAdminApi.listOrders({ limit: '50' }),
  });

  const detailQuery = useQuery({
    queryKey: ['admin-order', selectedId],
    queryFn: () => paymentAdminApi.getOrder(selectedId),
    enabled: Boolean(selectedId),
  });

  const confirmMutation = useMutation({
    mutationFn: (orderId) => paymentAdminApi.updateStatus(orderId, 'success'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order', selectedId] });
    },
  });

  const orders = ordersQuery.data?.data || [];
  const order = detailQuery.data?.data;

  return (
    <>
      <PageHeader title="Orders" description="Review and confirm payment orders." />

      {ordersQuery.isLoading && <p role="status">Loading orders…</p>}
      {ordersQuery.error && <Alert variant="error">{ordersQuery.error.message}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="overflow-x-auto p-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink" tabIndex={0} role="region" aria-label="Table, scrolls sideways when wide">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-brand-border bg-brand-surface">
                  <th className="px-4 py-3 font-semibold" scope="col">Order</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Amount</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.orderId}
                    className="cursor-pointer border-b border-brand-border hover:bg-brand-accent-soft/40"
                    onClick={() => setSelectedId(o.orderId)}
                  >
                    <td className="px-4 py-3 text-[length:var(--font-size-sm)]">{o.orderId}</td>
                    <td className="px-4 py-3">{formatPrice(o.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge className="capitalize">{o.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && !ordersQuery.isLoading && (
              <p className="p-4 text-brand-muted">No orders yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            {!selectedId && <p className="text-brand-muted">Select an order to view details.</p>}
            {detailQuery.isLoading && selectedId && <p role="status">Loading order…</p>}
            {order && (
              <dl className="space-y-3">
                <div>
                  <dt className="text-[length:var(--font-size-sm)] font-semibold text-brand-muted">Order ID</dt>
                  <dd className="break-all text-[length:var(--font-size-sm)]">{order.orderId}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--font-size-sm)] font-semibold text-brand-muted">User</dt>
                  <dd className="break-all text-[length:var(--font-size-sm)]">{order.userId}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--font-size-sm)] font-semibold text-brand-muted">Course</dt>
                  <dd className="break-all text-[length:var(--font-size-sm)]">{order.courseId}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--font-size-sm)] font-semibold text-brand-muted">Amount</dt>
                  <dd>{formatPrice(order.amount)} {order.currency}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--font-size-sm)] font-semibold text-brand-muted">Status</dt>
                  <dd className="capitalize">{order.status}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--font-size-sm)] font-semibold text-brand-muted">Created</dt>
                  <dd>{formatDate(order.createdAt)}</dd>
                </div>
                {order.status === 'pending' && (
                  <Button
                    onClick={() => confirmMutation.mutate(order.orderId)}
                    disabled={confirmMutation.isPending}
                  >
                    {confirmMutation.isPending ? 'Confirming…' : 'Confirm payment'}
                  </Button>
                )}
                {confirmMutation.error && <Alert variant="error">{confirmMutation.error.message}</Alert>}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
