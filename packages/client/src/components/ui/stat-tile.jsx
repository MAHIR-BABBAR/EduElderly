import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { prefersReducedMotion } from '@/lib/motion';

/**
 * Counts from 0 to `value` once, on mount. Reduced motion jumps straight to
 * the number. Kept under a second so it reads as "loading finished", not as
 * decoration.
 */
function useCountUp(value, durationMs = 700) {
  const reduced = prefersReducedMotion();
  // Reduced motion never animates, so the final value is the initial state
  // rather than something an effect has to correct after the first paint.
  const [display, setDisplay] = useState(() => (reduced ? value : 0));
  const frame = useRef();

  useEffect(() => {
    if (reduced) return undefined;
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // easeOutCubic: fast first, settles gently.
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, durationMs, reduced]);

  return reduced ? value : display;
}

/**
 * A single headline number with a label — the dashboard and admin summary row.
 * The animated value is hidden from assistive tech; the real value is exposed
 * once via the accessible label so a screen reader is not read a counter.
 */
export function StatTile({ label, value, icon: Icon, hint, tone = 'default', animate = true, className }) {
  const numeric = typeof value === 'number';
  const shown = useCountUp(numeric && animate ? value : 0);
  const display = numeric && animate ? shown : value;

  const tones = {
    default: 'text-brand-primary',
    accent: 'text-brand-accent-dark',
    success: 'text-brand-success',
  };

  return (
    <div className={cn('card-surface flex items-start gap-4', className)}>
      {Icon && (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-primary-soft">
          <Icon className={cn('h-6 w-6', tones[tone])} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-muted">{label}</p>
        <p className={cn('font-display text-2xl leading-tight', tones[tone])}>
          <span aria-hidden="true">{display}</span>
          <span className="sr-only">{value}</span>
        </p>
        {hint && <p className="mt-1 text-sm text-brand-muted">{hint}</p>}
      </div>
    </div>
  );
}
