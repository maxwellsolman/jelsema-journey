/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orientation: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', badge: '#94a3b8' },
        refocus:     { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd', badge: '#3b82f6' },
        rising:      { bg: '#fef3c7', text: '#d97706', border: '#fcd34d', badge: '#f59e0b' },
        rolemodel:   { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7', badge: '#10b981' },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-in': 'bounceIn 0.5s ease-out',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '70%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        }
      }
    },
  },
  plugins: [],
}

