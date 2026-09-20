import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { RouteChange } from '@/components/layout/RouteChange';
import { AccountMenu, TextSizeControl } from '@/components/layout/HeaderControls';
import { useAuthStore, useIsAdmin } from '@/stores/authStore';
import { pageTransition, prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

/**
 * The frame around every screen (plan F-7): a sticky paper header whose
 * hairline only appears once the page has scrolled, text links with an
 * animated pill under the active route, an always-present text-size control,
 * and an account menu. Routed content sits inside a LayoutGroup so a course
 * cover can morph from one screen to the next (SIG-7).
 */
function Brand({ to }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 rounded-md font-display text-xl font-semibold text-brand-primary-dark focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-primary">
        <BookOpen aria-hidden="true" className="h-6 w-6 text-brand-accent" />
      </span>
      EduElderly
    </Link>
  );
}

function NavItem({ to, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative inline-flex min-h-touch items-center rounded-md px-4 font-semibold transition-colors duration-fast',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-accent-ink',
          isActive ? 'text-brand-primary-dark' : 'text-brand-muted hover:text-brand-text',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              aria-hidden="true"
              layoutId="nav-active-pill"
              transition={prefersReducedMotion() ? { duration: 0 } : { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-0 -z-10 rounded-md bg-brand-primary-soft"
            />
          )}
          {children}
        </>
      )}
    </NavLink>
  );
}

function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

export function AppShell() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useIsAdmin();
  const transition = pageTransition();
  const scrolled = useScrolled();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <RouteChange />

      <header
        className={cn(
          'sticky top-0 z-40 border-b bg-brand-surface/85 backdrop-blur transition-[border-color] duration-calm',
          scrolled ? 'border-brand-border' : 'border-transparent',
        )}
      >
        <div className="mx-auto flex h-[72px] w-full max-w-content items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Brand to={isAuthenticated ? '/dashboard' : '/'} />

          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            <LayoutGroup id="main-nav">
              <NavItem to="/courses">Courses</NavItem>
              {isAuthenticated ? (
                <>
                  <NavItem to="/dashboard">My learning</NavItem>
                  <NavItem to="/certificates">Certificates</NavItem>
                  {isAdmin && <NavItem to="/admin">Admin</NavItem>}
                </>
              ) : (
                <NavItem to="/login">Sign in</NavItem>
              )}
            </LayoutGroup>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <TextSizeControl />
            {isAuthenticated ? (
              <AccountMenu />
            ) : (
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/register">Create account</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 pb-24 md:pb-8">
        <LayoutGroup id="routed-content">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={location.pathname} {...transition}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </LayoutGroup>
      </main>

      <footer className="on-night border-t border-brand-border bg-brand-night pb-24 text-brand-on-night md:pb-0">
        <div className="mx-auto grid w-full max-w-content gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <p className="font-display text-2xl">Need a hand?</p>
            <p className="mt-2 max-w-[36ch] text-brand-on-night-muted">
              Write to us any time and a person will reply — no chatbots.
            </p>
            <a
              href="mailto:support@eduelderly.com"
              className="mt-4 inline-flex min-h-touch items-center font-semibold text-brand-accent underline-offset-4 hover:underline"
            >
              support@eduelderly.com
            </a>
          </div>
          <FooterNav id="footer-learn" title="Learn" links={[['/courses', 'Browse courses'], ['/dashboard', 'My learning'], ['/certificates', 'My certificates']]} />
          <FooterNav id="footer-support" title="Support" links={[['/verify-certificate', 'Verify a certificate'], ['/settings', 'Text size and contrast']]} />
          <FooterNav id="footer-about" title="About" links={[['/', 'Home'], ['/accessibility', 'Our accessibility commitment']]} />
        </div>
        <div className="border-t border-white/10 py-5 text-center text-sm text-brand-on-night-muted">
          © {new Date().getFullYear()} EduElderly · Learning made welcoming.
        </div>
      </footer>

      <MobileTabBar />
    </div>
  );
}

function FooterNav({ id, title, links }) {
  return (
    <nav aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-brand-on-night-muted">
        {title}
      </h2>
      <ul className="space-y-2">
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="inline-flex min-h-[36px] items-center text-brand-on-night underline-offset-4 hover:underline">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
