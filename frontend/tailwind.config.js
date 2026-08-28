/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          950: '#07090e',
          900: '#0b0f19',
          850: '#111726',
          800: '#172033',
          700: '#23304b',
          600: '#334466',
          100: '#f8fafc',
          200: '#f1f5f9',
          300: '#e2e8f0',
        },
        brand: {
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          cyan: '#06b6d4',
          rose: '#f43f5e',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
