import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { prefersReducedMotion } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function BlurText({ text, className, delay = 0.05 }) {
  const reduced = prefersReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10%' });
  const words = text.split(' ');

  if (reduced) {
    return (
      <span ref={ref} className={className}>
        {text}
      </span>
    );
  }

  return (
    <>
      <span className="sr-only">{text}</span>
      <span ref={ref} className={cn('inline', className)} aria-hidden="true">
        {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="mr-[0.25em] inline-block"
          initial={{ opacity: 0, filter: 'blur(8px)', y: 12 }}
          animate={inView ? { opacity: 1, filter: 'blur(0px)', y: 0 } : {}}
          transition={{ duration: 0.5, delay: i * delay, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {word}
        </motion.span>
      ))}
      </span>
    </>
  );
}

export function StaggerChildren({ children, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-5%' });
  const reduced = prefersReducedMotion();

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={i}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={inView && !reduced ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {child}
            </motion.div>
          ))
        : children}
    </div>
  );
}

export function GlowCard({ children, className }) {
  const [hover, setHover] = useState(false);
  const reduced = prefersReducedMotion();

  return (
    <div
      className={cn(
        'card-surface relative transition-shadow duration-300',
        !reduced && hover && 'shadow-[0_0_0_2px_var(--color-accent),var(--shadow-card)]',
        className,
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </div>
  );
}
