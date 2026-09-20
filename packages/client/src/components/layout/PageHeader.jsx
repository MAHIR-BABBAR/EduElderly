import { usePageTitle } from '@/components/layout/RouteChange';

/**
 * The top of every in-app page. Setting `title` also sets the document title,
 * which is what the route announcer reads out after a navigation, so pages get
 * their screen reader announcement for free.
 */
export function PageHeader({ eyebrow, title, description, documentTitle, children }) {
  usePageTitle(documentTitle ?? title);

  return (
    <header className="mb-8">
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-brand-accent-ink">{eyebrow}</p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-brand-primary-dark" tabIndex={-1}>{title}</h1>
          {description && <p className="mt-3 max-w-[60ch] text-lg text-brand-muted">{description}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}
