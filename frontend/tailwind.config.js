/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          light: {
            bg: '#F8FAFC',
            surface: '#FFFFFF',
            text: '#172033',
            muted: '#64748B',
            accent: '#4F46E5',
            secondaryAccent: '#0F766E',
            border: '#E2E8F0',
            warning: '#D97706',
            error: '#DC2626',
            success: '#16A34A',
          },
          dark: {
            bg: '#0B1120',
            surface: '#111827',
            secondarySurface: '#1E293B',
            text: '#F1F5F9',
            muted: '#94A3B8',
            accent: '#818CF8',
            secondaryAccent: '#2DD4BF',
            border: '#334155',
            warning: '#FBBF24',
            error: '#F87171',
            success: '#4ADE80',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}

