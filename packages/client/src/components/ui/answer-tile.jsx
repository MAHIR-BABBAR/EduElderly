import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A large tappable answer for the quiz deck (S-5). It is a real radio (in a
 * fieldset/radiogroup the caller owns), at least 72px tall, with a letter
 * badge. Result states show an icon AND a text label — never colour alone.
 *
 * state: 'idle' | 'correct' | 'incorrect'
 */
export function AnswerTile({
  letter,
  name,
  value,
  selected = false,
  state = 'idle',
  disabled = false,
  onSelect,
  children,
  className,
}) {
  const resultLabel =
    state === 'correct' ? 'Correct' : state === 'incorrect' ? 'Your answer' : null;

  return (
    <label
      className={cn(
        'answer-tile group relative flex min-h-[72px] cursor-pointer items-center gap-4 rounded-lg border-2 p-4 text-left',
        'transition-[border-color,background-color,box-shadow,transform] duration-fast',
        'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-brand-accent-ink has-[:focus-visible]:ring-offset-2',
        disabled ? 'cursor-default' : 'hover:border-brand-border-strong hover:shadow-card active:scale-[0.99]',
        state === 'idle' && !selected && 'border-brand-border bg-brand-surface-raised',
        state === 'idle' && selected && 'border-world bg-world-soft shadow-card',
        state === 'correct' && 'border-brand-success bg-brand-success-soft',
        state === 'incorrect' && 'border-brand-danger bg-brand-danger-soft',
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={() => onSelect?.(value)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-display text-xl font-semibold',
          state === 'idle' && !selected && 'border-brand-border-strong bg-brand-surface-raised text-brand-muted group-hover:border-brand-text group-hover:text-brand-text',
          state === 'idle' && selected && 'border-world bg-world text-white',
          state === 'correct' && 'border-brand-success bg-brand-success text-white',
          state === 'incorrect' && 'border-brand-danger bg-brand-danger text-white',
        )}
      >
        {state === 'correct' ? <Check className="h-5 w-5" strokeWidth={3} /> : state === 'incorrect' ? <X className="h-5 w-5" strokeWidth={3} /> : letter}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-lg font-medium leading-snug text-brand-text">{children}</span>
        {resultLabel && (
          <span
            className={cn(
              'text-sm font-semibold',
              state === 'correct' ? 'text-brand-success' : 'text-brand-danger',
            )}
          >
            {resultLabel}
          </span>
        )}
      </span>
    </label>
  );
}
