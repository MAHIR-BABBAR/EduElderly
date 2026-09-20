import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { sharedLayout } from '@/lib/motion';

/**
 * Course artwork in the course's subject world (SIG-2, SIG-4).
 *
 * The world gradient is always painted first, so there is never a blank flash
 * while a photo loads. The photo is then multiplied with the world colour so
 * six unrelated stock photographs read as one art-directed set. No photo (or
 * a broken URL) gets the gradient, a large Fraunces initial and a quiet
 * concentric-arc pattern — deliberate, not "image missing".
 *
 * Anything overlaid via `children` sits on a bottom scrim so text stays
 * legible on any photo. High contrast drops photo, gradient and pattern for
 * a white box with a black border (tokens do this; nothing to branch on here).
 *
 * Pass `layoutId` to let the cover morph into the same id elsewhere (catalog
 * card → course detail hero). Under reduced motion there is no morph.
 */
export function CourseCover({
  title = '',
  courseId = '',
  src,
  world = 'default',
  ratio = '16 / 10',
  layoutId,
  priority = false,
  className,
  children,
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const initial = title.trim().charAt(0).toUpperCase();
  const Root = layoutId ? motion.div : 'div';
  const rootProps = layoutId ? sharedLayout(layoutId) : {};

  return (
    <Root
      {...rootProps}
      data-world={world}
      data-course-cover={courseId || undefined}
      style={{ aspectRatio: ratio, containerType: 'size' }}
      className={cn(
        'course-cover relative w-full overflow-hidden rounded-xl border border-brand-border bg-world-gradient',
        className,
      )}
    >
      {showImage ? (
        <>
          <img
            src={src}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setFailed(true)}
            className="cover-photo absolute inset-0 h-full w-full object-cover"
          />
          {/* Duotone: the world colour multiplied over the photo. */}
          <div aria-hidden="true" className="cover-duotone absolute inset-0 bg-world mix-blend-multiply opacity-70" />
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0">
          <svg
            className="cover-pattern absolute inset-0 h-full w-full opacity-[0.12]"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid slice"
          >
            {[18, 30, 42, 54, 66].map((r) => (
              <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="white" strokeWidth="0.6" />
            ))}
          </svg>
          <span
            className="cover-initial absolute -bottom-[10%] -right-[2%] select-none font-display leading-none text-white opacity-25"
            style={{ fontSize: 'min(45cqh, 12rem)' }}
          >
            {initial}
          </span>
        </div>
      )}

      {children && (
        <div className="cover-scrim absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-brand-night/75 via-brand-night/25 to-transparent p-4 text-brand-on-night">
          {children}
        </div>
      )}
    </Root>
  );
}
