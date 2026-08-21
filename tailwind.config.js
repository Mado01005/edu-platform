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
          50: '#f2fbf5',
          100: '#e1f6ea',
          200: '#c5ecd6',
          500: '#084B2B',
          600: '#063B22',
          700: '#042917',
          accent: '#D4AF37',
          'accent-hover': '#C5A059',
          'accent-light': '#FDF8E8',
        },
        surface: {
          canvas: '#F8FAF7',
          card: '#FFFFFF',
          border: 'rgba(8, 75, 43, 0.12)',
        },
      },
    },
  },
};
