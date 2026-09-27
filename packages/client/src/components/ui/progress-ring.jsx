import { cn } from '@/lib/utils';

/**
 * Circular progress for "how far through this course am I".
 *
 * Drawn as two SVG circles with a dash offset. The percentage sits in the
 * middle at a readable size, and the whole thing is a single `progressbar` for
 * assistive tech rather than a pile of decorative shapes.
 */
export function ProgressRing({ value = 0, size = 96, strokeWidth = 8, label, className, showValue = true }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const complete = pct >= 100;

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label || 'Progress'}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden="true" className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-brand-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'transition-[stroke-dashoffset] duration-calm ease-out motion-reduce:transition-none',
            complete ? 'stroke-brand-success' : 'stroke-brand-primary',
          )}
        />
      </svg>
      {showValue && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute font-display leading-none',
            complete ? 'text-brand-success' : 'text-brand-primary-dark',
            size >= 88 ? 'text-xl' : 'text-sm',
          )}
        >
          {pct}%
        </span>
      )}
    </div>
  );
}
