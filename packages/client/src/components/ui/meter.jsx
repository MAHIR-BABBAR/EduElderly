import { cn } from '@/lib/utils';
import { plural } from '@/lib/format';

/**
 * A thick, rounded progress bar with a spoken value ("2 of 5 lessons"), for
 * cards and bands. Takes the world colour from its nearest data-world
 * ancestor; `onNight` swaps the track for use on dark surfaces.
 */
export function Meter({ value = 0, max = 100, label = 'Progress', noun, onNight = false, showText = true, className }) {
  const safeMax = Math.max(1, Number(max) || 1);
  const safeValue = Math.min(safeMax, Math.max(0, Number(value) || 0));
  const percent = Math.round((safeValue / safeMax) * 100);
  const text = noun ? `${safeValue} of ${plural(safeMax, noun)}` : `${percent}%`;

  return (
    <div className={cn('meter flex flex-col gap-2', className)}>
      {showText && (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className={cn('font-semibold', onNight ? 'text-brand-on-night-muted' : 'text-brand-muted')}>{label}</span>
          <span className={cn('tabular font-semibold', onNight ? 'text-brand-on-night' : 'text-brand-text')}>{text}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={text}
        className={cn('h-3 w-full overflow-hidden rounded-full', onNight ? 'bg-white/15' : 'bg-brand-surface-sunken')}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-calm', onNight ? 'bg-brand-accent' : 'bg-world')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
