import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A panel that slides in from an edge. Used for the lesson curriculum on
 * phones, where a sidebar has nowhere to go.
 *
 * Built on Radix Dialog, so it traps focus, closes on Escape, and restores
 * focus to the trigger — behaviour a hand-rolled drawer usually gets wrong.
 */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

const SheetContent = React.forwardRef(({ className, children, side = 'bottom', title, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 border-brand-border bg-white shadow-lift focus:outline-none',
        side === 'bottom' && 'inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-xl border-t-2 pb-[env(safe-area-inset-bottom)]',
        side === 'right' && 'inset-y-0 right-0 w-[min(24rem,90vw)] overflow-y-auto border-l-2',
        className,
      )}
      {...props}
    >
      <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-brand-border bg-white px-5 py-4">
        <DialogPrimitive.Title className="font-display text-xl text-brand-primary-dark">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Close
          aria-label="Close"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-brand-muted hover:bg-brand-surface"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </DialogPrimitive.Close>
      </div>
      <div className="px-5 py-4">{children}</div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = 'SheetContent';

export { Sheet, SheetTrigger, SheetClose, SheetContent };
