import { Outlet } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-[calc(100vh-12rem)] bg-brand-surface">
      <div className="page-container grid min-h-[calc(100vh-12rem)] gap-8 py-8 lg:grid-cols-2 lg:items-center lg:py-12">
        <aside className="hidden flex-col justify-center rounded-[var(--radius-lg)] bg-brand-primary p-10 text-white lg:flex">
          <BookOpen className="mb-6 h-14 w-14 text-brand-accent" aria-hidden="true" />
          <h2 className="font-display text-[length:var(--font-size-2xl)]">Learning made welcoming</h2>
          <p className="mt-4 text-[length:var(--font-size-lg)] text-white/90">
            Large text, clear steps, and settings you control — designed with older learners in mind.
          </p>
          <ul className="mt-8 space-y-3 text-[length:var(--font-size-base)]">
            <li>Readable fonts and high contrast options</li>
            <li>Learn at your own pace</li>
            <li>Health, digital skills, and more</li>
          </ul>
        </aside>
        <div className="flex justify-center">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function AuthCard({ children }) {
  return <div className="w-full max-w-lg">{children}</div>;
}
