import { Link } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A learning trail (SIG-6): lessons drawn as nodes on a line — done (filled,
 * check), current (ring, "You are here"), upcoming (hollow), locked (not a
 * link, says "Locked"). Replaces "3 of 12" arithmetic with a picture, while
 * every node stays a real, named link and the current one carries
 * `aria-current="step"`. Colour never carries state alone.
 *
 * items: [{ id, title, meta?, state: 'done'|'current'|'upcoming'|'locked', href?, onSelect? }]
 */
export function Trail({ items = [], orientation = 'vertical', compact = false, label = 'Lessons', className }) {
  const horizontal = orientation === 'horizontal';
  return (
    <ol
      aria-label={label}
      className={cn(
        'trail relative m-0 list-none p-0',
        horizontal ? 'flex items-start gap-0 overflow-x-auto scroll-x pb-1' : 'flex flex-col',
        className,
      )}
    >
      {items.map((item, index) => (
        <TrailItem
          key={item.id ?? index}
          item={item}
          isLast={index === items.length - 1}
          horizontal={horizontal}
          compact={compact}
          index={index}
        />
      ))}
    </ol>
  );
}

const STATE_TEXT = {
  done: 'Completed',
  current: 'You are here',
  upcoming: 'Not started',
  locked: 'Locked',
};

function TrailItem({ item, isLast, horizontal, compact, index }) {
  const { title, meta, state = 'upcoming', href, onSelect } = item;
  const interactive = state !== 'locked' && (href || onSelect);

  const node = (
    <span
      aria-hidden="true"
      className={cn(
        'trail-node relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-fast',
        state === 'done' && 'border-world bg-world text-white',
        state === 'current' && 'border-world bg-brand-surface-raised text-world ring-4 ring-world/20',
        state === 'upcoming' && 'border-brand-border-strong bg-brand-surface-raised text-brand-muted',
        state === 'locked' && 'border-brand-border bg-brand-surface-sunken text-brand-muted',
      )}
    >
      {state === 'done' && <Check className="h-4 w-4" strokeWidth={3} />}
      {state === 'current' && <span className="h-3 w-3 rounded-full bg-world" />}
      {state === 'locked' && <Lock className="h-3.5 w-3.5" />}
      {state === 'upcoming' && <span className="text-xs font-semibold tabular">{index + 1}</span>}
    </span>
  );

  const body = (
    <span className={cn('flex min-w-0 flex-col', compact ? 'gap-0' : 'gap-0.5')}>
      <span
        className={cn(
          'font-semibold leading-snug',
          state === 'current' ? 'text-brand-text' : 'text-brand-text',
          state === 'locked' && 'text-brand-muted',
          compact && 'text-sm',
        )}
      >
        {title}
      </span>
      <span className="text-sm text-brand-muted">
        {state === 'current' ? (
          <span className="font-semibold text-world-ink">{STATE_TEXT.current}</span>
        ) : (
          STATE_TEXT[state]
        )}
        {meta && !compact ? ` · ${meta}` : null}
      </span>
    </span>
  );

  const content = interactive ? (
    href ? (
      <Link
        to={href}
        aria-current={state === 'current' ? 'step' : undefined}
        className={cn(
          'trail-link flex min-h-[56px] rounded-md px-2 py-2 transition-colors duration-fast hover:bg-world-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink',
          horizontal ? 'flex-col items-start gap-2' : 'items-center gap-4',
        )}
      >
        {node}
        {body}
      </Link>
    ) : (
      <button
        type="button"
        onClick={onSelect}
        aria-current={state === 'current' ? 'step' : undefined}
        className={cn(
          'trail-link flex min-h-[56px] w-full rounded-md px-2 py-2 text-left transition-colors duration-fast hover:bg-world-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink',
          horizontal ? 'flex-col items-start gap-2' : 'items-center gap-4',
        )}
      >
        {node}
        {body}
      </button>
    )
  ) : (
    <span
      aria-disabled={state === 'locked' ? 'true' : undefined}
      className={cn('flex min-h-[56px] px-2 py-2', horizontal ? 'flex-col items-start gap-2' : 'items-center gap-4')}
    >
      {node}
      {body}
    </span>
  );

  return (
    <li
      className={cn(
        'relative',
        horizontal ? 'flex min-w-[11rem] flex-1 flex-col' : '',
      )}
    >
      {/* Connector to the next node. */}
      {!isLast && (
        <span
          aria-hidden="true"
          className={cn(
            'trail-connector absolute bg-brand-border',
            horizontal
              // Node is 2rem wide at 0.5rem padding; the line starts at its right edge,
              // at its vertical centre (0.5rem padding + 1rem), and runs to the next node.
              ? 'left-[2.5rem] top-[calc(1.5rem-1px)] h-0.5 w-[calc(100%-2rem)]'
              : 'left-[calc(0.5rem+1rem-1px)] top-[2.75rem] h-[calc(100%-1.75rem)] w-0.5',
            state === 'done' && 'bg-world',
          )}
        />
      )}
      {content}
    </li>
  );
}
