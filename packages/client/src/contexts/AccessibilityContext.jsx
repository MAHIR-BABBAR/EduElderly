import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { FONT_SIZE_PREFS } from '@/lib/utils';

const AccessibilityContext = createContext(null);
const STORAGE_KEY = 'eduelderly:a11y';
const DEFAULTS = { fontSizePref: 'large', highContrast: false, lang: 'en' };

function applyDocumentTheme({ fontSizePref, highContrast }) {
  const root = document.documentElement;
  root.dataset.fontSize = FONT_SIZE_PREFS.includes(fontSizePref) ? fontSizePref : 'large';
  root.dataset.highContrast = highContrast ? 'true' : 'false';
}

// Guests (and signed-in learners before their profile loads) keep their
// choice on this device so the site does not snap back to defaults.
function readLocal() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function writeLocal(prefs) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fontSizePref: prefs.fontSizePref, highContrast: prefs.highContrast }),
    );
  } catch {
    /* storage unavailable — the preference still applies for this visit */
  }
}

export function AccessibilityProvider({ children }) {
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [local, setLocal] = useState(readLocal);

  const prefs = useMemo(
    () =>
      profile
        ? {
            fontSizePref: profile.fontSizePref || 'large',
            highContrast: Boolean(profile.highContrast),
            lang: profile.lang || 'en',
          }
        : local,
    [profile, local],
  );

  useEffect(() => {
    applyDocumentTheme(prefs);
  }, [prefs]);

  const updatePrefs = useCallback(
    async (updates) => {
      const next = { ...prefs, ...updates };
      // Apply immediately so the change is felt before any network round-trip.
      applyDocumentTheme(next);
      writeLocal(next);
      setLocal(next);
      if (!isAuthenticated) return next;
      const res = await userApi.updateProfile(updates);
      await refreshProfile();
      return res.data;
    },
    [prefs, isAuthenticated, refreshProfile],
  );

  const value = useMemo(
    () => ({
      ...prefs,
      isAuthenticated,
      updatePrefs,
      fontSizeOptions: FONT_SIZE_PREFS,
    }),
    [prefs, isAuthenticated, updatePrefs],
  );

  return (
    <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return ctx;
}

/** Applies the stored (or default) theme before the app has any profile. */
export function GuestAccessibilityInit() {
  useEffect(() => {
    applyDocumentTheme(readLocal());
  }, []);
  return null;
}
