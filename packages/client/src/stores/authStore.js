import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  authApi,
  setAccessToken,
  setUnauthorizedHandler,
  userApi,
} from '@/lib/api';

let bootstrapInFlight = null;
let sessionBootstrapped = false;

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: true,
      pendingOtpEmail: null,

      setPendingOtpEmail: (email) => set({ pendingOtpEmail: email }),

      bootstrap: async () => {
        if (sessionBootstrapped) {
          set({ isLoading: false });
          return;
        }
        if (bootstrapInFlight) return bootstrapInFlight;

        bootstrapInFlight = (async () => {
          set({ isLoading: true });
          try {
            const refreshed = await authApi.refresh();
            const token = refreshed.data?.accessToken;
            if (token) {
              setAccessToken(token);
              const profileRes = await userApi.getProfile();
              set({
                isAuthenticated: true,
                profile: profileRes.data,
                user: profileRes.data,
                isLoading: false,
              });
              return;
            }
          } catch {
            setAccessToken(null);
          }
          set({ isAuthenticated: false, user: null, profile: null, isLoading: false });
        })();

        try {
          await bootstrapInFlight;
        } finally {
          sessionBootstrapped = true;
          bootstrapInFlight = null;
        }
      },

      loginSuccess: async (accessToken, user) => {
        setAccessToken(accessToken);
        set({ user, isAuthenticated: true, pendingOtpEmail: null });
        try {
          const profileRes = await userApi.getProfile();
          set({ profile: profileRes.data, user: profileRes.data });
        } catch {
          set({ profile: user });
        }
      },

      refreshProfile: async () => {
        const profileRes = await userApi.getProfile();
        set({ profile: profileRes.data, user: profileRes.data });
        return profileRes.data;
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          /* ignore */
        }
        setAccessToken(null);
        set({ user: null, profile: null, isAuthenticated: false, pendingOtpEmail: null });
      },
    }),
    {
      name: 'eduelderly-auth',
      partialize: (state) => ({ pendingOtpEmail: state.pendingOtpEmail }),
    },
  ),
);

setUnauthorizedHandler(() => {
  const { logout } = useAuthStore.getState();
  logout();
});

export function useIsAdmin() {
  return useAuthStore((s) => s.profile?.role === 'admin');
}
