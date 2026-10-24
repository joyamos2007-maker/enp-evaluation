/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Teal institutionnel — éléments structurants et actions
        'enp-primary': '#0F766E',
        'enp-primary-dark': '#115E59',
        'enp-primary-light': '#E6F4F2',
        'enp-teal-dark': '#0F4C4A',
        // Bleu foncé institutionnel — texte principal, titres
        'enp-ink': '#0F172A',
        'enp-ink-soft': '#475569',
        // Teal clair — fonds d'accent
        'enp-sky': '#E6F4F2',
        // Teal — états positifs, validations, succès
        'enp-teal': '#14B8A6',
        'enp-teal-light': '#CCFBF1',
        // Violet — éléments secondaires, filtres, badges, admin
        'enp-violet': '#7C3AED',
        'enp-violet-light': '#F3E8FF',
        // Bordeaux — alertes, erreurs, critiques
        'enp-bordeaux': '#7F1D1D',
        'enp-bordeaux-light': '#FDECEC',
        // Neutres
        'enp-white': '#FFFFFF',
        'enp-border': '#E2E8F0',
        'enp-border-soft': '#F1F5F9',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 12px 0 rgba(15, 23, 42, 0.10), 0 2px 4px 0 rgba(15, 23, 42, 0.06)',
        'elevated': '0 10px 30px -5px rgba(15, 23, 42, 0.12), 0 4px 10px -3px rgba(15, 23, 42, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
