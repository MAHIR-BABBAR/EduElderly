import { useId, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn, prefersReducedMotion } from '@/lib/utils';

/**
 * A segmented control: one choice from a few, laid out as a row. Implements
 * the ARIA radiogroup pattern with roving tabindex (arrow keys move, the
 * group is one tab stop). A sliding thumb marks the selection in the calm
 * tier; it jumps under reduced motion.
 *
 * options: [{ value, label, icon?: Component }]
 */
export function SegmentedControl({ value, onValueChange, options = [], label, className, size = 'default' }) {
  const id = useId();
  const refs = useRef([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const move = (delta) => {
    if (!options.length) return;
    const next = (index + delta + options.length) % options.length;
    onValueChange?.(options[next].value);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      onValueChange?.(options[0].value);
      refs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      onValueChange?.(options[options.length - 1].value);
      refs.current[options.length - 1]?.focus();
    }
  };

  return (
    // Roving tabindex: the selected radio is the group's single tab stop, per
    // the ARIA radiogroup pattern; the lint rule cannot model that.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'segmented relative inline-grid rounded-md border border-brand-border bg-brand-surface-sunken p-1',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length || 1}, minmax(0, 1fr))` }}
    >
      {options.map((option, i) => {
        const selected = i === index;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            id={`${id}-${option.value}`}
            onClick={() => onValueChange?.(option.value)}
            className={cn(
              'relative z-10 inline-flex items-center justify-center gap-2 rounded-sm px-4 font-semibold transition-colors duration-fast',
              size === 'sm' ? 'min-h-[40px] text-sm' : 'min-h-touch text-base',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink',
              selected ? 'text-brand-primary-dark' : 'text-brand-muted hover:text-brand-text',
            )}
          >
            {selected && (
              <motion.span
                aria-hidden="true"
                layoutId={`${id}-thumb`}
                transition={prefersReducedMotion() ? { duration: 0 } : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute inset-0 -z-10 rounded-sm bg-brand-surface-raised shadow-card"
              />
            )}
            {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
