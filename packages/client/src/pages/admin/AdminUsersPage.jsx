import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userAdminApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const usersQuery = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => userAdminApi.list(search ? { q: search } : {}),
  });

  const detailQuery = useQuery({
    queryKey: ['admin-user', selectedId],
    queryFn: () => userAdminApi.getById(selectedId),
    enabled: Boolean(selectedId),
  });

  const users = usersQuery.data?.data || [];
  const selected = detailQuery.data?.data;

  return (
    <>
      <PageHeader title="Users" description="Search and review learner and admin accounts." />

      <div className="mb-6 flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email"
          className="max-w-md"
          aria-label="Search users"
        />
        <Button variant="outline" onClick={() => usersQuery.refetch()}>
          Search
        </Button>
      </div>

      {usersQuery.isLoading && <p role="status">Loading users…</p>}
      {usersQuery.error && <Alert variant="error">{usersQuery.error.message}</Alert>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-brand-border bg-brand-surface">
                  <th className="px-4 py-3 font-semibold" scope="col">Name</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Email</th>
                  <th className="px-4 py-3 font-semibold" scope="col">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.userId}
                    className="cursor-pointer border-b border-brand-border hover:bg-brand-accent-soft/40"
                    onClick={() => setSelectedId(user.userId)}
                  >
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3 text-brand-muted">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge className="capitalize">{user.role}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && !usersQuery.isLoading && (
              <p className="p-4 text-brand-muted">No users found.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            {!selectedId && <p className="text-brand-muted">Select a user to view details.</p>}
            {detailQuery.isLoading && selectedId && <p role="status">Loading user…</p>}
            {selected && (
              <dl className="space-y-3">
                <div>
                  <dt className="text-[length:var(--font-size-sm)] font-semibold text-brand-muted">Name</dt>
                  <dd>{selected.name}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--font-size-sm)] font-semibold text-brand-muted">Email</dt>
                  <dd>{selected.email}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--font-size-sm)] font-semibold text-brand-muted">Role</dt>
                  <dd className="capitalize">{selected.role}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--font-size-sm)] font-semibold text-brand-muted">Total XP</dt>
                  <dd>{selected.totalXP ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-[length:var(--font-size-sm)] font-semibold text-brand-muted">User ID</dt>
                  <dd className="break-all text-[length:var(--font-size-sm)]">{selected.userId}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
