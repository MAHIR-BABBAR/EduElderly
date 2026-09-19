/**
 * Motion vocabulary for the whole app.
 *
 * DESIGN.md splits the product into two zones and this file encodes that split
 * so no page has to remember the rule:
 *
 *   Calm zone (everything behind the landing page) — CSS-speed transitions,
 *   200ms hard cap, no parallax, no 3D. Use `fadeUp`, `listStagger`, `pageTransition`.
 *
 *   Immersive zone (landing marketing only) — richer entrances up to 800ms.
 *   Use `heroReveal` and `heroStagger`.
 *
 * Every variant collapses to an instant, static state when the viewer asks for
 * reduced motion, so nothing here needs a per-component guard.
 */

import { prefersReducedMotion } from '@/lib/utils';

const CALM_MS = 0.2;
const FAST_MS = 0.12;
const HERO_MS = 0.6;
const EASE = [0.25, 0.1, 0.25, 1];

export { prefersReducedMotion };

/** Returns the variant, or a no-op version when motion is reduced. */
function respectMotion(variants) {
  if (!prefersReducedMotion()) return variants;
  return {
    hidden: { opacity: 1 },
    visible: { opacity: 1, transition: { duration: 0 } },
  };
}

/* ---- Calm zone ---------------------------------------------------------- */

export const fadeUp = () =>
  respectMotion({
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: CALM_MS, ease: EASE } },
  });

export const fadeIn = () =>
  respectMotion({
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: CALM_MS, ease: EASE } },
  });

/**
 * Parent variant: children animate in sequence. Pair with `fadeUp` on items.
 * Stated explicitly rather than routed through `respectMotion`, so the
 * stagger value is always present and readable as 0 when motion is reduced.
 */
export const listStagger = (staggerSeconds = 0.05) => ({
  hidden: {},
  visible: { transition: { staggerChildren: prefersReducedMotion() ? 0 : staggerSeconds } },
});

/** Route change: a short rise-and-fade. Keeps the app feeling continuous. */
export const pageTransition = () => {
  if (prefersReducedMotion()) {
    return { initial: false, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } };
  }
  return {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: CALM_MS, ease: EASE },
  };
};

/** A pressable element's feedback. Never scales below 0.98 — no bounce. */
export const pressable = () =>
  prefersReducedMotion() ? {} : { whileTap: { scale: 0.98 }, transition: { duration: FAST_MS } };

/* ---- Immersive zone (landing only) -------------------------------------- */

export const heroReveal = (delay = 0) =>
  respectMotion({
    hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: HERO_MS, delay, ease: EASE },
    },
  });

export const heroStagger = (staggerSeconds = 0.09) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: prefersReducedMotion() ? 0 : staggerSeconds,
      delayChildren: prefersReducedMotion() ? 0 : 0.1,
    },
  },
});

/**
 * Celebration moment — the one place the calm zone is allowed a flourish, per
 * the DESIGN.md exception: once per achievement, under two seconds, and
 * completely skipped under reduced motion (a static badge is shown instead).
 */
export const CELEBRATION_MS = 1800;

export const celebrate = () =>
  prefersReducedMotion()
    ? { initial: false, animate: { opacity: 1, scale: 1 } }
    : {
        initial: { opacity: 0, scale: 0.94 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.45, ease: EASE },
      };

/** Standard viewport trigger for scroll reveals: fire once, slightly early. */
export const inViewOnce = { once: true, margin: '-8%' };
