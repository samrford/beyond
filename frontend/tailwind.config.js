/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
      extend: {
        colors: {
          primary: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#f97316',
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
          },
        },
        animation: {
          'spin-slow': 'spin 8s linear infinite',
          'reverse-spin-slow': 'reverse-spin 12s linear infinite',
          'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        keyframes: {
          'reverse-spin': {
            from: { transform: 'rotate(360deg)' },
            to: { transform: 'rotate(0deg)' },
          }
        },
        transitionTimingFunction: {
          'premium-reveal': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        }
      },
  },
  plugins: [],
}
