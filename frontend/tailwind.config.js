/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mumbai: {
          navy: '#0A192F',
          gold: '#FFB800',
          darkBlue: '#1E293B',
          accent: '#2563EB',
          emerald: '#10B981',
          danger: '#EF4444',
          warning: '#F59E0B',
        }
      }
    },
  },
  plugins: [],
}
