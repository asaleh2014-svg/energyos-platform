/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0d14',
          secondary: '#111520',
          tertiary: '#181e2e',
          card: '#1a2035',
          hover: '#222a42',
        },
        border: {
          subtle: '#ffffff12',
          default: '#ffffff20',
          strong: '#ffffff30',
        },
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#60a5fa',
          dark: '#1d4ed8',
          muted: '#3b82f620',
        },
        success: { DEFAULT: '#10b981', light: '#34d399', muted: '#10b98120' },
        warning: { DEFAULT: '#f59e0b', light: '#fbbf24', muted: '#f59e0b20' },
        danger: { DEFAULT: '#ef4444', light: '#f87171', muted: '#ef444420' },
        purple: { DEFAULT: '#8b5cf6', light: '#a78bfa', muted: '#8b5cf620' },
        teal: { DEFAULT: '#14b8a6', light: '#2dd4bf' },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
