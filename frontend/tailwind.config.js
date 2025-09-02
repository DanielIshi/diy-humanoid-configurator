/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    '../*.jsx',
    // Safelist für dynamische Klassen
    './src/utils/data.js'
  ],
  theme: {
    extend: {
      // Performance-optimierte Animations
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s ease-in-out infinite',
      },
      // Optimierte Farb-Palette (reduziert Bundle-Größe)
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe', 
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        }
      }
    },
  },
  plugins: [],
  // Performance Optimierungen
  corePlugins: {
    // Deaktiviere nicht verwendete Features für kleinere Bundle-Größe
    preflight: true,
    container: false, // Falls nicht verwendet
    accessibility: true,
    pointerEvents: true,
    visibility: true,
  },
  // CSS Purging Konfiguration
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      './index.html',
      './src/**/*.{js,jsx,ts,tsx}',
      '../*.jsx'
    ],
    options: {
      safelist: [
        // Safelist für dynamisch generierte Klassen
        /^bg-(red|green|blue|yellow|purple|pink|gray)-(100|200|300|400|500|600|700|800|900)$/,
        /^text-(red|green|blue|yellow|purple|pink|gray)-(100|200|300|400|500|600|700|800|900)$/,
        /^border-(red|green|blue|yellow|purple|pink|gray)-(100|200|300|400|500|600|700|800|900)$/,
        // Animation Klassen
        'animate-spin',
        'animate-pulse',
        'animate-bounce',
        'animate-ping',
        // Transition Klassen
        'transition-all',
        'transition-colors',
        'transition-opacity',
        'transition-transform',
        'duration-100',
        'duration-200',
        'duration-300',
        'duration-500',
        // Grid und Flex utilities
        /^(grid-cols-|col-span-|row-span-)/,
        /^(flex|inline-flex|grid|inline-grid)/,
      ],
      keyframes: true,
      fontFace: true,
    }
  }
}

