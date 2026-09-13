import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

const Label = ({ className, ...props }) => (
  <LabelPrimitive.Root
    className={cn(
      'mb-2 block text-[length:var(--font-size-base)] font-semibold text-brand-text',
      className,
    )}
    {...props}
  />
);

export { Label };
