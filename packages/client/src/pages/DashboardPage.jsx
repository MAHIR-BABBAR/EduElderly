import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Settings } from 'lucide-react';
import { enrollmentApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { CourseCardSkeleton } from '@/components/ui/skeleton';

function greeting(name) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name}`;
}

export function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const { data, isLoading, error } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => enrollmentApi.list(),
  });

  const enrollments = data?.data || [];
  const continueCourse = enrollments.find((e) => e.status === 'active' && e.progressPercent < 100);

  return (
    <div className="page-container pb-24 md:pb-8">
      <PageHeader
        title={profile?.name ? greeting(profile.name) : 'My learning'}
        description={`You have earned ${profile?.totalXP ?? 0} experience points.`}
      />

      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2" role="status">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      )}

      {error && <Alert variant="error">Could not load your courses. Please try again.</Alert>}

      {continueCourse && (
        <Card className="mb-8 border-2 border-brand-primary/20 bg-brand-accent-soft/30">
          <CardHeader>
            <CardTitle>Continue learning</CardTitle>
            <CardDescription>{continueCourse.course?.title || continueCourse.courseId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={continueCourse.progressPercent ?? 0} label="Course progress" />
            <Button asChild size="lg">
              <Link to={`/learn/${continueCourse.enrollmentId}`}>Resume lesson</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-8 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/certificates">
            <Award className="mr-2 h-5 w-5" aria-hidden="true" />
            My certificates
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/settings">
            <Settings className="mr-2 h-5 w-5" aria-hidden="true" />
            Accessibility settings
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/courses">
            <BookOpen className="mr-2 h-5 w-5" aria-hidden="true" />
            Browse more courses
          </Link>
        </Button>
      </div>

      {enrollments.length === 0 && !isLoading && (
        <EmptyState
          title="No courses yet"
          description="Browse our catalog and enroll in your first course."
          actionLabel="Browse courses"
          actionHref="/courses"
          icon={BookOpen}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {enrollments.map((enrollment) => (
          <Card key={enrollment.enrollmentId}>
            <CardHeader>
              <CardTitle>{enrollment.course?.title || enrollment.courseId}</CardTitle>
              <CardDescription>Status: {enrollment.status}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={enrollment.progressPercent ?? 0} />
              <div className="flex flex-wrap gap-3">
                {enrollment.status === 'completed' || enrollment.progressPercent >= 100 ? (
                  <>
                    <Button asChild>
                      <Link to={`/quiz/${enrollment.courseId}`}>
                        {enrollment.certificateIssued ? 'Review quizzes' : 'Complete quizzes'}
                      </Link>
                    </Button>
                    {enrollment.certificateIssued ? (
                      <Button asChild variant="outline">
                        <Link to="/certificates">View certificate</Link>
                      </Button>
                    ) : (
                      <Button asChild variant="outline">
                        <Link to={`/quiz/${enrollment.courseId}`}>Pass all quizzes for certificate</Link>
                      </Button>
                    )}
                  </>
                ) : (
                  <Button asChild>
                    <Link to={`/learn/${enrollment.enrollmentId}`}>Continue</Link>
                  </Button>
                )}
                {enrollment.status === 'active' && enrollment.progressPercent < 100 && (
                  <Button asChild variant="outline">
                    <Link to={`/quiz/${enrollment.courseId}`}>Take quiz</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
