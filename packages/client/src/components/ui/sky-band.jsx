import { cn } from '@/lib/utils';
import { daypart } from '@/lib/format';

/**
 * The dashboard's greeting band (SIG-5): a static gradient chosen by the
 * learner's local hour, with a sun or moon disc. It reflects the time of day
 * and never animates — orientation in time, zero motion. Children sit on a
 * scrim that guarantees contrast whatever the sky. High contrast collapses
 * it to the flat night surface via tokens.
 */
const SKIES = {
  dawn: {
    gradient: 'linear-gradient(160deg, #0f2c37 0%, #4a4a6b 45%, #d9905a 100%)',
    disc: { color: '#ffd27a', glow: 'rgba(255, 210, 122, 0.55)', bottom: '-18%', right: '14%' },
  },
  day: {
    gradient: 'linear-gradient(160deg, #0c343d 0%, #14505c 55%, #2f8a96 100%)',
    disc: { color: '#ffe6a3', glow: 'rgba(255, 230, 163, 0.5)', bottom: '30%', right: '10%' },
  },
  dusk: {
    gradient: 'linear-gradient(160deg, #0a2229 0%, #5a2e3f 55%, #c9683f 100%)',
    disc: { color: '#ffb86b', glow: 'rgba(255, 184, 107, 0.5)', bottom: '-14%', right: '18%' },
  },
  night: {
    gradient: 'linear-gradient(160deg, #06161b 0%, #0a2229 55%, #163f4d 100%)',
    disc: { color: '#e9eef0', glow: 'rgba(233, 238, 240, 0.35)', bottom: '38%', right: '12%', moon: true },
  },
};

export function SkyBand({ hour = new Date().getHours(), className, children }) {
  const part = daypart(hour);
  const sky = SKIES[part];

  return (
    <section
      data-daypart={part}
      className={cn(
        'sky-band on-night relative overflow-hidden rounded-xl bg-brand-night text-brand-on-night shadow-lift',
        className,
      )}
    >
      <div aria-hidden="true" className="sky-gradient absolute inset-0" style={{ background: sky.gradient }} />
      {/* Small and tucked top-right on phones so it never sits under the
          headline; full size at its daypart position from sm up. */}
      <div
        aria-hidden="true"
        className="sky-disc absolute right-4 top-4 h-16 w-16 rounded-full sm:bottom-[var(--disc-bottom)] sm:right-[var(--disc-right)] sm:top-auto sm:h-56 sm:w-56"
        style={{
          '--disc-bottom': sky.disc.bottom,
          '--disc-right': sky.disc.right,
          background: sky.disc.moon
            ? `radial-gradient(circle at 35% 35%, ${sky.disc.color} 0%, #b9c4c8 60%, #8e9ca1 100%)`
            : sky.disc.color,
          boxShadow: `0 0 80px 20px ${sky.disc.glow}`,
          opacity: 0.9,
        }}
      />
      {/* Scrim under the copy so text contrast never depends on the sky. */}
      <div aria-hidden="true" className="sky-scrim absolute inset-0 bg-gradient-to-r from-brand-night/75 via-brand-night/45 to-transparent" />
      <div className="relative z-10 p-6 sm:p-10">{children}</div>
    </section>
  );
}
