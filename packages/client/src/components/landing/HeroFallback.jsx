/**
 * Static hero backdrop, used whenever the 3D canvas should not run: no WebGL,
 * a WebGL crash, or a viewer who asked for reduced motion.
 *
 * It is the same composition as the scene — a certificate flanked by lesson
 * cards over the deep teal gradient — so the page looks intentional rather
 * than degraded. Entirely decorative, hidden from assistive technology.
 */
export function HeroFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-hero" aria-hidden="true">
      <div className="absolute -left-24 top-4 h-72 w-72 rounded-full bg-brand-accent/20 blur-3xl" />
      <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-[#2d8a9a]/25 blur-3xl" />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="hero-card" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2d8a9a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1b5e6b" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="hero-cert" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff4e0" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#ffe7bd" stopOpacity="0.88" />
          </linearGradient>
        </defs>

        <g opacity="0.85">
          <rect x="96" y="150" width="150" height="100" rx="12" fill="url(#hero-card)" transform="rotate(-9 171 200)" />
          <rect x="120" y="360" width="126" height="84" rx="10" fill="url(#hero-card)" transform="rotate(7 183 402)" />
          <rect x="556" y="126" width="144" height="96" rx="12" fill="url(#hero-card)" transform="rotate(10 628 174)" />
          <rect x="574" y="372" width="132" height="88" rx="10" fill="url(#hero-card)" transform="rotate(-7 640 416)" />
        </g>

        <g transform="rotate(-3 400 300)">
          <rect x="290" y="212" width="220" height="156" rx="10" fill="url(#hero-cert)" />
          <rect x="318" y="248" width="132" height="9" rx="4" fill="#134652" opacity="0.42" />
          <rect x="318" y="278" width="164" height="9" rx="4" fill="#134652" opacity="0.32" />
          <rect x="318" y="308" width="164" height="9" rx="4" fill="#134652" opacity="0.32" />
          <circle cx="462" cy="338" r="17" fill="#e8a838" />
          <circle cx="462" cy="338" r="10" fill="#b57d1c" opacity="0.55" />
        </g>
      </svg>
    </div>
  );
}
