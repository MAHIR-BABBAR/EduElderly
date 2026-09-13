import { NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Home, LogOut, Settings, Shield } from 'lucide-react';
import { useAuthStore, useIsAdmin } from '@/stores/authStore';
import { cn } from '@/lib/utils';

const baseTabs = [
  { to: '/', label: 'Home', icon: Home, end: true, guest: true },
  { to: '/courses', label: 'Courses', icon: BookOpen, guest: true },
  { to: '/dashboard', label: 'Learning', icon: GraduationCap, auth: true },
  { to: '/settings', label: 'Settings', icon: Settings, auth: true },
];

export function MobileTabBar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();

  const tabs = [...baseTabs];
  if (isAuthenticated && isAdmin) {
    tabs.push({ to: '/admin', label: 'Admin', icon: Shield, auth: true });
  }

  const visible = tabs.filter((t) => {
    if (t.auth && !isAuthenticated) return false;
    if (t.guest === false && !isAuthenticated) return false;
    return true;
  });

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-brand-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex">
        {visible.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-touch flex-col items-center justify-center gap-1 px-1 py-2 text-[length:var(--font-size-sm)] font-semibold',
                  isActive ? 'text-brand-primary' : 'text-brand-muted',
                )
              }
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
        {isAuthenticated && (
          <li className="flex-1">
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="flex min-h-touch w-full flex-col items-center justify-center gap-1 px-1 py-2 text-[length:var(--font-size-sm)] font-semibold text-brand-muted"
            >
              <LogOut className="h-6 w-6" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
