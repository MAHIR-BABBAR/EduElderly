import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, LogOut, Settings, Shield } from 'lucide-react';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useAuthStore, useIsAdmin } from '@/stores/authStore';
import { firstName } from '@/lib/format';
import { cn } from '@/lib/utils';

const LABELS = { default: 'Default', large: 'Large', xl: 'Extra large', huge: 'Huge' };

/**
 * A− / A+ text size stepper that lives in the header on every page, so the
 * most important accessibility control is never more than one tap away. It
 * writes the same preference the Settings page does.
 */
export function TextSizeControl({ className }) {
  const { fontSizePref, fontSizeOptions, updatePrefs } = useAccessibility();
  const index = Math.max(0, fontSizeOptions.indexOf(fontSizePref));
  const [announce, setAnnounce] = useState('');

  const step = (delta) => {
    const next = fontSizeOptions[Math.min(fontSizeOptions.length - 1, Math.max(0, index + delta))];
    if (next === fontSizePref) return;
    updatePrefs({ fontSizePref: next });
    setAnnounce(`Text size: ${LABELS[next]}`);
  };

  const btn =
    'flex h-11 w-11 items-center justify-center rounded-md font-display font-semibold text-brand-primary-dark transition-colors duration-fast hover:bg-brand-primary-soft disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink';

  return (
    <div className={cn('flex items-center rounded-md border border-brand-border bg-brand-surface-raised p-0.5', className)} role="group" aria-label="Text size">
      <button type="button" className={btn} onClick={() => step(-1)} disabled={index === 0} aria-label="Smaller text">
        <span aria-hidden="true" className="text-sm">A−</span>
      </button>
      <button type="button" className={btn} onClick={() => step(1)} disabled={index === fontSizeOptions.length - 1} aria-label="Larger text">
        <span aria-hidden="true" className="text-lg">A+</span>
      </button>
      <span className="sr-only" aria-live="polite">{announce}</span>
    </div>
  );
}

/**
 * Account menu: initials button → a small disclosure menu. Native focus
 * handling, Escape and outside-click to close, arrow keys to move.
 */
export function AccountMenu() {
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const id = useId();

  const name = profile?.name || 'Your account';
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        rootRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onMenuKeyDown = (event) => {
    const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    }
  };

  const item =
    'flex min-h-touch w-full items-center gap-3 rounded-md px-3 text-left font-medium text-brand-text transition-colors duration-fast hover:bg-brand-primary-soft focus-visible:outline-none focus-visible:bg-brand-primary-soft';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-touch items-center gap-2 rounded-full border border-brand-border bg-brand-surface-raised py-1 pl-1 pr-3 transition-colors duration-fast hover:border-brand-border-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink"
      >
        <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary font-display text-sm font-semibold text-white">
          {initials || '?'}
        </span>
        <span className="hidden text-sm font-semibold text-brand-text lg:inline">{firstName(name)}</span>
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          id={id}
          ref={menuRef}
          role="menu"
          aria-label="Account"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-lg border border-brand-border bg-brand-surface-raised p-2 shadow-lift"
        >
          <p className="px-3 pb-2 pt-1 text-sm text-brand-muted">
            Signed in as <span className="font-semibold text-brand-text">{name}</span>
          </p>
          <Link role="menuitem" to="/certificates" className={item} onClick={() => setOpen(false)}>
            <Award className="h-5 w-5 text-brand-accent-ink" aria-hidden="true" />
            My certificates
          </Link>
          <Link role="menuitem" to="/settings" className={item} onClick={() => setOpen(false)}>
            <Settings className="h-5 w-5 text-brand-primary" aria-hidden="true" />
            Settings and accessibility
          </Link>
          {isAdmin && (
            <Link role="menuitem" to="/admin" className={item} onClick={() => setOpen(false)}>
              <Shield className="h-5 w-5 text-brand-primary" aria-hidden="true" />
              Admin console
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className={cn(item, 'mt-1 border-t border-brand-border pt-3')}
            onClick={() => {
              setOpen(false);
              logout();
              navigate('/');
            }}
          >
            <LogOut className="h-5 w-5 text-brand-muted" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
