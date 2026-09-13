import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { userApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const AccessibilityContext = createContext(null);

function applyDocumentTheme({ fontSizePref, highContrast }) {
  const root = document.documentElement;
  root.dataset.fontSize = fontSizePref || 'large';
  root.dataset.highContrast = highContrast ? 'true' : 'false';
}

export function AccessibilityProvider({ children }) {
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const prefs = useMemo(
    () => ({
      fontSizePref: profile?.fontSizePref || 'large',
      highContrast: Boolean(profile?.highContrast),
      lang: profile?.lang || 'en',
    }),
    [profile],
  );

  useEffect(() => {
    applyDocumentTheme(prefs);
  }, [prefs]);

  const updatePrefs = useCallback(
    async (updates) => {
      const res = await userApi.updateProfile(updates);
      await refreshProfile();
      applyDocumentTheme({
        fontSizePref: res.data?.fontSizePref ?? updates.fontSizePref ?? prefs.fontSizePref,
        highContrast:
          res.data?.highContrast ?? updates.highContrast ?? prefs.highContrast,
      });
      return res.data;
    },
    [prefs.fontSizePref, prefs.highContrast, refreshProfile],
  );

  const value = useMemo(
    () => ({
      ...prefs,
      isAuthenticated,
      updatePrefs,
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

/** Apply default elderly-first prefs for guests */
export function GuestAccessibilityInit() {
  useEffect(() => {
    applyDocumentTheme({ fontSizePref: 'large', highContrast: false });
  }, []);
  return null;
}
