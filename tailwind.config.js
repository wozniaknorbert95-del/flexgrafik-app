/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx",
    "./public/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        // CYBERPUNK COLOR SYSTEM (from .cursorrules)
        'neon-magenta': '#ff00ff',    // Primary - main actions
        'neon-cyan': '#00f3ff',       // Secondary - highlights, borders
        'gold': '#ffd700',            // Accent - premium elements
        'dark-bg': '#050505',         // Background - deep black
        'dark-card': '#121212',       // Card backgrounds
        // Legacy support
        'cyber-cyan': '#00f3ff',
        'cyber-magenta': '#ff00ff',
        'cyber-gold': '#ffd700',
        'cyber-red': '#ef4444',
        'cyber-black': '#050505',
        'cyber-dark': '#050505',
        'cyber-panel': '#121212',
      },
    },
  },
  plugins: [],
  safelist: [
    // Cyberpunk utility classes
    'text-neon-magenta',
    'text-neon-cyan',
    'text-gold',
    'bg-dark-bg',
    'bg-dark-card',
    'border-neon-cyan',
    'border-neon-magenta',
    // Glow effects
    'shadow-[0_0_20px_rgba(255,0,255,0.5)]',
    'shadow-[0_0_20px_rgba(0,243,255,0.5)]',
  ]
}