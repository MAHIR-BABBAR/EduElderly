import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex min-h-[28px] items-center rounded-full px-3 py-1 text-[length:var(--font-size-sm)] font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-brand-primary text-white',
        secondary: 'bg-brand-accent-soft text-brand-primary-dark',
        outline: 'border-2 border-brand-border bg-white text-brand-text',
        success: 'bg-[var(--color-success-soft)] text-brand-success',
        warning: 'bg-[var(--color-warning-soft)] text-brand-warning',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
