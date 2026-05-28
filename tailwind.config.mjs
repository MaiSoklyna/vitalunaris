/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          cherrywood: '#601D1D',
          'spring-wood': '#F9F4EE',
          lavender: '#8E84B6',
          raspberry: '#9F4B67',
          fire: '#EC9F27',
          'pale-gold': '#FFD869',
          'green-yellow': '#B4AD27',
          aurora: '#87C6B3',
        },
        ink: {
          50: '#F9F4EE',
          100: '#F3EBE0',
          200: '#E5D6C3',
          300: '#C9AC8B',
          400: '#9F7855',
          500: '#7A4A2E',
          600: '#601D1D',
          700: '#4A1414',
          800: '#330C0C',
          900: '#1F0606',
        },
      },
      fontFamily: {
        display: ['"ES Park"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        pill: '9999px',
      },
      maxWidth: {
        layout: '1490px',
      },
    },
  },
  plugins: [],
};
