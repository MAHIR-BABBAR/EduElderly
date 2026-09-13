import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Clock, Layers } from 'lucide-react';
import { courseApi, enrollmentApi, paymentApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

export function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const [checkout, setCheckout] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => courseApi.getById(courseId),
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollmentApi.enroll(courseId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      if (res.data?.requiresPayment) {
        setCheckout(res.data.checkout);
      } else {
        navigate('/dashboard');
      }
    },
  });

  const payMutation = useMutation({
    mutationFn: () => paymentApi.confirmOrder(checkout.orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      navigate('/dashboard');
    },
  });

  const course = data?.data;

  if (isLoading) {
    return (
      <div className="page-container max-w-5xl space-y-6 pb-24 md:pb-8">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="page-container pb-24 md:pb-8">
        <Alert variant="error">Course not found or could not be loaded.</Alert>
      </div>
    );
  }

  const handleEnroll = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/courses/${courseId}` } });
      return;
    }
    enrollMutation.mutate();
  };

  return (
    <div className="page-container max-w-5xl pb-24 md:pb-8">
      <Breadcrumbs
        items={[
          { label: 'Courses', href: '/courses' },
          { label: course.title },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="capitalize">{course.difficulty}</Badge>
              {course.isPaid && <Badge variant="warning">Paid course</Badge>}
            </div>
            <h1 className="font-display text-[length:var(--font-size-2xl)] text-brand-primary-dark">{course.title}</h1>
            <p className="mt-4 text-brand-muted">{course.description}</p>
            <p className="mt-2 text-[length:var(--font-size-sm)] text-brand-muted">
              Instructor: {course.instructorName}
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-[length:var(--font-size-xl)] font-semibold">Course syllabus</h2>
            <Accordion type="multiple" className="card-surface px-6">
              {(course.modules || []).map((mod) => (
                <AccordionItem key={mod.moduleId} value={mod.moduleId}>
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                      {mod.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      {(mod.topics || []).map((topic) => (
                        <li key={topic.topicId} className="flex items-center gap-2 text-brand-muted">
                          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{topic.title}</span>
                          <span className="text-[length:var(--font-size-sm)]">({topic.durationMinutes} min)</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Enroll in this course</CardTitle>
              <CardDescription>
                {course.moduleCount} modules · {course.totalTopics} topics · {course.estimatedHours} hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[length:var(--font-size-2xl)] font-bold text-brand-primary">{formatPrice(course.price)}</p>

              {enrollMutation.error && <Alert variant="error">{enrollMutation.error.message}</Alert>}

              {checkout && (
                <div className="space-y-3 rounded-lg border-2 border-brand-warning bg-[var(--color-warning-soft)] p-4">
                  <p className="font-semibold text-brand-warning">Payment required</p>
                  <p className="text-[length:var(--font-size-sm)]">Order: {checkout.orderId}</p>
                  <Button className="w-full" onClick={() => payMutation.mutate()} disabled={payMutation.isPending}>
                    {payMutation.isPending ? 'Processing…' : 'Complete mock checkout'}
                  </Button>
                  {payMutation.error && <Alert variant="error">{payMutation.error.message}</Alert>}
                </div>
              )}

              {!checkout && (
                <Button size="lg" className="w-full" onClick={handleEnroll} disabled={enrollMutation.isPending}>
                  {enrollMutation.isPending ? 'Enrolling…' : course.isPaid ? 'Enroll (paid)' : 'Enroll for free'}
                </Button>
              )}
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link to="/courses">Back to catalog</Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
