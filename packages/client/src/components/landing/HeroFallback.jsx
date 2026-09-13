export function HeroFallback() {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-gradient-to-br from-brand-primary via-brand-primary-dark to-[#0d2a32]"
      aria-hidden="true"
    >
      <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-brand-accent/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-brand-accent/15 blur-3xl" />
      <svg
        className="absolute inset-0 h-full w-full opacity-30"
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="orb" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8A838" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1B5E6B" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <circle cx="620" cy="180" r="120" fill="url(#orb)" />
        <circle cx="200" cy="420" r="80" fill="#E8A838" fillOpacity="0.25" />
        <path
          d="M0 480 Q200 380 400 450 T800 420 L800 600 L0 600 Z"
          fill="#134652"
          fillOpacity="0.5"
        />
      </svg>
    </div>
  );
}
