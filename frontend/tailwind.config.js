/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14304A', // deep clinical navy — headers, nav, display board frame
          light: '#1E4468',
        },
        clinical: {
          DEFAULT: '#1868DB', // primary action blue
          dark: '#124FAD',
        },
        signal: '#0EA5A4',    // teal — "current" / active status
        token: '#F2A93B',     // amber — waiting / token accent
        paper: '#F6F7FB',     // background
        slate: {
          DEFAULT: '#31394A',
          soft: '#6B7280',
        },
        danger: '#DC4545',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,48,74,0.06), 0 4px 16px rgba(20,48,74,0.06)',
      },
    },
  },
  plugins: [],
};
