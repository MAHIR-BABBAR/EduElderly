import { describe, expect, it } from 'vitest';
import { FONT_SIZE_PREFS, canUseWebGL, classifyContentUrl, formatPrice, prefersReducedMotion } from '@/lib/utils';

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

describe('classifyContentUrl (SEC-6)', () => {
  it('embeds only real YouTube hosts, via the privacy player, with an encoded id', () => {
    const c = classifyContentUrl('https://www.youtube.com/watch?v=z_GKdFf3qv4&t=3');
    expect(c.kind).toBe('youtube');
    expect(c.src).toBe('https://www.youtube-nocookie.com/embed/z_GKdFf3qv4?rel=0');
    expect(classifyContentUrl('https://youtu.be/z_GKdFf3qv4').kind).toBe('youtube');
  });

  it('does not treat look-alike hosts as YouTube', () => {
    expect(classifyContentUrl('https://youtube.com.evil.tld/watch?v=abcdefg').kind).toBe('external');
    expect(classifyContentUrl('https://notyoutube.com/watch?v=abcdefg').kind).toBe('external');
  });

  it('refuses anything that is not https', () => {
    expect(classifyContentUrl('javascript:alert(1)')).toBeNull();
    expect(classifyContentUrl('data:text/html,<b>x</b>')).toBeNull();
    expect(classifyContentUrl('http://example.com/lesson')).toBeNull();
    expect(classifyContentUrl('')).toBeNull();
    expect(classifyContentUrl({ $ne: null })).toBeNull();
  });

  it('offers other https content as an external link, never a frame', () => {
    expect(classifyContentUrl('https://medlineplus.gov/x')).toEqual({ kind: 'external', href: 'https://medlineplus.gov/x' });
  });
});
