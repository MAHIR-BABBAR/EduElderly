import { Outlet } from 'react-router-dom';
import { BookOpen, Eye, HeartHandshake, Type } from 'lucide-react';
import { usePageTitle } from '@/components/layout/RouteChange';

const POINTS = [
  { icon: Type, text: 'Readable text you can make larger' },
  { icon: Eye, text: 'High contrast whenever you want it' },
  { icon: HeartHandshake, text: 'Learn at your own pace, no time limits' },
];

export function AuthLayout() {
  return (
    <div className="bg-brand-surface">
      <div className="mx-auto grid w-full max-w-content gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-16">
        <aside className="hidden flex-col justify-center rounded-xl bg-hero p-10 text-white lg:flex">
          <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-white/10">
            <BookOpen className="h-8 w-8 text-brand-accent" aria-hidden="true" />
          </span>
          <p className="font-display text-2xl">Learning made welcoming</p>
          <p className="mt-4 text-lg text-white/85">
            Courses in health, digital skills, and lifelong learning, designed with older learners in mind.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" aria-hidden="true" />
                <span className="text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex justify-center">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper for every auth screen.
 *
 * It owns the page's `h1` and document title. Previously these pages had no
 * `h1` at all — the visible heading was a card title (`h3`) — so a learner
 * redirected here by the route guard landed on a page with no heading for a
 * screen reader to announce, and the route announcer had no title to read.
 */
export function AuthCard({ title, description, children }) {
  usePageTitle(title);

  return (
    <div className="w-full max-w-lg">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-brand-primary-dark">{title}</h1>
        {description && <p className="mt-2 text-brand-muted">{description}</p>}
      </header>
      {children}
    </div>
  );
}
