import { NavLink } from 'react-router-dom';
import { BookOpen, GraduationCap, Home, LogIn, UserRound } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

/**
 * Bottom tabs on phones: four at most, labels always visible, 64px tall
 * plus the safe-area inset. The active tab is a filled pill — colour and
 * shape, never colour alone.
 */
export function MobileTabBar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const tabs = isAuthenticated
    ? [
        { to: '/dashboard', label: 'Home', icon: Home },
        { to: '/courses', label: 'Courses', icon: BookOpen },
        { to: '/certificates', label: 'Awards', icon: GraduationCap },
        { to: '/settings', label: 'Me', icon: UserRound },
      ]
    : [
        { to: '/', label: 'Home', icon: Home, end: true },
        { to: '/courses', label: 'Courses', icon: BookOpen },
        { to: '/login', label: 'Sign in', icon: LogIn },
      ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-border bg-brand-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex px-2">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-sm font-semibold transition-colors duration-fast',
                  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink',
                  isActive ? 'text-brand-primary-dark' : 'text-brand-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-fast',
                      isActive ? 'bg-brand-primary-soft' : 'bg-transparent',
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
