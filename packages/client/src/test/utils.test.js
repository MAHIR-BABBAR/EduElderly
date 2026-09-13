import { describe, expect, it } from 'vitest';
import { FONT_SIZE_PREFS, canUseWebGL, formatPrice, prefersReducedMotion } from '@/lib/utils';

describe('utils', () => {
  it('formatPrice shows Free for zero', () => {
    expect(formatPrice(0)).toBe('Free');
  });

  it('formatPrice formats paid courses', () => {
    expect(formatPrice(19.99)).toBe('$19.99');
  });

  it('FONT_SIZE_PREFS includes elderly defaults', () => {
    expect(FONT_SIZE_PREFS).toContain('large');
    expect(FONT_SIZE_PREFS).toContain('huge');
  });

  it('prefersReducedMotion returns boolean', () => {
    expect(typeof prefersReducedMotion()).toBe('boolean');
  });

  it('canUseWebGL returns boolean', () => {
    expect(typeof canUseWebGL()).toBe('boolean');
  });
});
