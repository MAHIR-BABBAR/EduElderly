import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, GraduationCap, LogOut, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { RouteChange } from '@/components/layout/RouteChange';
import { useAuthStore, useIsAdmin } from '@/stores/authStore';
import { pageTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';

const navLinkClass = ({ isActive }) =>
  cn(
    'inline-flex min-h-touch items-center gap-2 rounded-md px-4 py-2 font-semibold transition-colors duration-fast',
    isActive
      ? 'bg-brand-primary text-white'
      : 'text-brand-text hover:bg-brand-primary-soft hover:text-brand-primary-dark',
  );

function Brand({ to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md font-display text-xl font-bold text-brand-primary-dark"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary">
        <BookOpen aria-hidden="true" className="h-6 w-6 text-white" />
      </span>
      EduElderly
    </Link>
  );
}

export function AppShell() {
  const location = useLocation();
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useIsAdmin();
  const transition = pageTransition();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <RouteChange />

      <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-surface-raised/95 backdrop-blur supports-[backdrop-filter]:bg-brand-surface-raised/80">
        <div className="mx-auto flex w-full max-w-content flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Brand to={isAuthenticated ? '/dashboard' : '/'} />

          <nav aria-label="Main navigation" className="hidden flex-wrap items-center gap-1 md:flex">
            <NavLink to="/courses" className={navLinkClass}>
              Courses
            </NavLink>
            {isAuthenticated ? (
              <>
                <NavLink to="/dashboard" className={navLinkClass}>
                  <GraduationCap aria-hidden="true" className="h-5 w-5" />
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
                <span className="ml-2 hidden items-center gap-3 border-l border-brand-border pl-3 lg:flex">
                  {profile?.name && (
                    <span className="text-sm text-brand-muted">
                      Hi, {profile.name.split(' ')[0]}
                    </span>
                  )}
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut aria-hidden="true" className="h-5 w-5" />
                    Sign out
                  </Button>
                </span>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Sign in
                </NavLink>
                <Button asChild className="ml-1">
                  <Link to="/register">Create account</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex-1 pb-24 md:pb-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} {...transition}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-brand-border bg-brand-surface-raised pb-24 md:pb-0">
        <div className="mx-auto grid w-full max-w-content gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
          <div>
            <Brand to="/" />
            <p className="mt-3 text-sm text-brand-muted">Learning made welcoming.</p>
          </div>
          <nav aria-labelledby="footer-learn">
            <h2 id="footer-learn" className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-text">
              Learn
            </h2>
            <ul className="space-y-2 text-brand-muted">
              <li><Link to="/courses" className="hover:text-brand-primary hover:underline">Browse courses</Link></li>
              <li><Link to="/dashboard" className="hover:text-brand-primary hover:underline">My learning</Link></li>
              <li><Link to="/certificates" className="hover:text-brand-primary hover:underline">My certificates</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-support">
            <h2 id="footer-support" className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-text">
              Support
            </h2>
            <ul className="space-y-2 text-brand-muted">
              <li><Link to="/verify-certificate" className="hover:text-brand-primary hover:underline">Verify a certificate</Link></li>
              <li><a href="mailto:support@eduelderly.com" className="hover:text-brand-primary hover:underline">Email us</a></li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-access">
            <h2 id="footer-access" className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-text">
              Accessibility
            </h2>
            <ul className="space-y-2 text-brand-muted">
              <li><Link to="/settings" className="hover:text-brand-primary hover:underline">Text size and contrast</Link></li>
              <li><Link to="/accessibility" className="hover:text-brand-primary hover:underline">Our commitment</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-brand-border py-5 text-center text-sm text-brand-muted">
          © {new Date().getFullYear()} EduElderly. Built for learners of every age.
        </div>
      </footer>

      <MobileTabBar />
    </div>
  );
}
