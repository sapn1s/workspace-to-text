module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        gray: {
          900: '#121212',
          800: '#1e1e1e',
          700: '#2d2d2d',
          600: '#3d3d3d',
          500: '#4d4d4d',
          400: '#5d5d5d',
          300: '#6d6d6d',
          200: '#7d7d7d',
          100: '#8d8d8d',
        },
        blue: {
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        red: {
          400: '#f87171',
          500: '#ef4444',
        },
        yellow: {
          400: '#facc15',
        }
      },
    },
  },
  variants: {
    extend: {
      textColor: ['group-hover'],
      backgroundColor: ['hover', 'group-hover'],
    },
  },
  plugins: [],
}