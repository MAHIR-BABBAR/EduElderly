import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function FormField({ label, htmlFor, hint, error, children, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-[length:var(--font-size-sm)] text-brand-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} className="text-[length:var(--font-size-sm)] text-brand-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
