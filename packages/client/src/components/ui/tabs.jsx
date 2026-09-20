import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('flex flex-wrap gap-2 border-b-2 border-brand-border', className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

/**
 * The active tab is marked by a solid underline plus a weight change, not
 * colour alone, so it stays legible in high-contrast mode.
 */
const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'min-h-touch -mb-0.5 rounded-t-md border-b-4 border-transparent px-4 py-2 text-base font-semibold text-brand-muted',
      'transition-colors duration-fast hover:text-brand-primary',
      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-dark',
      'data-[state=active]:border-brand-primary data-[state=active]:text-brand-primary-dark',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('pt-6 focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
