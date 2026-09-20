import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/utils';

const isHighContrast = () =>
  typeof document !== 'undefined' && document.documentElement.dataset.highContrast === 'true';

const isPointerFine = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches;

/**
 * Pointer-tracking spotlight for interactive cards. Sets `--mx` / `--my` on
 * the element (percentages) from one rAF-throttled pointermove handler; the
 * CSS `.spotlight` class paints a radial highlight from them. A no-op on
 * touch, under reduced motion, and in high contrast — a decoration, never a
 * cue anything depends on.
 */
export function useSpotlight(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !isPointerFine() || prefersReducedMotion() || isHighContrast()) return undefined;

    let frame = 0;
    const onMove = (event) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = el.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty('--mx', `${x.toFixed(1)}%`);
        el.style.setProperty('--my', `${y.toFixed(1)}%`);
      });
    };
    const onLeave = () => {
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
    };

    el.classList.add('spotlight');
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      el.classList.remove('spotlight');
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [ref]);
}
