import { cn } from '@/lib/utils';

export function Progress({ value = 0, max = 100, className, label }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="mb-2 flex justify-between text-[length:var(--font-size-sm)] font-semibold text-brand-text">
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-brand-border"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div
          className="h-full rounded-full bg-brand-primary transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
