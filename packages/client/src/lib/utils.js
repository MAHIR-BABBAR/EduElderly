import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const FONT_SIZE_PREFS = ['default', 'large', 'xl', 'huge'];

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function canUseWebGL() {
  if (typeof window === 'undefined') return false;
  if (prefersReducedMotion()) return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl'),
    );
  } catch {
    return false;
  }
}

export function formatPrice(centsOrUnits) {
  const amount = Number(centsOrUnits) || 0;
  return amount === 0 ? 'Free' : `$${amount.toFixed(2)}`;
}

/** Convert YouTube watch URLs to embeddable iframe URLs. */
export function toEmbedUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (parsed.hostname === 'youtu.be') {
      const videoId = parsed.pathname.replace(/^\//, '');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch {
    /* keep original url */
  }
  return url;
}
