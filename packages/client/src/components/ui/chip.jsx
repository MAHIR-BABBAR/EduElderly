import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A toggle chip for filters. A real button with `aria-pressed`, 44px tall,
 * and a check mark when pressed so the state is not colour alone. Inside a
 * `[data-world]` ancestor the pressed state takes the world colour.
 */
export function FilterChip({ pressed = false, onPressedChange, count, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange?.(!pressed)}
      className={cn(
        'inline-flex min-h-touch items-center gap-2 rounded-full border-2 px-4 text-base font-semibold',
        'transition-[background-color,border-color,color] duration-fast',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink focus-visible:ring-offset-2',
        pressed
          ? 'border-world bg-world text-white'
          : 'border-brand-border bg-brand-surface-raised text-brand-text hover:border-brand-border-strong hover:bg-brand-surface-sunken',
        className,
      )}
      {...props}
    >
      {pressed && <Check className="h-4 w-4" aria-hidden="true" strokeWidth={3} />}
      <span>{children}</span>
      {typeof count === 'number' && (
        <span className={cn('tabular text-sm', pressed ? 'text-white/85' : 'text-brand-muted')}>{count}</span>
      )}
    </button>
  );
}

/** A quiet, non-interactive label chip. */
export function Chip({ className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center gap-1.5 rounded-full bg-brand-surface-sunken px-3 text-sm font-semibold text-brand-text',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
