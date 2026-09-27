import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { courseApi } from '@/lib/api';
import { worldFor } from '@/lib/worlds';

const TEN_MINUTES = 10 * 60 * 1000;

/**
 * Categories rarely change, so they are fetched once and shared by every
 * screen that needs to turn a course's `categoryId` into a name and a world.
 */
export function useCategories() {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: () => courseApi.listCategories(),
    staleTime: TEN_MINUTES,
  });

  const byId = useMemo(() => {
    const map = new Map();
    for (const category of query.data?.data ?? []) map.set(category.categoryId, category);
    return map;
  }, [query.data]);

  return { ...query, byId };
}

/** The category object and colour world for one course (either may be absent). */
export function useCourseWorld(course) {
  const { byId } = useCategories();
  return useMemo(() => {
    const category = course?.categoryId ? byId.get(course.categoryId) : undefined;
    const world = worldFor({
      categorySlug: category?.slug,
      categoryName: category?.name,
      categoryId: course?.categoryId,
    });
    return { category, world };
  }, [byId, course?.categoryId]);
}
