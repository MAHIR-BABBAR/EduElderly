import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const GRADIENTS = ['var(--cover-1)', 'var(--cover-2)', 'var(--cover-3)', 'var(--cover-4)', 'var(--cover-5)'];

/** Stable per-course gradient, so a course keeps the same colour everywhere. */
function gradientFor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

/**
 * 16:9 course artwork. Seeded courses have thumbnails, but admin-created ones
 * often do not, and a row of grey boxes makes the catalog look broken. The
 * fallback is a branded gradient with the course initial, which reads as
 * deliberate. Broken image URLs fall back to the same treatment.
 */
export function CourseCover({ title = '', courseId = '', src, className, children }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div className={cn('relative aspect-video w-full overflow-hidden rounded-lg bg-brand-surface-sunken', className)}>
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ background: gradientFor(courseId || title) }}
        >
          <span className="flex items-center gap-2 font-display text-2xl text-white/95">
            <BookOpen className="h-7 w-7" aria-hidden="true" />
            {title.trim().charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
