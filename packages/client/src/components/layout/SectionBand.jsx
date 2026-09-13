import { cn } from '@/lib/utils';

export function SectionBand({ children, variant = 'default', className, id }) {
  return (
    <section
      id={id}
      className={cn(
        'py-16 md:py-20',
        variant === 'accent' && 'bg-brand-accent-soft',
        variant === 'default' && 'bg-brand-surface',
        variant === 'white' && 'bg-white',
        className,
      )}
    >
      <div className="page-container">{children}</div>
    </section>
  );
}
