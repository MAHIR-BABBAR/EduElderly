import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Toasts for the outcome of an action ("Course published", "Could not save").
 *
 * Elderly-first choices baked in: they sit top-center where the eye already is
 * rather than bottom-right, they last 8 seconds instead of the usual 3, errors
 * never auto-dismiss, and every toast has a 44px close button. Screen readers
 * get them through Radix's live region.
 */

const ToastContext = React.createContext(null);

const VARIANTS = {
  success: { icon: CheckCircle2, className: 'border-brand-success bg-brand-success-soft text-brand-success' },
  error: { icon: AlertCircle, className: 'border-brand-danger bg-brand-danger-soft text-brand-danger' },
  info: { icon: Info, className: 'border-brand-primary bg-brand-primary-soft text-brand-primary-dark' },
};

const DEFAULT_DURATION = 8000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const dismiss = React.useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((message, { variant = 'info', title, duration } = {}) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((current) => [
      ...current,
      // Errors stay until dismissed: an older learner should never lose an
      // error message to a timer while they are still reading it.
      { id, message, title, variant, duration: duration ?? (variant === 'error' ? Infinity : DEFAULT_DURATION) },
    ]);
    return id;
  }, []);

  const api = React.useMemo(
    () => ({
      toast,
      success: (message, options) => toast(message, { ...options, variant: 'success' }),
      error: (message, options) => toast(message, { ...options, variant: 'error' }),
      info: (message, options) => toast(message, { ...options, variant: 'info' }),
      dismiss,
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider swipeDirection="up" duration={DEFAULT_DURATION}>
        {children}
        {toasts.map(({ id, message, title, variant, duration }) => {
          const { icon: Icon, className } = VARIANTS[variant] ?? VARIANTS.info;
          return (
            <ToastPrimitive.Root
              key={id}
              duration={duration === Infinity ? 1000 * 60 * 60 : duration}
              onOpenChange={(open) => !open && dismiss(id)}
              className={cn(
                'pointer-events-auto flex w-full items-start gap-3 rounded-lg border-2 p-4 shadow-card',
                'data-[state=open]:animate-toast-in data-[state=closed]:animate-toast-out motion-reduce:animate-none',
                className,
              )}
            >
              <Icon className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                {title && <ToastPrimitive.Title className="font-semibold">{title}</ToastPrimitive.Title>}
                <ToastPrimitive.Description className="text-base">{message}</ToastPrimitive.Description>
              </div>
              <ToastPrimitive.Close
                aria-label="Dismiss notification"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-black/5"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed left-1/2 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-3" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
