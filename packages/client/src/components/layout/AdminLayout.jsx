import { NavLink, Outlet } from 'react-router-dom';
import { BookOpen, ClipboardList, FolderTree, LayoutDashboard, ShoppingCart, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/quizzes', label: 'Quizzes', icon: ClipboardList },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
];

export function AdminLayout() {
  return (
    <div className="page-container pb-24 md:pb-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <nav
          aria-label="Admin navigation"
          className="shrink-0 rounded-xl border border-brand-border bg-white p-4 lg:w-56"
        >
          <p className="mb-4 font-display text-[length:var(--font-size-lg)] font-bold text-brand-primary-dark">
            Admin
          </p>
          <ul className="space-y-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-touch items-center gap-2 rounded-lg px-3 py-2 font-semibold transition-colors',
                      isActive
                        ? 'bg-brand-primary text-white'
                        : 'text-brand-text hover:bg-brand-primary/10',
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
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
