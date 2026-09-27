import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Two things a single-page app has to do by hand on every navigation, and
 * which matter more when the audience includes screen reader and keyboard
 * users:
 *
 *   1. Scroll back to the top. Otherwise a learner clicking "next lesson"
 *      lands halfway down the new page.
 *   2. Announce the new page. Browsers announce a full page load; a router
 *      swap is silent unless we say something.
 *
 * The announcement is read from the document title, which each page sets, and
 * goes into a polite live region so it never interrupts.
 */
export function RouteChange() {
  const { pathname } = useLocation();
  const announcerRef = useRef(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

    // Let the new page set document.title first.
    const timer = setTimeout(() => {
      if (announcerRef.current) {
        announcerRef.current.textContent = `${document.title.replace(/ — EduElderly.*$/, '')} page loaded`;
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [pathname]);

  return <div ref={announcerRef} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />;
}

/** Sets the document title for a page, restoring the previous one on unmount. */
export function usePageTitle(title) {
  useEffect(() => {
    if (!title) return undefined;
    const previous = document.title;
    document.title = `${title} — EduElderly`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
