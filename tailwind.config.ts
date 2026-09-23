import type { Config } from 'tailwindcss';

module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          base: '#063A2F',
          surface: '#0A4235',
          input: '#063A2F',
          border: '#B2CDBC',
          gold: '#D8A84E',
          'gold-hover': '#E5C06E',
          sage: '#B2CDBC',
          ivory: '#F4F7F4',
          'ivory-alt': '#E5EEE7',
          white: '#FFFFFF',
          muted: '#E2E8F0',
          rim: 'rgba(216,168,78, 0.2)',
          50: '#FFFFFF',
          100: '#B2CDBC',
          200: '#B2CDBC',
          500: '#063A2F',
          600: '#0A4235',
          700: '#063A2F',
          accent: '#D8A84E',
          'accent-hover': '#E5C06E',
          'accent-light': '#B2CDBC',
        },
        surface: {
          canvas: '#F4F7F4',
          card: '#FFFFFF',
          border: 'rgba(216,168,78, 0.2)',
          ink: '#063A2F',
        },
      },
      fontFamily: {
        sans: ['var(--font-english)', 'var(--font-arabic)', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'var(--font-english)', 'sans-serif'],
      },
    },
  },
} satisfies Config;
