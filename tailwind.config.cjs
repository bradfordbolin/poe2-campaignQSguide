/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'var(--border)',
        input: 'var(--input-border)',
        ring: 'var(--focus)',
        background: 'var(--bg)',
        foreground: 'var(--text)',
        primary: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--button-text)',
        },
        secondary: {
          DEFAULT: 'var(--button-secondary-bg)',
          foreground: 'var(--text)',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: 'var(--panel)',
          foreground: 'var(--muted)',
        },
        accent: {
          DEFAULT: 'var(--row-hover)',
          foreground: 'var(--text)',
        },
        popover: {
          DEFAULT: 'var(--panel)',
          foreground: 'var(--text)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--text)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
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
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
