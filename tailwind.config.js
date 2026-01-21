/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber-cyan': '#00ffff',
        'cyber-magenta': '#ff0080',
        'cyber-gold': '#ffd700',
      },
    },
  },
  plugins: [],
}