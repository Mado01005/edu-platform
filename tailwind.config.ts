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
          base: '#021E1A',
          surface: '#0B3F29',
          input: '#021E1A',
          border: '#04473D',
          'mint-border': '#C6E3BD',
          gold: '#D5A848',
          'gold-hover': '#DEB65E',
          sage: '#A2CD9F',
          'sage-deep': '#8BB786',
          leaf: '#347130',
          ivory: '#F4F9EE',
          'ivory-alt': '#E4F1DF',
          'hero-end': '#F4F9EE',
          white: '#FFFFFF',
          muted: '#E4F1DF',
          rim: 'rgba(213, 168, 72, 0.25)',
          teal: '#04473D',
          'gold-deep': '#BA8B2F',
          'gold-bronze': '#8A5A12',
          'gold-light': '#F5DDA2',
          cream: '#F4EBC8',
          mint: '#A2CD9F',
          'mint-light': '#B2DAB1',
          50: '#FFFFFF',
          100: '#A2CD9F',
          200: '#C6E3BD',
          500: '#021E1A',
          600: '#0B3F29',
          700: '#021E1A',
          accent: '#D5A848',
          'accent-hover': '#DEB65E',
          'accent-light': '#A2CD9F',
        },
        surface: {
          canvas: '#F4F9EE',
          card: '#FFFFFF',
          border: '#C6E3BD',
          ink: '#021E1A',
        },
      },
      fontFamily: {
        sans: ['var(--font-english)', 'var(--font-arabic)', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'var(--font-english)', 'sans-serif'],
      },
    },
  },
} satisfies Config;
