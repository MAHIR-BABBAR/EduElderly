import { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen } from 'lucide-react';
import { courseApi } from '@/lib/api';
import { useCategories } from '@/hooks/useCategories';
import { worldFor, WORLD_LABELS } from '@/lib/worlds';
import { hours, plural, price } from '@/lib/format';
import { fadeUp, listStagger } from '@/lib/motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { CourseCover } from '@/components/ui/course-cover';
import { SearchField } from '@/components/ui/search-field';
import { FilterChip } from '@/components/ui/chip';
import { SegmentedControl } from '@/components/ui/segmented';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { CourseCardSkeleton } from '@/components/ui/skeleton';
import { useSpotlight } from '@/components/ui/spotlight';

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'a-z', label: 'A to Z' },
];

/**
 * Catalog (plan S-2): a magazine grid of illustrated covers, each card in its
 * subject world, with a calm search-and-chips rail. Search, filters and sort
 * are server-side (B-1) and live in the URL, so a filtered view can be shared
 * and the back button behaves.
 */
export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('category') || '';
  const priceFilter = params.get('price') || ''; // '' | 'free' | 'paid'
  const sort = params.get('sort') || 'newest';
  const urlSearch = params.get('q') || '';
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);

  // Local text state so typing is instant; the URL (and the query) update 300ms later.
  const [search, setSearch] = useState(urlSearch);
  useEffect(() => setSearch(urlSearch), [urlSearch]);
  useEffect(() => {
    if (search === urlSearch) return undefined;
    const t = setTimeout(() => update({ q: search || null, page: null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '' || value === undefined) next.delete(key);
      else next.set(key, String(value));
    }
    setParams(next, { replace: true });
  };

  const { data: catData, byId } = useCategories();
  const categories = catData?.data ?? [];

  const queryParams = useMemo(() => {
    const q = { limit: 12, page, sort };
    if (urlSearch) q.search = urlSearch;
    if (categoryId) q.categoryId = categoryId;
    if (priceFilter === 'free') q.isPaid = false;
    if (priceFilter === 'paid') q.isPaid = true;
    return q;
  }, [urlSearch, categoryId, priceFilter, sort, page]);

  const coursesQuery = useQuery({
    queryKey: ['courses', queryParams],
    queryFn: () => courseApi.list(queryParams),
    placeholderData: keepPreviousData,
  });
  const courses = coursesQuery.data?.data ?? [];
  const pagination = coursesQuery.data?.pagination;
  const anyFilter = Boolean(urlSearch || categoryId || priceFilter);

  const worldOf = (course) => {
    const category = byId.get(course.categoryId);
    return worldFor({ categorySlug: category?.slug, categoryName: category?.name, categoryId: course.categoryId });
  };

  return (
    <div className="page-container pb-24 md:pb-12">
      <PageHeader
        eyebrow="Catalog"
        title={
          <>
            Find your <span className="accent-word">next</span> course
          </>
        }
        documentTitle="Courses"
        description="Health, digital confidence and lifelong learning. Every course is self-paced, with large text and no time limits."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <SearchField
          label="Search courses"
          hideLabel
          placeholder="Search by topic, for example walking or tablet"
          value={search}
          onChange={setSearch}
          onClear={() => update({ q: null, page: null })}
        />
        <SegmentedControl
          label="Sort courses"
          value={sort}
          options={SORTS}
          onValueChange={(value) => update({ sort: value === 'newest' ? null : value, page: null })}
        />
      </div>

      <div className="scroll-x mb-8 flex gap-2 pb-1" role="group" aria-label="Filter courses">
        <FilterChip pressed={!categoryId} onPressedChange={() => update({ category: null, page: null })}>
          All subjects
        </FilterChip>
        {categories.map((cat) => {
          const world = worldFor({ categorySlug: cat.slug, categoryName: cat.name, categoryId: cat.categoryId });
          return (
            <span key={cat.categoryId} data-world={world} className="contents">
              <FilterChip
                pressed={categoryId === cat.categoryId}
                onPressedChange={(pressed) => update({ category: pressed ? cat.categoryId : null, page: null })}
              >
                {cat.name}
              </FilterChip>
            </span>
          );
        })}
        <span aria-hidden="true" className="mx-1 w-px shrink-0 self-stretch bg-brand-border" />
        <FilterChip pressed={priceFilter === 'free'} onPressedChange={(p) => update({ price: p ? 'free' : null, page: null })}>
          Free
        </FilterChip>
        <FilterChip pressed={priceFilter === 'paid'} onPressedChange={(p) => update({ price: p ? 'paid' : null, page: null })}>
          Paid
        </FilterChip>
      </div>

      <p className="mb-4 text-sm font-semibold text-brand-muted" aria-live="polite">
        {coursesQuery.isLoading
          ? 'Finding courses…'
          : pagination
            ? `Showing ${plural(courses.length, 'course')} of ${pagination.total}`
            : ''}
      </p>

      {coursesQuery.error && (
        <Alert variant="error" className="mb-6">
          We could not load the courses.{' '}
          <button type="button" className="font-semibold underline" onClick={() => coursesQuery.refetch()}>
            Try again
          </button>
        </Alert>
      )}

      {coursesQuery.isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading courses">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!coursesQuery.isLoading && !coursesQuery.error && courses.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title={anyFilter ? 'No courses match those filters' : 'No courses yet'}
          description={anyFilter ? 'Try a different word, or clear the filters to see everything.' : 'Please check back soon.'}
          actionLabel={anyFilter ? 'Clear filters' : undefined}
          onAction={anyFilter ? () => setParams({}, { replace: true }) : undefined}
        />
      )}

      {courses.length > 0 && (
        <motion.ul
          variants={listStagger(0.04)}
          initial="hidden"
          animate="visible"
          className={coursesQuery.isFetching && !coursesQuery.isLoading ? 'grid gap-6 opacity-70 transition-opacity sm:grid-cols-2 lg:grid-cols-3' : 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'}
        >
          {courses.map((course) => (
            <motion.li key={course.courseId} variants={fadeUp()} className="list-none">
              <CourseCard course={course} world={worldOf(course)} />
            </motion.li>
          ))}
        </motion.ul>
      )}

      {pagination && pagination.totalPages > 1 && (
        <nav aria-label="Catalog pages" className="mt-10 flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => update({ page: page - 1 === 1 ? null : page - 1 })}>
            Previous
          </Button>
          <span className="tabular text-brand-muted">
            Page {page} of {pagination.totalPages}
          </span>
          <Button variant="outline" disabled={page >= pagination.totalPages} onClick={() => update({ page: page + 1 })}>
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}

/**
 * One card = one tab stop (stretched link), cover in its world, price and
 * subject as chips, and a plain-language length line. Hover lifts the card
 * and zooms the cover; a pointer spotlight follows the cursor on desktop.
 */
function CourseCard({ course, world }) {
  const ref = useRef(null);
  useSpotlight(ref);
  return (
    <article
      ref={ref}
      data-world={world}
      className="card-lift group relative flex h-full flex-col overflow-hidden rounded-lg border border-brand-border bg-brand-surface-raised shadow-card"
    >
      <CourseCover
        title={course.title}
        courseId={course.courseId}
        src={course.thumbnailUrl}
        world={world}
        layoutId={`cover-${course.courseId}`}
        className="rounded-none border-0"
      />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="world">{WORLD_LABELS[world]}</Badge>
          <Badge variant="outline">{price(course.price)}</Badge>
          {course.difficulty && course.difficulty !== 'beginner' && (
            <Badge variant="outline" className="capitalize">{course.difficulty}</Badge>
          )}
        </div>
        <h2 className="font-display text-xl text-brand-primary-dark">
          <Link
            to={`/courses/${course.courseId}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline"
          >
            {course.title}
          </Link>
        </h2>
        <p className="line-clamp-3 text-brand-muted">{course.description}</p>
        <p className="mt-auto flex items-center justify-between pt-2 text-sm font-semibold text-brand-muted">
          <span>
            {plural(course.totalTopics ?? 0, 'lesson')} · {hours(course.estimatedHours)}
          </span>
          <span className="inline-flex items-center gap-1 text-brand-primary">
            See course
            <ArrowRight className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </p>
      </div>
    </article>
  );
}
