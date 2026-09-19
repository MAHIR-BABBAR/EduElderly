import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * `interactive` adds a 2px lift and a stronger shadow on hover/focus-within,
 * at the calm-zone speed cap. Use it on cards that are entirely a link to
 * somewhere; leave it off for cards that just display information.
 */
const Card = React.forwardRef(({ className, interactive = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'card-surface',
      interactive &&
        'relative transition-[transform,box-shadow] duration-calm hover:-translate-y-0.5 hover:shadow-lift focus-within:-translate-y-0.5 focus-within:shadow-lift motion-reduce:transform-none motion-reduce:transition-none',
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mb-4 flex flex-col gap-2', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, as: Tag = 'h3', children, ...props }, ref) => (
  <Tag ref={ref} className={cn('font-display text-xl leading-tight text-brand-primary-dark', className)} {...props}>
    {children}
  </Tag>
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-brand-muted', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mt-6 flex flex-wrap items-center gap-3', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
