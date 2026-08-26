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
          50: '#F8FAF8',
          100: '#EAF6EF',
          200: '#CDE8D8',
          500: '#084B2B',
          600: '#0F6E41',
          700: '#042D1A',
          accent: '#D4AF37',
          'accent-hover': '#B89122',
          'accent-light': '#FBF6E2',
        },
        surface: {
          canvas: '#F8FAF8',
          card: '#FFFFFF',
          border: 'rgba(8, 75, 43, 0.12)',
        },
      },
    },
  },
};
