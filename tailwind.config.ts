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
          base: '#052F26',
          surface: '#093F33',
          input: '#052F26',
          border: '#145B4A',
          'mint-border': '#C2DCCE',
          gold: '#D8A649',
          'gold-hover': '#E8BE5F',
          sage: '#A7C2B1',
          'sage-deep': '#88A996',
          leaf: '#13644E',
          ivory: '#EEF5F1',
          'ivory-alt': '#E2EFE7',
          'hero-end': '#F5F8F6',
          white: '#FFFFFF',
          muted: '#E2ECE5',
          rim: 'rgba(216, 166, 73, 0.25)',
          50: '#FFFFFF',
          100: '#A7C2B1',
          200: '#C2DCCE',
          500: '#052F26',
          600: '#093F33',
          700: '#052F26',
          accent: '#D8A649',
          'accent-hover': '#E8BE5F',
          'accent-light': '#A7C2B1',
        },
        surface: {
          canvas: '#EEF5F1',
          card: '#FFFFFF',
          border: '#C2DCCE',
          ink: '#052F26',
        },
      },
      fontFamily: {
        sans: ['var(--font-english)', 'var(--font-arabic)', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'var(--font-english)', 'sans-serif'],
      },
    },
  },
} satisfies Config;
