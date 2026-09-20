import { Check, Circle, PlayCircle } from 'lucide-react';

/**
 * A miniature of the real lesson screen, built from the same tokens as the
 * app rather than a screenshot. It never goes stale when the UI changes, it
 * scales cleanly on any display, and it costs no image bytes.
 *
 * Purely illustrative, so the whole thing is hidden from assistive technology
 * and the surrounding section carries the meaning in prose.
 */
export function LearningPreview() {
  const lessons = [
    { title: 'What email is for', done: true },
    { title: 'Writing your first message', done: true },
    { title: 'Adding a photo', current: true },
    { title: 'Staying safe from scams', done: false },
  ];

  return (
    <div
      aria-hidden="true"
      className="rounded-xl border border-brand-border bg-brand-surface-raised p-3 shadow-lift sm:p-4"
    >
      {/* Browser chrome, so it reads as a screen rather than a diagram. */}
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-brand-border" />
        <span className="h-3 w-3 rounded-full bg-brand-border" />
        <span className="h-3 w-3 rounded-full bg-brand-border" />
        <span className="ml-2 h-5 flex-1 rounded-full bg-brand-surface-sunken" />
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
        <div className="space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-brand-border">
            <div className="h-full w-1/2 rounded-full bg-brand-primary" />
          </div>

          <div className="rounded-lg border border-brand-border p-3">
            <p className="font-display text-base text-brand-primary-dark">Adding a photo</p>
            <p className="mt-0.5 text-xs text-brand-muted">Module 2 · 8 minutes</p>

            <div className="mt-3 flex aspect-video items-center justify-center rounded-md bg-brand-hero">
              <PlayCircle className="h-10 w-10 text-brand-accent" />
            </div>

            <div className="mt-3 flex gap-2">
              <span className="rounded-md bg-brand-primary px-3 py-2 text-xs font-semibold text-white">
                Mark lesson complete
              </span>
              <span className="rounded-md border-2 border-brand-primary px-3 py-2 text-xs font-semibold text-brand-primary">
                Next
              </span>
            </div>
          </div>
        </div>

        <div className="hidden rounded-lg border border-brand-border p-3 sm:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">Lessons</p>
          <ul className="space-y-2">
            {lessons.map((lesson) => (
              <li
                key={lesson.title}
                className={`flex items-start gap-2 rounded-md p-1.5 text-xs ${
                  lesson.current ? 'bg-brand-accent-soft font-semibold text-brand-primary-dark' : 'text-brand-muted'
                }`}
              >
                {lesson.done ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-success" />
                ) : (
                  <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                )}
                <span className="leading-snug">{lesson.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
