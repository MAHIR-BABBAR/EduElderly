import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { bentoStagger, bentoTile } from '@/lib/motion';

/**
 * Bento composition: mixed-size tiles on one grid, replacing rows of
 * identical cards. One column on phones, six on tablets, twelve on desktop.
 * Tiles arrive once in quick sequence; static under reduced motion.
 */
export function Bento({ children, className, animate = true }) {
  const Root = animate ? motion.section : 'section';
  const props = animate ? { variants: bentoStagger(), initial: 'hidden', animate: 'visible' } : {};
  return (
    <Root
      {...props}
      className={cn('grid grid-cols-1 gap-5 md:grid-cols-6 lg:grid-cols-12', className)}
    >
      {children}
    </Root>
  );
}

const SPANS = {
  sm: 'md:col-span-3 lg:col-span-3',
  md: 'md:col-span-3 lg:col-span-4',
  lg: 'md:col-span-6 lg:col-span-6',
  wide: 'md:col-span-6 lg:col-span-8',
  full: 'md:col-span-6 lg:col-span-12',
  tall: 'md:col-span-3 lg:col-span-4 md:row-span-2',
};

const TONES = {
  raised: 'bg-brand-surface-raised border border-brand-border shadow-card',
  sunken: 'bg-brand-surface-sunken border border-brand-border',
  night: 'bg-brand-night text-brand-on-night on-night shadow-lift',
  world: 'bg-world-soft border border-brand-border',
  'world-solid': 'bg-world-gradient text-white on-night shadow-lift',
  accent: 'bg-cta border border-brand-border',
};

export function BentoTile({
  span = 'sm',
  tone = 'raised',
  as: Tag = 'div',
  animate = true,
  className,
  children,
  ...props
}) {
  const Root = animate ? motion[Tag] || motion.div : Tag;
  const motionProps = animate ? { variants: bentoTile() } : {};
  return (
    <Root
      {...motionProps}
      className={cn(
        'relative overflow-hidden rounded-lg p-6',
        SPANS[span] || SPANS.sm,
        TONES[tone] || TONES.raised,
        className,
      )}
      {...props}
    >
      {children}
    </Root>
  );
}
