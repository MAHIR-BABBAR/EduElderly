import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoryAdminApi, courseAdminApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const emptyCourse = {
  title: '',
  description: '',
  categoryId: '',
  instructorName: '',
  isPaid: false,
  price: 0,
  difficulty: 'beginner',
  estimatedHours: 1,
};

export function AdminCoursesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyCourse);

  const coursesQuery = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => courseAdminApi.list({ limit: '50' }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryAdminApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => courseAdminApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      setCreateOpen(false);
      setForm(emptyCourse);
    },
  });

  const publishMutation = useMutation({
    mutationFn: ({ courseId, isPublished }) => courseAdminApi.publish(courseId, isPublished),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-courses'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (courseId) => courseAdminApi.delete(courseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-courses'] }),
  });

  const courses = coursesQuery.data?.data || [];
  const categories = categoriesQuery.data?.data || [];

  return (
    <>
      <PageHeader title="Courses" description="Create, publish, and manage course content.">
        <Button onClick={() => setCreateOpen(true)}>New course</Button>
      </PageHeader>

      {coursesQuery.isLoading && <p role="status">Loading courses…</p>}
      {coursesQuery.error && <Alert variant="error">{coursesQuery.error.message}</Alert>}

      <Card>
        <CardContent className="overflow-x-auto p-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink" tabIndex={0} role="region" aria-label="Table, scrolls sideways when wide">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-brand-border bg-brand-surface">
                <th className="px-4 py-3 font-semibold" scope="col">Title</th>
                <th className="px-4 py-3 font-semibold" scope="col">Status</th>
                <th className="px-4 py-3 font-semibold" scope="col">Paid</th>
                <th className="px-4 py-3 font-semibold" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.courseId} className="border-b border-brand-border">
                  <td className="px-4 py-3">
                    <Link to={`/admin/courses/${course.courseId}`} className="font-semibold text-brand-primary hover:underline">
                      {course.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={course.isPublished ? 'success' : 'warning'}>
                      {course.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{course.isPaid ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          publishMutation.mutate({
                            courseId: course.courseId,
                            isPublished: !course.isPublished,
                          })
                        }
                      >
                        {course.isPublished ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (window.confirm(`Delete "${course.title}"?`)) {
                            deleteMutation.mutate(course.courseId);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {courses.length === 0 && !coursesQuery.isLoading && (
            <p className="p-4 text-brand-muted">No courses yet.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create course</DialogTitle>
            <DialogDescription>Add a new course to the catalog.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <FormField label="Title" htmlFor="course-title" required>
              <Input
                id="course-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Description" htmlFor="course-desc">
              <Input
                id="course-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
            <FormField label="Category" htmlFor="course-category" required>
              <select
                id="course-category"
                className="min-h-touch w-full rounded-lg border border-brand-border px-3"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.categoryId} value={cat.categoryId}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Instructor" htmlFor="course-instructor" required>
              <Input
                id="course-instructor"
                value={form.instructorName}
                onChange={(e) => setForm({ ...form, instructorName: e.target.value })}
                required
              />
            </FormField>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isPaid}
                onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}
              />
              Paid course
            </label>
            {form.isPaid && (
              <FormField label="Price (cents)" htmlFor="course-price">
                <Input
                  id="course-price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </FormField>
            )}
            {createMutation.error && <Alert variant="error">{createMutation.error.message}</Alert>}
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create course'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
