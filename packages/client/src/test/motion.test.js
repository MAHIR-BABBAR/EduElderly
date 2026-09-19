import { afterEach, describe, expect, it, vi } from 'vitest';
import { fadeUp, listStagger, pageTransition, pressable, celebrate, heroReveal } from '@/lib/motion';

/**
 * The reduced-motion contract is the part of the design system most likely to
 * rot silently: a variant added without a guard animates for someone who asked
 * the operating system not to. These tests pin the behaviour of every exported
 * variant in both states.
 */
function setReducedMotion(reduced) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: reduced && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('motion variants with motion allowed', () => {
  it('fadeUp moves and fades', () => {
    setReducedMotion(false);
    const variants = fadeUp();
    expect(variants.hidden).toEqual({ opacity: 0, y: 8 });
    expect(variants.visible.y).toBe(0);
  });

  it('keeps calm-zone transitions within the 200ms budget', () => {
    setReducedMotion(false);
    expect(fadeUp().visible.transition.duration).toBeLessThanOrEqual(0.2);
    expect(pageTransition().transition.duration).toBeLessThanOrEqual(0.2);
  });

  it('staggers list children', () => {
    setReducedMotion(false);
    expect(listStagger(0.05).visible.transition.staggerChildren).toBe(0.05);
  });

  it('gives a press response that never bounces past the resting size', () => {
    setReducedMotion(false);
    expect(pressable().whileTap.scale).toBe(0.98);
  });

  it('allows the landing hero a longer entrance than the calm zone', () => {
    setReducedMotion(false);
    const duration = heroReveal().visible.transition.duration;
    expect(duration).toBeGreaterThan(0.2);
    expect(duration).toBeLessThanOrEqual(0.8);
  });

  it('keeps the celebration under two seconds', () => {
    setReducedMotion(false);
    expect(celebrate().transition.duration).toBeLessThanOrEqual(2);
  });
});

describe('motion variants with reduced motion requested', () => {
  it('fadeUp does not move or fade', () => {
    setReducedMotion(true);
    const variants = fadeUp();
    expect(variants.hidden).toEqual({ opacity: 1 });
    expect(variants.visible.transition.duration).toBe(0);
  });

  it('removes the stagger delay', () => {
    setReducedMotion(true);
    expect(listStagger(0.05).visible.transition.staggerChildren).toBe(0);
  });

  it('makes route changes instant', () => {
    setReducedMotion(true);
    const transition = pageTransition();
    expect(transition.initial).toBe(false);
    expect(transition.transition.duration).toBe(0);
  });

  it('drops the press animation entirely', () => {
    setReducedMotion(true);
    expect(pressable()).toEqual({});
  });

  it('shows the celebration as a static state', () => {
    setReducedMotion(true);
    const variant = celebrate();
    expect(variant.initial).toBe(false);
    expect(variant.animate.scale).toBe(1);
  });
});
