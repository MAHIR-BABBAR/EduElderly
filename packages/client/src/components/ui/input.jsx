import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-12 w-full rounded-[var(--radius-md)] border-2 border-brand-border bg-white px-4 py-2 text-[length:var(--font-size-base)] text-brand-text placeholder:text-brand-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
