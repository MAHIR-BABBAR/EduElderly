import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Shown when a list is legitimately empty. Always offers the next step —
 * "no courses yet" without a way to find one is a dead end.
 */
export function EmptyState({ title, description, actionLabel, actionHref, onAction, icon: Icon, className, children }) {
  return (
    <div className={cn('card-surface flex flex-col items-center px-6 py-14 text-center', className)}>
      {Icon && (
        <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary-soft">
          <Icon className="h-8 w-8 text-brand-primary" aria-hidden="true" />
        </span>
      )}
      <h2 className="font-display text-xl text-brand-primary-dark">{title}</h2>
      {description && <p className="mt-2 max-w-md text-brand-muted">{description}</p>}
      {actionLabel && (
        <Button className="mt-6" size="lg" asChild={Boolean(actionHref)} onClick={onAction}>
          {actionHref ? <Link to={actionHref}>{actionLabel}</Link> : actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}
