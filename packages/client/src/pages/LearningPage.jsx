import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Award, CheckCircle2, Circle } from 'lucide-react';
import { courseApi, enrollmentApi } from '@/lib/api';
import { toEmbedUrl } from '@/lib/utils';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';

function CourseCompleteCard({ courseTitle, courseId, certificateIssued }) {
  return (
    <Card className="border-brand-success">
      <CardHeader>
        <CardTitle>Course complete!</CardTitle>
        <CardDescription>
          {certificateIssued
            ? `Congratulations on finishing ${courseTitle}. Your certificate is ready.`
            : `You finished all lessons in ${courseTitle}. Pass every quiz to earn your certificate.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4">
        {!certificateIssued && (
          <Button asChild size="lg">
            <Link to={`/quiz/${courseId}`}>Take quizzes</Link>
          </Button>
        )}
        {certificateIssued && (
          <Button asChild size="lg">
            <Link to="/certificates">
              <Award className="mr-2 h-5 w-5" aria-hidden="true" />
              View certificate
            </Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg">
          <Link to="/dashboard">Back to My Learning</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function LearningPage() {
  const { enrollmentId } = useParams();
  const queryClient = useQueryClient();

  const enrollmentQuery = useQuery({
    queryKey: ['enrollment', enrollmentId],
    queryFn: () => enrollmentApi.get(enrollmentId),
  });

  const enrollment = enrollmentQuery.data?.data;
  const courseId = enrollment?.courseId;
  const nextTopicId = enrollment?.nextTopicId;
  const isComplete = enrollment?.status === 'completed' || enrollment?.progressPercent >= 100;

  const courseQuery = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => courseApi.getById(courseId),
    enabled: Boolean(courseId),
  });

  const topic = useMemo(() => {
    const modules = courseQuery.data?.data?.modules || [];
    for (const mod of modules) {
      const found = (mod.topics || []).find((t) => t.topicId === nextTopicId);
      if (found) return { ...found, moduleTitle: mod.title };
    }
    return null;
  }, [courseQuery.data, nextTopicId]);

  const contentQuery = useQuery({
    queryKey: ['topic-content', enrollmentId, nextTopicId],
    queryFn: () => enrollmentApi.topicContent(enrollmentId, nextTopicId),
    enabled: Boolean(nextTopicId) && !isComplete,
  });

  const progressMutation = useMutation({
    mutationFn: (topicId) => enrollmentApi.progress(enrollmentId, topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['my-certificates'] });
    },
  });

  const rawContentUrl = contentQuery.data?.data?.contentUrl;
  const contentUrl = toEmbedUrl(rawContentUrl);
  const courseTitle = enrollment?.course?.title || courseQuery.data?.data?.title || 'Course';
  const completedTopics = new Set(enrollment?.completedTopics || []);

  if (enrollmentQuery.isLoading) {
    return (
      <div className="page-container pb-24 md:pb-8">
        <p role="status">Loading lesson…</p>
      </div>
    );
  }

  if (enrollmentQuery.error) {
    return (
      <div className="page-container max-w-2xl pb-24 md:pb-8">
        <Alert variant="error">{enrollmentQuery.error.message}</Alert>
        <Button asChild className="mt-4" size="lg">
          <Link to="/dashboard">Back to My Learning</Link>
        </Button>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="page-container max-w-2xl pb-24 md:pb-8">
        <Alert variant="error">Enrollment not found.</Alert>
        <Button asChild className="mt-4" size="lg">
          <Link to="/dashboard">Back to My Learning</Link>
        </Button>
      </div>
    );
  }

  if (isComplete || !nextTopicId || !topic) {
    return (
      <div className="page-container max-w-2xl pb-24 md:pb-8">
        <CourseCompleteCard
          courseTitle={courseTitle}
          courseId={courseId}
          certificateIssued={enrollment.certificateIssued}
        />
      </div>
    );
  }

  const isVideo = topic.contentType === 'video';

  return (
    <div className="page-container max-w-6xl pb-24 md:pb-8">
      <Breadcrumbs
        items={[
          { label: 'My Learning', href: '/dashboard' },
          { label: courseTitle, href: '/dashboard' },
          { label: topic.title },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <Progress value={enrollment.progressPercent ?? 0} label="Your progress" />

          <Card>
            <CardHeader>
              <CardTitle>{topic.title}</CardTitle>
              <CardDescription>{topic.moduleTitle} · {topic.durationMinutes} minutes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {contentQuery.isLoading && <p role="status">Loading content…</p>}
              {contentQuery.error && (
                <Alert variant="error">Could not load lesson content. Please try again.</Alert>
              )}

              {contentUrl && isVideo && (
                <div>
                  <div className="aspect-video overflow-hidden rounded-lg border border-brand-border bg-black">
                    <iframe
                      title={topic.title}
                      src={contentUrl}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <p className="mt-2 text-[length:var(--font-size-sm)] text-brand-muted">
                    Tip: Use your video player&apos;s closed captions if available.
                  </p>
                </div>
              )}

              {contentUrl && !isVideo && (
                <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
                  <p className="mb-4">Read the lesson material below or open it in a new tab.</p>
                  <iframe title={topic.title} src={contentUrl} className="min-h-[400px] w-full rounded-lg border" />
                  <p className="mt-4">
                    <a
                      href={rawContentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-primary underline"
                    >
                      Open lesson in a new tab
                    </a>
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => progressMutation.mutate(topic.topicId)}
                  disabled={progressMutation.isPending}
                >
                  {progressMutation.isPending ? 'Saving…' : 'Mark lesson complete'}
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/dashboard">Back to dashboard</Link>
                </Button>
              </div>

              {progressMutation.error && (
                <Alert variant="error">{progressMutation.error.message}</Alert>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="hidden lg:block">
          <Card>
            <CardHeader>
              <CardTitle className="text-[length:var(--font-size-lg)]">Lessons</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(courseQuery.data?.data?.modules || []).flatMap((mod) =>
                  (mod.topics || []).map((t) => {
                    const done = completedTopics.has(t.topicId);
                    const current = t.topicId === nextTopicId;
                    return (
                      <li
                        key={t.topicId}
                        className={`flex items-start gap-2 rounded-lg p-2 text-[length:var(--font-size-sm)] ${
                          current ? 'bg-brand-accent-soft font-semibold' : ''
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-success" aria-hidden="true" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-brand-muted" aria-hidden="true" />
                        )}
                        <span>{t.title}</span>
                      </li>
                    );
                  }),
                )}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
