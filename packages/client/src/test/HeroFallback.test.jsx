import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { HeroFallback } from '@/components/landing/HeroFallback';

describe('HeroFallback', () => {
  it('renders decorative fallback without accessible text', () => {
    const { container } = render(<HeroFallback />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});
