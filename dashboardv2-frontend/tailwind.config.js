const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', 'Inter', ...fontFamily.sans],
        mono: ['JetBrains Mono', ...fontFamily.mono]
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#6090fa',
          500: '#3b76f6',
          600: '#1f5ce0',
          700: '#1a49b8',
          800: '#1b3f93',
          900: '#1c3775',
          950: '#142249'
        },
        accent: {
          50: '#ecfdf5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857'
        },
        surface: {
          light: '#f7f8fb',
          dark: '#0b1120',
          card: '#ffffff',
          'card-dark': '#111a2e',
          border: '#e4e8f0',
          'border-dark': '#1e293b'
        }
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        lift: '0 8px 24px -12px rgb(16 24 40 / 0.18)'
      },
      borderRadius: {
        xl: '0.875rem'
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 240ms ease-out both'
      }
    }
  },
  plugins: []
};
