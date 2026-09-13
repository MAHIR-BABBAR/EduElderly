import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryAdminApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

export function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryAdminApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => categoryAdminApi.create({ name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setName('');
      setDescription('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => categoryAdminApi.update(editingId, { name: editName, description: editDescription }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId) => categoryAdminApi.delete(categoryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const categories = categoriesQuery.data?.data || [];

  return (
    <>
      <PageHeader title="Categories" description="Organize courses by topic area." />

      <Card className="mb-8">
        <CardContent className="space-y-4 p-6">
          <h2 className="font-semibold">Add category</h2>
          <FormField label="Name" htmlFor="cat-name" required>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>
          <FormField label="Description" htmlFor="cat-desc">
            <Input id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          {createMutation.error && <Alert variant="error">{createMutation.error.message}</Alert>}
          <Button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending}>
            Add category
          </Button>
        </CardContent>
      </Card>

      {categoriesQuery.isLoading && <p role="status">Loading categories…</p>}
      {categoriesQuery.error && <Alert variant="error">{categoriesQuery.error.message}</Alert>}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-brand-border bg-brand-surface">
                <th className="px-4 py-3 font-semibold" scope="col">Name</th>
                <th className="px-4 py-3 font-semibold" scope="col">Description</th>
                <th className="px-4 py-3 font-semibold" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.categoryId} className="border-b border-brand-border">
                  <td className="px-4 py-3">
                    {editingId === cat.categoryId ? (
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    ) : (
                      cat.name
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === cat.categoryId ? (
                      <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                    ) : (
                      cat.description || '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {editingId === cat.categoryId ? (
                        <>
                          <Button size="sm" onClick={() => updateMutation.mutate()}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(cat.categoryId);
                              setEditName(cat.name);
                              setEditDescription(cat.description || '');
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (window.confirm(`Delete category "${cat.name}"?`)) {
                                deleteMutation.mutate(cat.categoryId);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
