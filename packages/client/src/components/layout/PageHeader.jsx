export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <header className="mb-8">
      {eyebrow && (
        <p className="mb-2 text-[length:var(--font-size-sm)] font-semibold uppercase tracking-wide text-brand-primary">
          {eyebrow}
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[length:var(--font-size-2xl)] text-brand-primary-dark">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-brand-muted">{description}</p>}
        </div>
        {children}
      </div>
    </header>
  );
}
