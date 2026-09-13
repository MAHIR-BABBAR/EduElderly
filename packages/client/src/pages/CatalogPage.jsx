import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { courseApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { CourseCardSkeleton } from '@/components/ui/skeleton';
import { GlowCard } from '@/components/marketing/motion';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category') || '';

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => courseApi.listCategories(),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseApi.list(),
  });

  const categories = catData?.data || [];
  const courses = useMemo(() => {
    const all = data?.data || [];
    if (!category) return all;
    return all.filter((c) => c.categoryId === category);
  }, [data, category]);

  return (
    <div className="page-container pb-24 md:pb-8">
      <PageHeader
        title="Course catalog"
        description="Health, digital skills, and lifelong learning — all designed with clear text and simple navigation."
      />

      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <Button
          variant={category === '' ? 'default' : 'outline'}
          size="lg"
          onClick={() => setSearchParams({})}
        >
          All courses
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.categoryId}
            variant={category === cat.categoryId ? 'default' : 'outline'}
            size="lg"
            onClick={() => setSearchParams({ category: cat.categoryId })}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading courses">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && <Alert variant="error">Could not load courses. Make sure the API gateway is running on port 8080.</Alert>}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <GlowCard key={course.courseId}>
            <CardHeader>
              <div className="mb-2 flex flex-wrap gap-2">
                <Badge className="capitalize">{course.difficulty}</Badge>
                <Badge variant="outline">{formatPrice(course.price)}</Badge>
              </div>
              <CardTitle>{course.title}</CardTitle>
              <CardDescription className="line-clamp-3">{course.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-2 text-[length:var(--font-size-sm)] text-brand-muted">
                <div>
                  <dt className="font-semibold text-brand-text">Hours</dt>
                  <dd>{course.estimatedHours}h</dd>
                </div>
                <div>
                  <dt className="font-semibold text-brand-text">Topics</dt>
                  <dd>{course.totalTopics}</dd>
                </div>
              </dl>
              <Button asChild className="w-full">
                <Link to={`/courses/${course.courseId}`}>View course</Link>
              </Button>
            </CardContent>
          </GlowCard>
        ))}
      </div>

      {!isLoading && courses.length === 0 && (
        <Alert variant="info">No courses found in this category. Try browsing all courses.</Alert>
      )}
    </div>
  );
}
