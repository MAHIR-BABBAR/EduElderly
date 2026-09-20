import { cn } from '@/lib/utils';

/**
 * Loading placeholders. A slow shimmer reads as "working" rather than "broken";
 * it stops entirely under reduced motion, leaving a plain grey block.
 */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-brand-border/50',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-white/55 after:to-transparent',
        'motion-reduce:after:hidden',
        className,
      )}
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

export function StatTileSkeleton() {
  return (
    <div className="card-surface flex items-start gap-4">
      <Skeleton className="h-12 w-12 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function LessonSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-3 w-full rounded-full" />
      <div className="card-surface space-y-4">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="aspect-video w-full" />
        <Skeleton className="h-14 w-56" />
      </div>
    </div>
  );
}

/** Generic block of text lines, for prose-shaped content. */
export function TextSkeleton({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
