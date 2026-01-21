/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-black': '#000000',
        'cyber-magenta': '#FF00FF',
        'cyber-cyan': '#00FFFF',
        'cyber-gold': '#FFD700',
      }
    },
  },
  plugins: [],
}