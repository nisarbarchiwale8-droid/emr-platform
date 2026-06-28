/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5A5FEF',
          dark: '#4B50D1',
        },
        accent: {
          green: '#7BC67E',
          orange: '#F5A25D',
        },
        bg: {
          main: '#F5F6FA',
          card: '#FFFFFF',
        },
        text: {
          main: '#1F2937',
          muted: '#9CA3AF',
        },
        border: {
          DEFAULT: '#E6E8EC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        h1: ['24px', { fontWeight: '700' }],
        h2: ['18px', { fontWeight: '600' }],
        body: ['14px', { fontWeight: '400' }],
        small: ['12px', { fontWeight: '400' }],
      },
      borderRadius: {
        sm: '10px',
        md: '16px',
        lg: '20px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.06)',
        dropdown: '0 4px 16px rgba(0,0,0,0.10)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(180deg, #6C63FF, #4B50D1)',
      },
    },
  },
  plugins: [],
};
