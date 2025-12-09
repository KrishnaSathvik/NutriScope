/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Static utility colors (optional)
        obsidian: '#09090b',
        charcoal: '#18181b',
        concrete: '#f4f4f5',
        danger: '#ff453a',
        accent: '#ff3300',
        warning: '#ffaa00',

        // Theme-aware colors (driven by CSS variables)
        void: 'var(--color-void)',
        surface: 'var(--color-surface)',
        panel: 'var(--color-panel)',
        border: 'var(--color-border)',
        dim: 'var(--color-dim)',
        muted: 'var(--color-muted)',
        text: 'var(--color-text)',

        acid: 'var(--color-acid)',
        acidSoft: 'var(--color-acid-soft)',
        acidSofter: 'var(--color-acid-softer)',

        success: 'var(--color-success)',
        error: 'var(--color-error)',

        icon: 'var(--color-icon)',
        link: 'var(--color-link)',
        linkHover: 'var(--color-link-hover)',
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        'spin-slow': 'spin 1s linear infinite',
        morph: 'morph 8s ease-in-out infinite',
        draw: 'draw 0.4s ease-out forwards',
        radar: 'radar 2s infinite',
        'ring-dash': 'ring-dash 1.5s ease-in-out infinite',
        typing: 'typing 1s steps(40, end) infinite',
        blink: 'blink 1s step-end infinite',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        morph: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
        },
        draw: { to: { strokeDashoffset: '0' } },
        radar: {
          '0%': { transform: 'scale(0.5)', opacity: '1', borderWidth: '2px' },
          '100%': { transform: 'scale(2.5)', opacity: '0', borderWidth: '0px' },
        },
        'ring-dash': {
          '0%': { strokeDasharray: '1, 200', strokeDashoffset: '0' },
          '50%': { strokeDasharray: '90, 200', strokeDashoffset: '-35px' },
          '100%': { strokeDasharray: '90, 200', strokeDashoffset: '-124px' },
        },
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        blink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backgroundImage: {
        grid: 'linear-gradient(to right, rgba(128, 128, 128, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '40px 40px',
      },
    },
  },
  plugins: [],
}
