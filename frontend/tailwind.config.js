/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#FBF9F5',
          dark: '#121316',
        },
        surface: {
          DEFAULT: '#F4F0E8',
          raised: '#FFFFFF',
          dark: '#1A1C20',
          'dark-raised': '#22252A',
        },
        ink: {
          DEFAULT: '#1E293B',
          secondary: '#64748B',
          muted: '#94A3B8',
          dark: '#F1F5F9',
          'dark-secondary': '#94A3B8',
          'dark-muted': '#64748B',
        },
        rule: {
          DEFAULT: '#E2DCD2',
          strong: '#CBC3B5',
          dark: '#2A2E35',
          'dark-strong': '#3E444F',
        },
        accent: {
          DEFAULT: '#C2410C', // Terracotta
          hover: '#9A3412',
          subtle: '#FFF7ED',
          dark: '#EA580C',
          'dark-hover': '#FB923C',
          'dark-subtle': '#431407',
        },
        shelf: {
          wood: '#5C3A21',
          gold: '#D97706',
          green: '#15803D',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      aspectRatio: {
        'book': '2 / 3',
      },
    },
  },
  plugins: [],
}
