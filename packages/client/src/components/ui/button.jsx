import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold btn-touch',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-fast',
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-dark focus-visible:ring-offset-2',
    // A small press reaction confirms the tap on a touchscreen without bouncing.
    'active:scale-[0.98] motion-reduce:active:scale-100 motion-reduce:transition-none',
    'disabled:pointer-events-none disabled:opacity-60',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-brand-primary text-white shadow-sm hover:bg-brand-primary-dark',
        accent: 'bg-brand-accent text-brand-primary-dark shadow-sm hover:bg-brand-accent/90',
        secondary: 'bg-brand-primary-soft text-brand-primary-dark hover:bg-brand-accent-soft',
        outline: 'border-2 border-brand-primary bg-transparent text-brand-primary hover:bg-brand-primary-soft',
        'outline-inverse': 'border-2 border-white/80 bg-transparent text-white hover:bg-white/15',
        ghost: 'text-brand-primary hover:bg-brand-primary-soft',
        danger: 'bg-brand-danger text-white hover:bg-brand-danger/90',
      },
      size: {
        sm: 'h-11 px-4 text-sm',
        default: 'h-12 px-6 text-base',
        lg: 'h-14 px-8 text-lg',
        icon: 'h-12 w-12',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

/**
 * `loading` swaps the leading icon for a spinner, disables the button, and
 * announces the busy state. Pass `loadingLabel` to change the visible text
 * while busy ("Saving…"), which is clearer than a bare spinner.
 */
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, loading = false, loadingLabel, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';

    if (asChild) {
      return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>{children}</Comp>;
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {loading && loadingLabel ? loadingLabel : children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
