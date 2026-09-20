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

const YOUTUBE_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']);
const YOUTUBE_ID = /^[\w-]{6,20}$/;

/**
 * Decide how a lesson's contentUrl may be shown (SEC-6). Only https URLs are
 * accepted at all. YouTube (exact host match, so `youtube.com.evil.tld` does
 * not pass) becomes a sandboxed embed of the privacy-enhanced player;
 * anything else is offered as an external link, never framed.
 *
 * @returns {{ kind: 'youtube', src: string, href: string } | { kind: 'external', href: string } | null}
 */
export function classifyContentUrl(url) {
  if (!url || typeof url !== 'string') return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;

  let videoId = null;
  if (YOUTUBE_HOSTS.has(parsed.hostname)) {
    videoId = parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1] || null;
  } else if (parsed.hostname === 'youtu.be') {
    videoId = parsed.pathname.replace(/^\//, '').split('/')[0] || null;
  }
  if (videoId && YOUTUBE_ID.test(videoId)) {
    return {
      kind: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`,
      href: parsed.href,
    };
  }
  return { kind: 'external', href: parsed.href };
}

/** @deprecated use classifyContentUrl — kept for callers that only need an embed URL. */
export function toEmbedUrl(url) {
  const c = classifyContentUrl(url);
  return c?.kind === 'youtube' ? c.src : null;
}
