import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex min-h-[28px] items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-brand-primary text-white',
        secondary: 'bg-brand-accent-soft text-brand-primary-dark',
        outline: 'border-2 border-brand-border bg-white text-brand-text',
        success: 'bg-[var(--color-success-soft)] text-brand-success',
        warning: 'bg-[var(--color-warning-soft)] text-brand-warning',
        // Subject world (SIG-2): resolved from the nearest data-world ancestor.
        world: 'bg-world-soft text-world-ink',
        'world-solid': 'bg-world text-white',
        night: 'bg-white/12 text-brand-on-night',
      },
    },
    defaultVariants: { variant: 'secondary' },
  },
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
