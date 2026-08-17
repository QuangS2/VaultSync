/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./client/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="night"]'],
  theme: {
    extend: {
      colors: {
        theme: {
          bg: 'var(--theme-bg)',
          'bg-subtle': 'var(--theme-bg-subtle)',
          card: 'var(--theme-card)',
          'card-hover': 'var(--theme-card-hover)',
          border: 'var(--theme-border)',
          'border-subtle': 'var(--theme-border-subtle)',
          text: 'var(--theme-text)',
          'text-secondary': 'var(--theme-text-secondary)',
          'text-muted': 'var(--theme-text-muted)',
          accent: 'var(--theme-accent)',
          'accent-subtle': 'var(--theme-accent-subtle)',
          'accent-hover': 'var(--theme-accent-hover)',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
