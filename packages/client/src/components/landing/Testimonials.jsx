import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

const ADVANCE_MS = 7000;

/**
 * Testimonial carousel with the controls an auto-advancing carousel actually
 * needs to be usable: it pauses on hover and on keyboard focus, it stops for
 * good once someone presses a control, it never auto-advances under reduced
 * motion, and the slide region is a labelled live region so a screen reader
 * hears the quote change instead of silently missing it.
 *
 * Arrow keys move between quotes; the dots are real buttons with names.
 */
export function Testimonials({ items }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userTookOver, setUserTookOver] = useState(false);
  const timer = useRef(null);

  const go = useCallback(
    (next, byUser = false) => {
      if (byUser) setUserTookOver(true);
      setIndex((next + items.length) % items.length);
    },
    [items.length],
  );

  const autoAdvance = !paused && !userTookOver && !prefersReducedMotion() && items.length > 1;

  useEffect(() => {
    if (!autoAdvance) return undefined;
    timer.current = setTimeout(() => setIndex((c) => (c + 1) % items.length), ADVANCE_MS);
    return () => clearTimeout(timer.current);
  }, [autoAdvance, index, items.length]);

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + 1, true);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(index - 1, true);
    }
  };

  const active = items[index];

  return (
    // The ARIA carousel pattern puts arrow-key handling on the carousel
    // container itself, which this rule does not model; the interactive
    // controls inside are real buttons.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="What learners say"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      <div
        aria-live="polite"
        aria-atomic="true"
        className="card-surface mx-auto max-w-3xl text-center"
      >
        <Quote className="mx-auto mb-4 h-9 w-9 text-brand-accent" aria-hidden="true" />
        <blockquote className="font-display text-xl leading-snug text-brand-text">
          &ldquo;{active.quote}&rdquo;
        </blockquote>
        <p className="mt-5 font-semibold text-brand-primary">
          {active.name}
          <span className="font-normal text-brand-muted">, age {active.age}</span>
        </p>
        <p className="mt-1 text-sm text-brand-muted">{active.course}</p>
        <p className="sr-only">{`Quote ${index + 1} of ${items.length}`}</p>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => go(index - 1, true)}
          aria-label="Previous quote"
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-border text-brand-primary transition-colors duration-fast hover:border-brand-primary hover:bg-brand-primary-soft"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex gap-1.5 px-2">
          {items.map((item, i) => (
            <button
              key={item.name}
              type="button"
              onClick={() => go(i, true)}
              aria-label={`Show quote from ${item.name}`}
              aria-current={i === index ? 'true' : undefined}
              className={cn(
                'h-11 w-6 rounded-full transition-colors duration-fast',
                'before:mx-auto before:block before:h-2.5 before:w-2.5 before:rounded-full before:transition-colors',
                i === index ? 'before:bg-brand-primary' : 'before:bg-brand-border hover:before:bg-brand-primary/50',
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(index + 1, true)}
          aria-label="Next quote"
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-brand-border text-brand-primary transition-colors duration-fast hover:border-brand-primary hover:bg-brand-primary-soft"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
