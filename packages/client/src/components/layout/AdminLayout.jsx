import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, ClipboardList, FolderTree, LayoutDashboard, Shield, ShoppingCart, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/quizzes', label: 'Quizzes', icon: ClipboardList },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
];

/**
 * Admin console (plan S-9): a slim night sidebar on desktop, a scrolling row
 * of chips on phones, and a content column whose tables share one recipe
 * (`.admin-console table` in index.css) so every admin page reads the same.
 */
export function AdminLayout() {
  return (
    <div className="page-container pb-24 md:pb-12">
      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        <nav
          aria-label="Admin navigation"
          className="on-night rounded-xl bg-brand-night p-3 text-brand-on-night shadow-lift lg:sticky lg:top-24 lg:self-start lg:p-4"
        >
          <p className="mb-3 flex items-center gap-2 px-2 text-sm font-semibold uppercase tracking-[0.08em] text-brand-on-night-muted">
            <Shield className="h-4 w-4 text-brand-accent" aria-hidden="true" />
            Admin console
          </p>
          <ul className="scroll-x flex gap-1 lg:flex-col">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-touch items-center gap-2 rounded-md px-3 py-2 font-semibold transition-colors duration-fast',
                      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#ffd27a]',
                      isActive ? 'bg-white/12 text-brand-on-night' : 'text-brand-on-night-muted hover:bg-white/8 hover:text-brand-on-night',
                    )
                  }
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="admin-console min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
