/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- Couleurs institutionnelles officielles demandées ---
        'enp-blue-deep': '#0d3b66',      // Bleu profond #0d3b66 pour la navigation latérale
        'enp-blue-primary': '#1a5fb4',   // Bleu #1a5fb4 pour les actions principales
        'enp-blue-dark': '#092847',      // Bleu foncé pour hover/active
        'enp-blue-light': '#e6f0fa',     // Bleu clair pour sélections et états actifs légers
        'enp-blue-ice': '#f0f5ff',       // Fond clair #f0f5ff
        'enp-teal': '#2a9d4a',           // Vert institutionnel
        'enp-teal-dark': '#1e7838',      // Vert foncé
        'enp-teal-light': '#eaf6ed',     // Vert clair
        'enp-green-inst': '#2a9d4a',     // Vert institutionnel
        'enp-green-valid': '#2a9d4a',    // Vert #2a9d4a pour les validations
        'enp-green-light': '#eaf6ed',    // Vert clair pour badges validés
        'enp-red-inst': '#b51f1f',       // Rouge institutionnel
        'enp-red-error': '#d62828',      // Rouge #d62828 uniquement pour les erreurs et actions dangereuses
        'enp-red-light': '#fdf0f0',      // Rouge très clair pour les fonds d'erreur
        'enp-gold': '#b08d35',           // Doré discret institutionnel
        'enp-gold-light': '#fbf6ea',     // Doré clair
        'enp-white': '#ffffff',          // Blanc pur
        'enp-bg': '#f0f5ff',             // Fond clair #f0f5ff
        'enp-border': '#d8dee5',         // Séparateurs gris
        'enp-border-light': '#e8ecef',   // Séparateurs gris clair
        'enp-gray-medium': '#6b7280',    // Gris moyen
        'enp-gray-dark': '#263238',      // Gris foncé
        'enp-black': '#17212b',          // Noir institutionnel

        // Alias de compatibilité
        'enp-primary': '#1a5fb4',
        'enp-primary-dark': '#0d3b66',
        'enp-primary-light': '#e6f0fa',
        'enp-ink': '#17212b',
        'enp-ink-soft': '#475569',
        'enp-sky': '#e6f0fa',
        'enp-bordeaux': '#d62828',
        'enp-bordeaux-light': '#fdf0f0',
      },
      borderRadius: {
        'none': '0px',
        'sm': '0px',
        'DEFAULT': '0px',
        'md': '0px',
        'lg': '0px',
        'xl': '0px',
        '2xl': '0px',
        '3xl': '0px',
        'full': '0px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(23, 33, 43, 0.04)',
        'card': '0 1px 3px 0 rgba(23, 33, 43, 0.06), 0 1px 2px 0 rgba(23, 33, 43, 0.03)',
        'elevated': '0 4px 12px 0 rgba(23, 33, 43, 0.08)',
        'modal': '0 8px 24px -4px rgba(23, 33, 43, 0.16)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
        'fast': '150ms',
        'medium': '200ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'slide-up': 'slideUp 0.20s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
