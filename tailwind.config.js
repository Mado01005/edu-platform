/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          base: '#0A3425',
          surface: '#0E4632',
          input: '#08281D',
          border: '#17583F',
          gold: '#D4A345',
          'gold-hover': '#E5B85C',
          white: '#FFFFFF',
          muted: '#E2E8F0',
          rim: 'rgba(212, 163, 69, 0.2)',
          50: '#FFFFFF',
          100: '#E2E8F0',
          200: '#17583F',
          500: '#0A3425',
          600: '#0E4632',
          700: '#0A3425',
          accent: '#D4A345',
          'accent-hover': '#E5B85C',
          'accent-light': '#E2E8F0',
        },
        surface: {
          canvas: '#FFFFFF',
          card: '#FFFFFF',
          border: 'rgba(212, 163, 69, 0.2)',
          ink: '#0A3425',
        },
      },
      fontFamily: {
        sans: ['var(--font-english)', 'var(--font-arabic)', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'var(--font-english)', 'sans-serif'],
      },
    },
  },
};
