import { Link, NavLink, Outlet } from 'react-router-dom';
import { BookOpen, LayoutDashboard, LogOut, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { useAuthStore, useIsAdmin } from '@/stores/authStore';
import { cn } from '@/lib/utils';

const navLinkClass = ({ isActive }) =>
  cn(
    'inline-flex min-h-touch items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors',
    isActive ? 'bg-brand-primary text-white' : 'text-brand-text hover:bg-brand-primary/10',
  );

export function AppShell() {
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useIsAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="border-b border-brand-border bg-white/90 backdrop-blur">
        <div className="page-container flex flex-wrap items-center justify-between gap-4 py-4">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="flex items-center gap-2 font-display text-[length:var(--font-size-xl)] font-bold text-brand-primary-dark"
          >
            <BookOpen aria-hidden="true" className="h-8 w-8 text-brand-primary" />
            EduElderly
          </Link>
          <nav aria-label="Main navigation" className="hidden flex-wrap items-center gap-2 md:flex">
            <NavLink to="/courses" className={navLinkClass}>
              Courses
            </NavLink>
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>
                  <LayoutDashboard aria-hidden="true" className="h-5 w-5" />
                  My Learning
                </NavLink>
                <NavLink to="/settings" className={navLinkClass}>
                  <Settings aria-hidden="true" className="h-5 w-5" />
                  Settings
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin" className={navLinkClass}>
                    <Shield aria-hidden="true" className="h-5 w-5" />
                    Admin
                  </NavLink>
                )}
                {profile?.name && (
                  <span className="px-2 text-[length:var(--font-size-sm)] text-brand-muted">
                    Hi, {profile.name.split(' ')[0]}
                  </span>
                )}
                <Button variant="outline" onClick={logout} aria-label="Sign out">
                  <LogOut aria-hidden="true" className="h-5 w-5" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Sign in
                </NavLink>
                <Button asChild>
                  <Link to="/register">Create account</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main-content" className="flex-1 pb-24 md:pb-8">
        <Outlet />
      </main>
      <footer className="border-t border-brand-border bg-white py-8 pb-24 text-center text-brand-muted md:pb-8">
        <p>EduElderly — Learning made welcoming</p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[length:var(--font-size-sm)]">
          <Link to="/verify-certificate" className="underline hover:text-brand-primary">
            Verify a certificate
          </Link>
          <span aria-hidden="true">·</span>
          <a href="#accessibility" className="underline hover:text-brand-primary">
            Accessibility
          </a>
          <span aria-hidden="true">·</span>
          <a href="mailto:support@eduelderly.com" className="underline hover:text-brand-primary">
            Need help?
          </a>
        </p>
      </footer>
      <MobileTabBar />
    </div>
  );
}
