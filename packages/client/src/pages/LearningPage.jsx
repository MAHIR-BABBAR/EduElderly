import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Award, Check, ExternalLink, ListChecks, Sparkles } from 'lucide-react';
import { courseApi, enrollmentApi } from '@/lib/api';
import { classifyContentUrl } from '@/lib/utils';
import { useCourseWorld } from '@/hooks/useCategories';
import { ofTotal, plural } from '@/lib/format';
import { celebrate } from '@/lib/motion';
import { usePageTitle } from '@/components/layout/RouteChange';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Meter } from '@/components/ui/meter';
import { Trail } from '@/components/ui/trail';
import { Skeleton, LessonSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

/**
 * Lesson player (plan S-4): a night "focus band" naming the course and the
 * lesson with a meter, the video in a sandboxed frame (SEC-6), and a trail
 * of the whole course on the right so the learner always knows where they
 * are and what is next. `?topic=<id>` opens any lesson; without it the
 * page opens the first unfinished one. Finishing the last lesson earns the
 * one celebration the calm zone allows.
 */
export function LearningPage() {
  const { enrollmentId } = useParams();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const toasts = useToast();
  const headingRef = useRef(null);

  const enrollmentQuery = useQuery({ queryKey: ['enrollment', enrollmentId], queryFn: () => enrollmentApi.get(enrollmentId) });
  const enrollment = enrollmentQuery.data?.data;
  const courseId = enrollment?.courseId;
  const courseQuery = useQuery({ queryKey: ['course', courseId], queryFn: () => courseApi.getById(courseId), enabled: Boolean(courseId) });
  const course = courseQuery.data?.data;
  const { world } = useCourseWorld(course ?? enrollment?.course);

  const topics = useMemo(
    () => (course?.modules ?? []).flatMap((m) => (m.topics ?? []).map((t) => ({ ...t, moduleTitle: m.title }))),
    [course],
  );
  const completed = useMemo(() => new Set(enrollment?.completedTopics ?? []), [enrollment]);
  const nextTopicId = topics.find((t) => !completed.has(t.topicId))?.topicId ?? null;
  const requested = params.get('topic');
  const topicId = topics.some((t) => t.topicId === requested) ? requested : nextTopicId ?? topics[topics.length - 1]?.topicId ?? null;
  const index = topics.findIndex((t) => t.topicId === topicId);
  const topic = index >= 0 ? topics[index] : null;
  const isComplete = enrollment?.status === 'completed' || (enrollment?.progressPercent ?? 0) >= 100;
  const courseTitle = enrollment?.course?.title || course?.title || 'Course';

  usePageTitle(topic ? `${topic.title} · ${courseTitle}` : courseTitle);

  // Focus the lesson heading when the lesson changes so a screen reader lands on it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [topicId]);

  const contentQuery = useQuery({
    queryKey: ['topic-content', enrollmentId, topicId],
    queryFn: () => enrollmentApi.topicContent(enrollmentId, topicId),
    enabled: Boolean(topicId),
  });

  const progressMutation = useMutation({
    mutationFn: (id) => enrollmentApi.progress(enrollmentId, id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['my-certificates'] });
      const finishedCourse = res?.data?.status === 'completed' || (res?.data?.progressPercent ?? 0) >= 100;
      if (finishedCourse) {
        setParams({}, { replace: true });
      } else {
        toasts.success('Lesson finished', { description: 'Nice work. The next one is ready when you are.' });
        const following = topics[index + 1];
        if (following) setParams({ topic: following.topicId }, { replace: true });
      }
    },
  });

  if (enrollmentQuery.isLoading || (courseId && courseQuery.isLoading)) return <LearningSkeleton />;

  if (enrollmentQuery.error || !enrollment) {
    return (
      <div className="page-container pb-24 md:pb-12">
        <EmptyState
          icon={ListChecks}
          title="We could not open that course"
          description="It may no longer be in your learning list."
          actionLabel="Back to my learning"
          actionHref="/dashboard"
        />
      </div>
    );
  }

  const content = classifyContentUrl(contentQuery.data?.data?.contentUrl);
  const done = completed.size;
  const total = topics.length || enrollment.course?.topicCount || 0;
  const showCelebration = isComplete && !requested;

  const trailItems = topics.map((t) => ({
    id: t.topicId,
    title: t.title,
    meta: t.durationMinutes ? `${t.durationMinutes} min` : undefined,
    state: completed.has(t.topicId) ? 'done' : t.topicId === topicId ? 'current' : 'upcoming',
    href: `/learn/${enrollmentId}?topic=${t.topicId}`,
  }));

  const trail = <Trail items={trailItems} label="Lessons in this course" />;
  const prev = topics[index - 1];
  const next = topics[index + 1];

  return (
    <div className="page-container pb-28 md:pb-12" data-world={world}>
      {/* Focus band */}
      <section className="on-night relative overflow-hidden rounded-xl bg-brand-night p-6 text-brand-on-night shadow-lift sm:p-8">
        <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1/2 bg-world-gradient opacity-30" />
        <div className="relative z-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-on-night-muted">
              <Link to={`/courses/${courseId}`} className="hover:underline">{courseTitle}</Link>
              {topic?.moduleTitle ? ` · ${topic.moduleTitle}` : ''}
            </p>
            <h1 ref={headingRef} tabIndex={-1} className="mt-2 font-display text-3xl text-brand-on-night focus-visible:outline-none">
              {showCelebration ? (
                <>
                  You finished <span className="accent-word">{courseTitle}</span>
                </>
              ) : topic ? (
                <>
                  <span className="text-brand-on-night-muted">Lesson {index + 1}.</span> {topic.title}
                </>
              ) : (
                courseTitle
              )}
            </h1>
          </div>
          <div className="w-full md:w-72">
            <Meter value={done} max={total || 1} noun="lesson" label="Progress" onNight />
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          {showCelebration ? (
            <CoursePanel enrollment={enrollment} courseId={courseId} courseTitle={courseTitle} nextLessonHref={topics[0] ? `/learn/${enrollmentId}?topic=${topics[0].topicId}` : null} />
          ) : !topic ? (
            <Alert variant="info">This course has no lessons yet.</Alert>
          ) : (
            <>
              {contentQuery.isLoading && <Skeleton className="aspect-video w-full rounded-xl" />}
              {contentQuery.error && (
                <Alert variant="error">
                  We could not load this lesson.{' '}
                  <button type="button" className="font-semibold underline" onClick={() => contentQuery.refetch()}>Try again</button>
                </Alert>
              )}
              {content?.kind === 'youtube' && (
                <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-night shadow-card">
                  <div className="aspect-video">
                    <iframe
                      title={topic.title}
                      src={content.src}
                      className="h-full w-full"
                      // Third-party content is contained: no top-navigation and no
                      // popups. YouTube refuses to play (error 153) without a
                      // Referer, so send the origin only — never the lesson path.
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                      referrerPolicy="strict-origin"
                      allow="encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
              {content?.kind === 'external' && (
                <div className="rounded-xl border border-brand-border bg-brand-surface-raised p-6 shadow-card">
                  <p className="text-lg">This lesson opens on another website.</p>
                  <p className="mt-1 text-brand-muted">It will open in a new tab; come back here to mark it finished.</p>
                  <Button asChild size="lg" className="mt-4">
                    <a href={content.href} target="_blank" rel="noopener noreferrer">
                      Open the lesson
                      <ExternalLink className="h-5 w-5" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              )}
              {!contentQuery.isLoading && !contentQuery.error && !content && (
                <Alert variant="info">This lesson has no content attached yet.</Alert>
              )}

              {progressMutation.error && <Alert variant="error" className="mt-4">{progressMutation.error.message}</Alert>}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {completed.has(topic.topicId) ? (
                  <span className="inline-flex min-h-touch-primary items-center gap-2 rounded-md bg-brand-success-soft px-5 font-semibold text-brand-success">
                    <Check className="h-5 w-5" aria-hidden="true" strokeWidth={3} />
                    Finished
                  </span>
                ) : (
                  <Button
                    size="lg"
                    className="min-h-touch-primary"
                    onClick={() => progressMutation.mutate(topic.topicId)}
                    loading={progressMutation.isPending}
                    loadingLabel="Saving…"
                  >
                    <Check className="h-5 w-5" aria-hidden="true" strokeWidth={3} />
                    Mark lesson finished
                  </Button>
                )}
                {next ? (
                  <Button asChild variant="outline" size="lg" className="min-h-touch-primary">
                    <Link to={`/learn/${enrollmentId}?topic=${next.topicId}`}>
                      Next lesson
                      <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="lg" className="min-h-touch-primary">
                    <Link to={`/quiz/${courseId}`}>
                      Take the quiz
                      <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </Link>
                  </Button>
                )}
                {prev && (
                  <Button asChild variant="ghost" size="lg">
                    <Link to={`/learn/${enrollmentId}?topic=${prev.topicId}`}>
                      <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                      Previous
                    </Link>
                  </Button>
                )}
              </div>
              <p className="mt-3 text-sm text-brand-muted">
                {ofTotal(index + 1, total, 'lesson')}{topic.durationMinutes ? ` · about ${plural(topic.durationMinutes, 'minute')}` : ''}
              </p>
            </>
          )}
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="rounded-lg border border-brand-border bg-brand-surface-raised p-4 shadow-card">
            <h2 className="mb-2 px-2 font-display text-xl text-brand-primary-dark">Lessons</h2>
            {trail}
          </div>
        </aside>
      </div>

      {/* Phones: lessons live in a sheet behind a sticky button. */}
      <div className="fixed inset-x-0 bottom-[64px] z-30 border-t border-brand-border bg-brand-surface-raised/95 p-3 backdrop-blur md:bottom-0 lg:hidden">
        <div className="mx-auto max-w-content">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="min-h-touch-primary w-full">
                <ListChecks className="h-5 w-5" aria-hidden="true" />
                Lessons ({ofTotal(done, total, 'lesson')})
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" title="Lessons in this course">
              {trail}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

function CoursePanel({ enrollment, courseId, courseTitle, nextLessonHref }) {
  return (
    <motion.div {...celebrate()} className="rounded-xl border border-brand-border bg-brand-surface-raised p-8 shadow-lift">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-accent-soft">
        <Sparkles className="h-7 w-7 text-brand-accent-ink" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-2xl text-brand-primary-dark">Every lesson finished</h2>
      <p className="mt-2 max-w-[50ch] text-lg text-brand-muted">
        {enrollment.certificateIssued
          ? `Your certificate for ${courseTitle} is ready.`
          : `Pass the quiz for ${courseTitle} and your certificate will be waiting.`}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {enrollment.certificateIssued ? (
          <Button asChild size="lg" className="min-h-touch-primary">
            <Link to="/certificates">
              <Award className="h-5 w-5" aria-hidden="true" />
              View certificate
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" className="min-h-touch-primary">
            <Link to={`/quiz/${courseId}`}>
              Take the quiz
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
        )}
        {nextLessonHref && (
          <Button asChild variant="outline" size="lg">
            <Link to={nextLessonHref}>Review the lessons</Link>
          </Button>
        )}
        <Button asChild variant="ghost" size="lg">
          <Link to="/dashboard">Back to my learning</Link>
        </Button>
      </div>
    </motion.div>
  );
}

function LearningSkeleton() {
  return (
    <div className="page-container pb-24 md:pb-12" role="status" aria-label="Loading lesson">
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="mt-6 h-14 w-64" />
        </div>
        <LessonSkeleton />
      </div>
    </div>
  );
}
