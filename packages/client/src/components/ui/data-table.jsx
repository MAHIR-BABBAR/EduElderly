import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * The admin table: sortable headers, pagination, and a card layout on phones.
 *
 * Columns are `{ key, header, render?, sortable?, sortValue?, align?, srOnlyHeader? }`.
 * Sorting is client-side over the rows you pass; hand it a page of rows and
 * drive `pagination` from the server when the list is long.
 *
 * Accessibility: a real <table> with scope="col" headers, sort state exposed
 * through aria-sort, and one caption naming the table. Below `md` the same
 * rows render as stacked cards, because a 6-column table at 24px text is
 * unusable on a phone.
 */
export function DataTable({
  columns,
  rows,
  rowKey = (row, i) => row.id ?? i,
  caption,
  isLoading = false,
  emptyMessage = 'Nothing to show yet.',
  pagination,
  onPageChange,
  initialSort,
  className,
}) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return rows;
    const valueOf = column.sortValue ?? ((row) => row[column.key]);
    return [...rows].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (av === bv) return 0;
      const result = av > bv ? 1 : -1;
      return sort.direction === 'asc' ? result : -result;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key) =>
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );

  if (isLoading) {
    return (
      <div className="card-surface space-y-3" role="status" aria-label="Loading table">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!sorted.length) {
    return <div className="card-surface py-10 text-center text-brand-muted">{emptyMessage}</div>;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Desktop and tablet: a real table. */}
      <div className="hidden overflow-x-auto rounded-lg border border-brand-border bg-white md:block">
        <table className="w-full border-collapse text-left">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b-2 border-brand-border bg-brand-surface">
              {columns.map((column) => {
                const active = sort?.key === column.key;
                const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn('p-3 text-sm font-semibold uppercase tracking-wide text-brand-muted', column.align === 'right' && 'text-right')}
                    aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : column.sortable ? 'none' : undefined}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex min-h-touch items-center gap-2 rounded-md px-1 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-dark"
                      >
                        {column.header}
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : (
                      <span className={cn(column.srOnlyHeader && 'sr-only')}>{column.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={rowKey(row, i)} className="border-b border-brand-border last:border-0 hover:bg-brand-surface">
                {columns.map((column) => (
                  <td key={column.key} className={cn('p-3 align-middle', column.align === 'right' && 'text-right')}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: the same data as cards. */}
      <ul className="space-y-3 md:hidden">
        {sorted.map((row, i) => (
          <li key={rowKey(row, i)} className="card-surface space-y-2 p-4">
            {columns.map((column) => (
              <div key={column.key} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold uppercase tracking-wide text-brand-muted">{column.header}</span>
                <span className="text-right">{column.render ? column.render(row) : row[column.key]}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>

      {pagination && pagination.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-brand-muted">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              Next
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
