/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          primary: 'var(--color-primary)',
          'primary-dark': 'var(--color-primary-dark)',
          'primary-soft': 'var(--color-primary-soft)',
          accent: 'var(--color-accent)',
          'accent-soft': 'var(--color-accent-soft)',
          'accent-dark': 'var(--color-accent-dark)',
          surface: 'var(--color-surface)',
          'surface-raised': 'var(--color-surface-raised)',
          'surface-sunken': 'var(--color-surface-sunken)',
          text: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          border: 'var(--color-border)',
          'border-strong': 'var(--color-border-strong)',
          danger: 'var(--color-danger)',
          'danger-soft': 'var(--color-danger-soft)',
          success: 'var(--color-success)',
          'success-soft': 'var(--color-success-soft)',
          warning: 'var(--color-warning)',
          'warning-soft': 'var(--color-warning-soft)',
          hero: 'var(--color-hero-bg)',
        },
      },
      // Named sizes so components stop hand-writing text-[length:var(--…)].
      fontSize: {
        xs: 'var(--font-size-xs)',
        sm: 'var(--font-size-sm)',
        base: 'var(--font-size-base)',
        lg: 'var(--font-size-lg)',
        xl: 'var(--font-size-xl)',
        '2xl': 'var(--font-size-2xl)',
        '3xl': 'var(--font-size-3xl)',
        display: ['var(--font-size-display)', { lineHeight: 'var(--line-height-tight)', letterSpacing: 'var(--tracking-tight)' }],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
      },
      backgroundImage: {
        hero: 'var(--gradient-hero)',
        cta: 'var(--gradient-cta)',
      },
      minHeight: { touch: 'var(--touch-min)' },
      minWidth: { touch: 'var(--touch-min)' },
      maxWidth: { content: 'var(--content-max)' },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        calm: 'var(--motion-calm)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down var(--motion-calm) var(--motion-ease)',
        'accordion-up': 'accordion-up var(--motion-calm) var(--motion-ease)',
        'fade-in': 'fade-in var(--motion-calm) var(--motion-ease)',
        'slide-up': 'slide-up var(--motion-calm) var(--motion-ease)',
        'toast-in': 'toast-in var(--motion-calm) var(--motion-ease)',
        'toast-out': 'toast-out var(--motion-fast) var(--motion-ease)',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
