import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Clock, Layers, ShieldCheck, UserRound } from 'lucide-react';
import { courseApi, enrollmentApi, paymentApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useCourseWorld } from '@/hooks/useCategories';
import { WORLD_LABELS } from '@/lib/worlds';
import { hours, plural, price } from '@/lib/format';
import { usePageTitle } from '@/components/layout/RouteChange';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Skeleton, TextSkeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { CourseCover } from '@/components/ui/course-cover';
import { Trail } from '@/components/ui/trail';
import { EmptyState } from '@/components/ui/empty-state';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

/**
 * Course page (plan S-3). The cover that was tapped in the catalog morphs into
 * a world-tinted hero (SIG-7), the title gets its editorial size, and the
 * syllabus is drawn as a trail (SIG-6) — locked for visitors, live for a
 * learner who is enrolled. The enrol card is sticky on desktop and becomes a
 * bottom sheet behind a sticky price bar on phones.
 */
export function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const [checkout, setCheckout] = useState(null);

  const courseQuery = useQuery({ queryKey: ['course', courseId], queryFn: () => courseApi.getById(courseId) });
  const enrollmentsQuery = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => enrollmentApi.list(),
    enabled: isAuthenticated,
  });
  const course = courseQuery.data?.data;
  const { world, category } = useCourseWorld(course);
  usePageTitle(course?.title || 'Course');

  const enrollment = (enrollmentsQuery.data?.data ?? []).find(
    (e) => e.courseId === courseId && ['active', 'completed'].includes(e.status),
  );

  const enrollMutation = useMutation({
    mutationFn: () => enrollmentApi.enroll(courseId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      if (res.data?.requiresPayment) setCheckout(res.data.checkout);
      else navigate(res.data?.enrollmentId ? `/learn/${res.data.enrollmentId}` : '/dashboard');
    },
  });

  const payMutation = useMutation({
    mutationFn: () => paymentApi.confirmOrder(checkout.orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      navigate('/dashboard');
    },
  });

  if (courseQuery.isLoading) return <DetailSkeleton />;

  if (courseQuery.error || !course) {
    return (
      <div className="page-container pb-24 md:pb-12">
        <EmptyState
          icon={BookOpen}
          title="We could not find that course"
          description="It may have been removed, or the link may be incomplete."
          actionLabel="Browse all courses"
          actionHref="/courses"
        />
      </div>
    );
  }

  const handleEnroll = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/courses/${courseId}`, message: 'Sign in to enrol in this course.' } });
      return;
    }
    enrollMutation.mutate();
  };

  const topics = (course.modules ?? []).flatMap((m) => (m.topics ?? []).map((t) => ({ ...t, moduleTitle: m.title })));
  const completed = new Set(enrollment?.completedTopics ?? []);
  const nextTopicId = enrollment ? topics.find((t) => !completed.has(t.topicId))?.topicId : null;
  const trail = topics.map((t) => ({
    id: t.topicId,
    title: t.title,
    meta: t.durationMinutes ? `${t.durationMinutes} min` : undefined,
    state: !enrollment ? 'locked' : completed.has(t.topicId) ? 'done' : t.topicId === nextTopicId ? 'current' : 'upcoming',
    href: enrollment ? `/learn/${enrollment.enrollmentId}?topic=${t.topicId}` : undefined,
  }));

  const cta = enrollment
    ? { label: enrollment.status === 'completed' ? 'Review the course' : 'Continue learning', to: `/learn/${enrollment.enrollmentId}` }
    : null;

  const enrolPanel = (
    <EnrolPanel
      course={course}
      cta={cta}
      checkout={checkout}
      onEnroll={handleEnroll}
      enrollMutation={enrollMutation}
      payMutation={payMutation}
    />
  );

  return (
    <div className="page-container pb-28 md:pb-12" data-world={world}>
      <Breadcrumbs items={[{ label: 'Courses', href: '/courses' }, { label: course.title }]} />

      {/* Hero: cover beside editorial title on the world's soft surface. */}
      <section className="mt-4 overflow-hidden rounded-xl border border-brand-border bg-world-soft">
        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,380px)_1fr] lg:items-center">
          <CourseCover
            title={course.title}
            courseId={course.courseId}
            src={course.thumbnailUrl}
            world={world}
            ratio="4 / 3"
            priority
            layoutId={`cover-${course.courseId}`}
            className="rounded-xl shadow-lift"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="world">{category?.name || WORLD_LABELS[world]}</Badge>
              {course.difficulty && <Badge variant="outline" className="capitalize">{course.difficulty}</Badge>}
              <Badge variant="outline">{price(course.price)}</Badge>
            </div>
            <h1 className="mt-4 font-display text-display text-brand-primary-dark" tabIndex={-1}>
              <AccentTitle title={course.title} />
            </h1>
            <p className="mt-4 max-w-[60ch] text-lg text-brand-text">{course.description}</p>
            <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-brand-muted">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-world" aria-hidden="true" />
                <dt className="sr-only">Length</dt>
                <dd>{plural(course.totalTopics ?? topics.length, 'lesson')}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-world" aria-hidden="true" />
                <dt className="sr-only">Time</dt>
                <dd>{hours(course.estimatedHours)}</dd>
              </div>
              <div className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-world" aria-hidden="true" />
                <dt className="sr-only">Instructor</dt>
                <dd>{course.instructorName}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="syllabus">
          <h2 id="syllabus" className="font-display text-2xl text-brand-primary-dark">What you will learn</h2>
          <p className="mt-2 text-brand-muted">
            {enrollment
              ? 'Pick any lesson to jump straight to it.'
              : 'Enrol to open the lessons. You can stop and come back any time.'}
          </p>
          {trail.length > 0 ? (
            <div className="mt-6 rounded-lg border border-brand-border bg-brand-surface-raised p-4 sm:p-6">
              {(course.modules ?? []).map((mod) => (
                <div key={mod.moduleId} className="mb-6 last:mb-0">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-brand-muted">{mod.title}</h3>
                  <Trail items={trail.filter((t) => (mod.topics ?? []).some((x) => x.topicId === t.id))} label={mod.title} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-brand-muted">Lessons are being prepared.</p>
          )}
          {course.credits && (
            <p className="mt-6 flex items-start gap-2 text-sm text-brand-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{course.credits}</span>
            </p>
          )}
        </section>

        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">{enrolPanel}</aside>
      </div>

      {/* Phones: sticky bar with price + primary action; details in a sheet. */}
      <div className="fixed inset-x-0 bottom-[64px] z-30 border-t border-brand-border bg-brand-surface-raised/95 p-3 backdrop-blur md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-content items-center justify-between gap-3">
          <p className="font-display text-xl text-brand-primary-dark">{price(course.price)}</p>
          <Sheet>
            <SheetTrigger asChild>
              <Button className="min-h-touch-primary flex-1">
                {cta ? cta.label : course.isPaid ? 'Enrol' : 'Enrol for free'}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" title={course.title}>
              {enrolPanel}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

/** Italicise the last word of the title as the accent (SIG-3), never the whole. */
function AccentTitle({ title = '' }) {
  const words = title.trim().split(/\s+/);
  if (words.length < 3) return title;
  const last = words.pop();
  return (
    <>
      {words.join(' ')} <span className="accent-word">{last}</span>
    </>
  );
}

function EnrolPanel({ course, cta, checkout, onEnroll, enrollMutation, payMutation }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface-raised p-6 shadow-card">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-muted">
        {course.isPaid ? 'One-time price' : 'This course is'}
      </p>
      <p className="mt-1 font-display text-3xl text-brand-primary-dark">{price(course.price)}</p>
      <ul className="mt-4 space-y-2 text-brand-muted">
        <li>{plural(course.totalTopics ?? 0, 'lesson')}, {hours(course.estimatedHours).toLowerCase()}</li>
        <li>Self-paced — no deadlines</li>
        <li>Certificate when you finish</li>
      </ul>

      {enrollMutation.error && <Alert variant="error" className="mt-4">{enrollMutation.error.message}</Alert>}

      {checkout ? (
        <div className="mt-5 space-y-3 rounded-md border border-brand-border bg-brand-accent-soft p-4">
          <p className="font-semibold text-brand-text">Almost there — confirm your payment</p>
          <p className="text-sm text-brand-muted">Order {checkout.orderId}</p>
          <Button className="min-h-touch-primary w-full" onClick={() => payMutation.mutate()} loading={payMutation.isPending} loadingLabel="Processing…">
            Pay {price(course.price)}
          </Button>
          {payMutation.error && <Alert variant="error">{payMutation.error.message}</Alert>}
        </div>
      ) : cta ? (
        <Button asChild size="lg" className="mt-5 min-h-touch-primary w-full">
          <Link to={cta.to}>
            {cta.label}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <Button size="lg" className="mt-5 min-h-touch-primary w-full" onClick={onEnroll} loading={enrollMutation.isPending} loadingLabel="Enrolling…">
          {course.isPaid ? 'Enrol and pay' : 'Enrol for free'}
        </Button>
      )}
      {course.isPaid && !checkout && !cta && (
        <p className="mt-3 text-sm text-brand-muted">You will confirm the payment on the next step.</p>
      )}
      <Button asChild variant="ghost" className="mt-2 w-full">
        <Link to="/courses">Back to all courses</Link>
      </Button>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="page-container pb-24 md:pb-12" role="status" aria-label="Loading course">
      <Skeleton className="h-5 w-48" />
      <div className="mt-4 grid gap-6 rounded-xl border border-brand-border bg-brand-surface-sunken p-8 lg:grid-cols-[380px_1fr]">
        <Skeleton className="aspect-[4/3] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-12 w-3/4" />
          <TextSkeleton lines={3} />
        </div>
      </div>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <TextSkeleton lines={6} />
        <Skeleton className="h-72 w-full" />
      </div>
    </div>
  );
}
