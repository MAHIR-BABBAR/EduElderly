import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent disabled:pointer-events-none disabled:opacity-50 btn-touch',
  {
    variants: {
      variant: {
        default: 'bg-brand-primary text-white hover:bg-brand-primary-dark',
        secondary: 'bg-brand-accent-soft text-brand-primary-dark hover:bg-brand-accent/30',
        outline: 'border-2 border-brand-primary bg-transparent text-brand-primary hover:bg-brand-primary/10',
        ghost: 'text-brand-primary hover:bg-brand-primary/10',
        danger: 'bg-brand-danger text-white hover:opacity-90',
      },
      size: {
        default: 'h-12 px-6 text-[length:var(--font-size-base)]',
        lg: 'h-14 px-8 text-[length:var(--font-size-lg)]',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
