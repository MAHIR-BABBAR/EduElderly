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
          accent: 'var(--color-accent)',
          'accent-soft': 'var(--color-accent-soft)',
          surface: 'var(--color-surface)',
          text: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          border: 'var(--color-border)',
          danger: 'var(--color-danger)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
        },
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};
