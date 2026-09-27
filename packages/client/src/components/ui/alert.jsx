import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva('rounded-[var(--radius-md)] border-2 p-4 text-[length:var(--font-size-base)]', {
  variants: {
    variant: {
      error: 'border-brand-danger bg-[var(--color-danger-soft)] text-brand-danger',
      success: 'border-brand-success bg-[var(--color-success-soft)] text-brand-success',
      warning: 'border-brand-warning bg-[var(--color-warning-soft)] text-brand-warning',
      info: 'border-brand-primary bg-brand-accent-soft text-brand-primary-dark',
    },
  },
  defaultVariants: { variant: 'info' },
});

export function Alert({ className, variant, role = 'status', children, ...props }) {
  const alertRole = variant === 'error' ? 'alert' : role;
  return (
    <div className={cn(alertVariants({ variant }), className)} role={alertRole} {...props}>
      {children}
    </div>
  );
}
