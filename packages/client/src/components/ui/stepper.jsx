import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Horizontal progress through a fixed sequence — quiz questions, checkout steps.
 *
 * Renders as an ordered list so the structure survives with styles off, and
 * each step carries its state in text for screen readers rather than colour
 * alone. `onStepClick` makes completed steps navigable; without it the steps
 * are non-interactive markers.
 */
export function Stepper({ steps, current = 0, onStepClick, className, label = 'Progress' }) {
  return (
    <nav aria-label={label} className={cn('w-full', className)}>
      <ol className="flex items-center gap-1">
        {steps.map((step, index) => {
          const title = typeof step === 'string' ? step : step.title;
          const done = index < current;
          const active = index === current;
          const clickable = Boolean(onStepClick) && (done || active);
          const state = done ? 'completed' : active ? 'current' : 'not started';

          const marker = (
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors duration-fast',
                done && 'border-brand-success bg-brand-success text-white',
                active && 'border-brand-primary bg-brand-primary text-white',
                !done && !active && 'border-brand-border bg-white text-brand-muted',
              )}
            >
              {done ? <Check className="h-5 w-5" aria-hidden="true" /> : index + 1}
            </span>
          );

          return (
            <li key={title || index} className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(index)}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-dark"
                  aria-current={active ? 'step' : undefined}
                >
                  {marker}
                  <span className="sr-only">{`${title || `Step ${index + 1}`}: ${state}`}</span>
                </button>
              ) : (
                <span aria-current={active ? 'step' : undefined}>
                  {marker}
                  <span className="sr-only">{`${title || `Step ${index + 1}`}: ${state}`}</span>
                </span>
              )}
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn('mx-1 h-1 flex-1 rounded-full transition-colors duration-fast', done ? 'bg-brand-success' : 'bg-brand-border')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
