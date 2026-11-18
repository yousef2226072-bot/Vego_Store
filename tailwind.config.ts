import type { Config } from 'tailwindcss';

// Design tokens live as CSS variables (src/index.css); Tailwind maps them to utilities.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: token('ink'), surface: token('surface'), line: token('line'),
        text: token('text'), muted: token('muted'),
        gold: { DEFAULT: token('gold'), soft: token('gold-soft') },
        led: token('led'),
        success: token('success'), warning: token('warning'), danger: token('danger'),
      },
      fontFamily: {
        sans: ['Tajawal', 'Cairo', 'Tahoma', 'sans-serif'],
        display: ['"El Messiri"', 'Tajawal', 'serif'],
        logo: ['"Bebas Neue"', 'Impact', 'sans-serif'],
      },
      borderRadius: { card: '0.875rem' },
      boxShadow: { glow: '0 0 40px rgb(var(--led) / 0.35)', card: '0 8px 24px rgb(0 0 0 / 0.35)' },
      keyframes: { sweep: { to: { transform: 'rotate(360deg)' } } },
      animation: { sweep: 'sweep 14s linear infinite' },
    },
  },
  plugins: [],
} satisfies Config;
