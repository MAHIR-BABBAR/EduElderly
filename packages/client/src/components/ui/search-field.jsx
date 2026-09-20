import { useId } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A 56px search input with a leading icon and a named clear button. The
 * label is visible by default; pass `hideLabel` only where a heading already
 * says what the field searches. Debouncing is the caller's job.
 */
export function SearchField({
  value,
  onChange,
  onClear,
  label = 'Search',
  placeholder = 'Search courses',
  hideLabel = false,
  className,
  ...props
}) {
  const id = useId();
  return (
    <div className={cn('search-field flex flex-col gap-2', className)}>
      <label htmlFor={id} className={cn('font-semibold text-brand-text', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-brand-muted"
        />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'h-14 w-full rounded-md border-2 border-brand-border bg-brand-surface-raised pl-14 pr-14 text-lg text-brand-text',
            'placeholder:text-brand-muted/80 transition-[border-color,box-shadow] duration-fast',
            'hover:border-brand-border-strong focus:border-brand-primary focus:outline-none focus:ring-[3px] focus:ring-brand-accent-ink/40',
            '[&::-webkit-search-cancel-button]:hidden',
          )}
          {...props}
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange?.('');
              onClear?.();
            }}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-brand-muted transition-colors duration-fast hover:bg-brand-surface-sunken hover:text-brand-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
