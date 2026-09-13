import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function EmptyState({ title, description, actionLabel, actionHref, onAction, icon: Icon, className }) {
  return (
    <div className={cn('card-surface flex flex-col items-center py-12 text-center', className)}>
      {Icon && <Icon className="mb-4 h-12 w-12 text-brand-primary" aria-hidden="true" />}
      <h2 className="font-display text-[length:var(--font-size-xl)] text-brand-primary-dark">{title}</h2>
      {description && <p className="mt-2 max-w-md text-brand-muted">{description}</p>}
      {actionLabel && (
        <Button className="mt-6" asChild={Boolean(actionHref)} onClick={onAction}>
          {actionHref ? <Link to={actionHref}>{actionLabel}</Link> : actionLabel}
        </Button>
      )}
    </div>
  );
}
