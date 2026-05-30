/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'Lora', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          gold: {
            50: '#fdfbeb',
            100: '#fef7cd',
            500: '#f59e0b',
            600: '#d97706',
            700: '#b45309',
            950: '#451a03',
          },
          emerald: {
            50: '#f0fdf4',
            100: '#dcfce7',
            600: '#059669',
            700: '#047857',
            950: '#022c22',
          },
          stone: {
            50: '#fbfbfa',
            100: '#f5f5f4',
            200: '#e7e5e4',
            400: '#a8a29e',
            500: '#78716c',
            600: '#57534e',
            800: '#292524',
            900: '#1c1917',
          },
          sanctuary: '#faf9f5',
          midnight: '#0b0f19',
          cardDark: '#141b2d',
        },
        primary: {
          50: '#fdfbeb',
          100: '#fef7cd',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      boxShadow: {
        'soft-glow': '0 10px 40px rgba(217, 119, 6, 0.04)',
        'premium': '0 12px 32px -4px rgba(120, 80, 40, 0.05), 0 4px 12px -2px rgba(120, 80, 40, 0.02)',
      },
    },
  },
  plugins: [],
}
