import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { courseAdminApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export function AdminCourseEditPage() {
  const { courseId } = useParams();
  const queryClient = useQueryClient();
  const [moduleTitle, setModuleTitle] = useState('');
  const [topicForms, setTopicForms] = useState({});

  const courseQuery = useQuery({
    queryKey: ['admin-course', courseId],
    queryFn: () => courseAdminApi.getById(courseId),
  });

  const course = courseQuery.data?.data;

  const updateMutation = useMutation({
    mutationFn: (body) => courseAdminApi.update(courseId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-course', courseId] }),
  });

  const createModuleMutation = useMutation({
    mutationFn: () => courseAdminApi.createModule(courseId, { title: moduleTitle, order: (course?.modules?.length || 0) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-course', courseId] });
      setModuleTitle('');
    },
  });

  const createTopicMutation = useMutation({
    mutationFn: ({ moduleId, body }) => courseAdminApi.createTopic(moduleId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-course', courseId] }),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (moduleId) => courseAdminApi.deleteModule(moduleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-course', courseId] }),
  });

  const deleteTopicMutation = useMutation({
    mutationFn: (topicId) => courseAdminApi.deleteTopic(topicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-course', courseId] }),
  });

  if (courseQuery.isLoading) {
    return <p role="status">Loading course…</p>;
  }

  if (courseQuery.error || !course) {
    return <Alert variant="error">{courseQuery.error?.message || 'Course not found.'}</Alert>;
  }

  const getTopicForm = (moduleId) =>
    topicForms[moduleId] || {
      title: '',
      contentType: 'video',
      contentUrl: '',
      durationMinutes: 5,
      order: 0,
    };

  const setTopicForm = (moduleId, patch) => {
    setTopicForms((prev) => ({
      ...prev,
      [moduleId]: { ...getTopicForm(moduleId), ...patch },
    }));
  };

  return (
    <>
      <PageHeader
        title={course.title}
        description="Edit course details, modules, and topics."
      >
        <Button asChild variant="outline">
          <Link to="/admin/courses">Back to courses</Link>
        </Button>
      </PageHeader>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Course details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Title" htmlFor="edit-title">
            <Input
              id="edit-title"
              defaultValue={course.title}
              onBlur={(e) => {
                if (e.target.value !== course.title) {
                  updateMutation.mutate({ title: e.target.value });
                }
              }}
            />
          </FormField>
          <FormField label="Description" htmlFor="edit-desc">
            <Input
              id="edit-desc"
              defaultValue={course.description || ''}
              onBlur={(e) => {
                if (e.target.value !== (course.description || '')) {
                  updateMutation.mutate({ description: e.target.value });
                }
              }}
            />
          </FormField>
          {updateMutation.error && <Alert variant="error">{updateMutation.error.message}</Alert>}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add module</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input
            value={moduleTitle}
            onChange={(e) => setModuleTitle(e.target.value)}
            placeholder="Module title"
            className="max-w-md"
            aria-label="Module title"
          />
          <Button
            onClick={() => createModuleMutation.mutate()}
            disabled={!moduleTitle.trim() || createModuleMutation.isPending}
          >
            Add module
          </Button>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-4">
        {(course.modules || []).map((mod) => (
          <AccordionItem key={mod.moduleId} value={mod.moduleId} className="card-surface px-4">
            <AccordionTrigger>
              <span className="flex w-full items-center justify-between gap-4 pr-4">
                {mod.title}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete module "${mod.title}"?`)) {
                      deleteModuleMutation.mutate(mod.moduleId);
                    }
                  }}
                >
                  Delete module
                </Button>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="mb-4 space-y-2">
                {(mod.topics || []).map((topic) => (
                  <li key={topic.topicId} className="flex items-center justify-between rounded-lg border border-brand-border p-3">
                    <span>{topic.title}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm(`Delete topic "${topic.title}"?`)) {
                          deleteTopicMutation.mutate(topic.topicId);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="grid gap-3 rounded-lg border border-brand-border p-4 md:grid-cols-2">
                <Input
                  placeholder="Topic title"
                  value={getTopicForm(mod.moduleId).title}
                  onChange={(e) => setTopicForm(mod.moduleId, { title: e.target.value })}
                />
                <Input
                  placeholder="Content URL"
                  value={getTopicForm(mod.moduleId).contentUrl}
                  onChange={(e) => setTopicForm(mod.moduleId, { contentUrl: e.target.value })}
                />
                <select
                  className="min-h-touch rounded-lg border border-brand-border px-3"
                  value={getTopicForm(mod.moduleId).contentType}
                  onChange={(e) => setTopicForm(mod.moduleId, { contentType: e.target.value })}
                >
                  <option value="video">Video</option>
                  <option value="article">Article</option>
                </select>
                <Input
                  type="number"
                  min="1"
                  placeholder="Duration (min)"
                  value={getTopicForm(mod.moduleId).durationMinutes}
                  onChange={(e) =>
                    setTopicForm(mod.moduleId, { durationMinutes: Number(e.target.value) })
                  }
                />
                <Button
                  className="md:col-span-2"
                  onClick={() => {
                    const body = {
                      ...getTopicForm(mod.moduleId),
                      order: mod.topics?.length || 0,
                    };
                    createTopicMutation.mutate({ moduleId: mod.moduleId, body });
                    setTopicForm(mod.moduleId, { title: '', contentUrl: '', durationMinutes: 5 });
                  }}
                  disabled={!getTopicForm(mod.moduleId).title.trim()}
                >
                  Add topic
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}
