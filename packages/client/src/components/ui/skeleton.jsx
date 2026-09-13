import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-[var(--radius-md)] bg-brand-border/60 motion-reduce:animate-none', className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="card-surface space-y-4">
      <Skeleton className="aspect-video w-full" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
