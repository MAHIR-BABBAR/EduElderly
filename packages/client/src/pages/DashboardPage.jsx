import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, Flag, Sparkles, Zap } from 'lucide-react';
import { certificateApi, courseApi, enrollmentApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useCategories } from '@/hooks/useCategories';
import { worldFor, WORLD_LABELS } from '@/lib/worlds';
import { firstName, greeting, hours, ofTotal, plural, relativeDay } from '@/lib/format';
import { usePageTitle } from '@/components/layout/RouteChange';
import { SkyBand } from '@/components/ui/sky-band';
import { Bento, BentoTile } from '@/components/ui/bento';
import { CourseCover } from '@/components/ui/course-cover';
import { Trail } from '@/components/ui/trail';
import { Meter } from '@/components/ui/meter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * The learner's home (plan S-1). One glance answers "where was I?" and one
 * tap resumes. The greeting band reflects the time of day (SIG-5); the bento
 * below shows the course in progress as a trail (SIG-6) in its subject
 * world (SIG-2), real numbers as stats, finished courses, and one suggestion
 * whose cover morphs into the course page (SIG-7).
 */
export function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const name = firstName(profile?.name);
  usePageTitle('My learning');

  const enrollmentsQuery = useQuery({ queryKey: ['enrollments'], queryFn: () => enrollmentApi.list() });
  const certificatesQuery = useQuery({ queryKey: ['my-certificates'], queryFn: () => certificateApi.listMine() });
  const catalogQuery = useQuery({ queryKey: ['courses', { limit: 6 }], queryFn: () => courseApi.list({ limit: 6 }) });
  const { byId: categories } = useCategories();

  const enrollments = enrollmentsQuery.data?.data ?? [];
  const active = enrollments
    .filter((e) => e.status === 'active' && (e.progressPercent ?? 0) < 100)
    .sort((a, b) => new Date(b.lastAccessedAt || 0) - new Date(a.lastAccessedAt || 0));
  const completed = enrollments.filter((e) => e.status === 'completed' || (e.progressPercent ?? 0) >= 100);
  const current = active[0];

  // Lesson titles for the trail come from the course itself; only the course
  // being continued needs them, so this is the one extra request on the page.
  const currentCourseQuery = useQuery({
    queryKey: ['course', current?.courseId],
    queryFn: () => courseApi.getById(current.courseId),
    enabled: Boolean(current?.courseId),
  });

  const certificates = certificatesQuery.data?.data ?? [];
  const lessonsDone = enrollments.reduce((sum, e) => sum + (e.completedTopics?.length ?? 0), 0);
  const enrolledIds = new Set(enrollments.map((e) => e.courseId));
  const suggestion = (catalogQuery.data?.data ?? []).find((c) => !enrolledIds.has(c.courseId));

  const worldOf = (course) => {
    const category = course?.categoryId ? categories.get(course.categoryId) : undefined;
    return worldFor({ categorySlug: category?.slug, categoryName: category?.name, categoryId: course?.categoryId });
  };

  const isLoading = enrollmentsQuery.isLoading;
  const error = enrollmentsQuery.error;

  return (
    <div className="page-container pb-24 md:pb-12">
      <SkyBand className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-on-night-muted">My learning</p>
        <h1 className="mt-2 font-display text-hero text-brand-on-night" tabIndex={-1}>
          <GreetingLine name={name} />
        </h1>
        {current ? (
          <>
            <p className="mt-4 max-w-[40ch] text-lg text-brand-on-night-muted">
              You are {current.progressPercent ?? 0}% through <span className="font-semibold text-brand-on-night">{current.course?.title}</span>.
              {current.lastAccessedAt ? ` Last opened ${relativeDay(current.lastAccessedAt)}.` : ''}
            </p>
            <Button asChild size="lg" variant="accent" className="mt-6 min-h-touch-primary">
              <Link to={`/learn/${current.enrollmentId}`}>
                Resume lesson
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
          </>
        ) : (
          <p className="mt-4 max-w-[40ch] text-lg text-brand-on-night-muted">
            {isLoading ? 'Finding where you left off…' : 'A good day to start something new.'}
          </p>
        )}
      </SkyBand>

      {error && (
        <Alert variant="error" className="mb-6">
          We could not load your progress.{' '}
          <button type="button" className="font-semibold underline" onClick={() => enrollmentsQuery.refetch()}>
            Try again
          </button>
        </Alert>
      )}

      {isLoading && <DashboardSkeleton />}

      {!isLoading && !error && enrollments.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="You have not started a course yet"
          description="Pick something that interests you. Every course is self-paced and you can stop at any time."
          actionLabel="Browse courses"
          actionHref="/courses"
        />
      )}

      {!isLoading && enrollments.length > 0 && (
        <Bento>
          {current && (
            <BentoTile span="wide" tone="world" data-world={worldOf(current.course)} className="p-0">
              <ContinueCard
                enrollment={current}
                course={currentCourseQuery.data?.data}
                world={worldOf(current.course)}
              />
            </BentoTile>
          )}

          {/* Two stats share one column so the row stays balanced next to the tall continue card. */}
          <BentoTile span="md" tone="raised" className="grid gap-5 border-0 bg-transparent p-0 shadow-none">
            <div className="on-night rounded-lg bg-brand-night p-6 text-brand-on-night shadow-lift">
              <Stat icon={Flag} label="Lessons finished" value={lessonsDone} hint={plural(enrollments.length, 'course')} />
            </div>
            <div className="rounded-lg border border-brand-border bg-brand-surface-raised p-6 shadow-card">
              <Stat icon={Zap} label="Points earned" value={profile?.totalXP ?? 0} hint="Every finished lesson adds up" tone="accent" />
            </div>
          </BentoTile>

          <BentoTile span="md" tone="accent" as="div">
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand-surface-raised shadow-card">
                  <Award className="h-6 w-6 text-brand-accent-ink" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-muted">Certificates</p>
                  <p className="font-display text-3xl tabular text-brand-primary-dark">
                    {certificatesQuery.isLoading ? '…' : certificates.length}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="self-start">
                <Link to="/certificates">{certificates.length ? 'View certificates' : 'How to earn one'}</Link>
              </Button>
            </div>
          </BentoTile>

          {completed.map((enrollment) => (
            <BentoTile key={enrollment.enrollmentId} span="md" tone="raised" data-world={worldOf(enrollment.course)} className="p-0">
              <CompletedCard enrollment={enrollment} world={worldOf(enrollment.course)} />
            </BentoTile>
          ))}

          {suggestion && (
            <BentoTile span="md" tone="raised" data-world={worldOf(suggestion)} className="p-0">
              <SuggestionCard course={suggestion} world={worldOf(suggestion)} />
            </BentoTile>
          )}
        </Bento>
      )}
    </div>
  );
}

/** "Good evening, Margaret." with the time word as the italic accent. */
function GreetingLine({ name }) {
  const [good, part] = greeting().split(' ');
  return (
    <>
      {good} <span className="accent-word">{part}</span>
      {name ? `, ${name}.` : '.'}
    </>
  );
}

function Stat({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <span className={tone === 'accent' ? 'flex h-12 w-12 items-center justify-center rounded-md bg-brand-accent-soft' : 'flex h-12 w-12 items-center justify-center rounded-md bg-white/10'}>
        <Icon className={tone === 'accent' ? 'h-6 w-6 text-brand-accent-ink' : 'h-6 w-6 text-brand-accent'} aria-hidden="true" />
      </span>
      <div>
        <p className="font-display text-3xl tabular leading-none">{value}</p>
        <p className="mt-2 font-semibold">{label}</p>
        {hint && <p className="mt-1 text-sm opacity-80">{hint}</p>}
      </div>
    </div>
  );
}

function ContinueCard({ enrollment, course, world }) {
  const total = enrollment.course?.topicCount ?? course?.totalTopics ?? 0;
  const done = enrollment.completedTopics?.length ?? 0;
  const completedSet = new Set(enrollment.completedTopics ?? []);
  const topics = (course?.modules ?? []).flatMap((m) => m.topics ?? []);
  const trail = topics.map((topic) => ({
    id: topic.topicId,
    title: topic.title,
    state: completedSet.has(topic.topicId)
      ? 'done'
      : topic.topicId === (enrollment.currentLessonId ?? topics.find((t) => !completedSet.has(t.topicId))?.topicId)
        ? 'current'
        : 'upcoming',
    href: `/learn/${enrollment.enrollmentId}?topic=${topic.topicId}`,
  }));

  return (
    <article className="flex h-full flex-col gap-0 md:flex-row">
      <div className="md:w-2/5">
        <CourseCover
          title={enrollment.course?.title}
          courseId={enrollment.courseId}
          src={enrollment.course?.thumbnailUrl}
          world={world}
          ratio="4 / 3"
          priority
          className="h-full rounded-none border-0 md:rounded-l-lg"
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="world">{WORLD_LABELS[world]}</Badge>
          <Badge variant="outline">Continue</Badge>
        </div>
        <h2 className="font-display text-2xl text-brand-primary-dark">
          <Link to={`/courses/${enrollment.courseId}`} className="hover:underline">
            {enrollment.course?.title}
          </Link>
        </h2>
        <Meter value={done} max={total || 1} noun="lesson" label="Lessons" />
        {trail.length > 0 ? (
          <Trail items={trail} orientation="horizontal" compact label="Lessons in this course" />
        ) : (
          <div className="flex gap-3" aria-hidden="true">
            <Skeleton className="h-14 w-40" />
            <Skeleton className="h-14 w-40" />
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
          <Button asChild className="min-h-touch-primary">
            <Link to={`/learn/${enrollment.enrollmentId}`}>
              Continue lesson {Math.min(done + 1, Math.max(total, 1))}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to={`/quiz/${enrollment.courseId}`}>Take the quiz</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function CompletedCard({ enrollment, world }) {
  return (
    <article className="flex h-full flex-col">
      <CourseCover
        title={enrollment.course?.title}
        courseId={enrollment.courseId}
        src={enrollment.course?.thumbnailUrl}
        world={world}
        ratio="16 / 8"
        className="rounded-none rounded-t-lg border-0"
      >
        <div className="flex items-center gap-2">
          <Badge variant="night">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Completed
          </Badge>
        </div>
      </CourseCover>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="text-xl font-semibold text-brand-text">{enrollment.course?.title}</h2>
        <p className="text-sm text-brand-muted">
          {ofTotal(enrollment.completedTopics?.length ?? 0, enrollment.course?.topicCount ?? enrollment.completedTopics?.length ?? 0, 'lesson')}
          {enrollment.completedAt ? ` · finished ${relativeDay(enrollment.completedAt)}` : ''}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {enrollment.certificateIssued ? (
            <Button asChild variant="outline">
              <Link to="/certificates">
                <Award className="h-5 w-5" aria-hidden="true" />
                View certificate
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link to={`/quiz/${enrollment.courseId}`}>Pass the quiz for your certificate</Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function SuggestionCard({ course, world }) {
  return (
    <article className="flex h-full flex-col">
      <Link
        to={`/courses/${course.courseId}`}
        className="group flex h-full flex-col focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink"
      >
        <CourseCover
          title={course.title}
          courseId={course.courseId}
          src={course.thumbnailUrl}
          world={world}
          ratio="16 / 8"
          layoutId={`cover-${course.courseId}`}
          className="rounded-none rounded-t-lg border-0"
        >
          <Badge variant="night">Suggested next</Badge>
        </CourseCover>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="world">{WORLD_LABELS[world]}</Badge>
            <Badge variant="outline">{course.isPaid ? 'Paid' : 'Free'}</Badge>
          </div>
          <h2 className="text-xl font-semibold text-brand-text group-hover:underline">{course.title}</h2>
          <p className="text-sm text-brand-muted">
            {plural(course.totalTopics ?? 0, 'lesson')} · {hours(course.estimatedHours)}
          </p>
          <span className="mt-auto inline-flex items-center gap-2 pt-2 font-semibold text-brand-primary">
            See the course
            <ArrowRight className="h-5 w-5 transition-transform duration-fast group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-6 lg:grid-cols-12" role="status" aria-label="Loading your courses">
      <Skeleton className="h-64 md:col-span-6 lg:col-span-8" />
      <Skeleton className="h-64 md:col-span-3 lg:col-span-2" />
      <Skeleton className="h-64 md:col-span-3 lg:col-span-2" />
      <Skeleton className="h-56 md:col-span-3 lg:col-span-4" />
      <Skeleton className="h-56 md:col-span-3 lg:col-span-4" />
    </div>
  );
}
