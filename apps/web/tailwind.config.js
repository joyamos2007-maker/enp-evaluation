/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
<<<<<<< Updated upstream
        // Teal institutionnel — éléments structurants et actions
        'enp-primary': '#0F766E',
        'enp-primary-dark': '#115E59',
        'enp-primary-light': '#E6F4F2',
        'enp-teal-dark': '#0F4C4A',
        // Bleu foncé institutionnel — texte principal, titres
        'enp-ink': '#0F172A',
=======
        // --- Couleurs institutionnelles ENP officielles (calibrées sur le logo) ---
        'enp-blue-deep': '#002140',      // Bleu nuit profond officiel du logo ENP (#002140)
        'enp-blue-primary': '#0A4275',   // Bleu polytechnique officiel (actions, liens, boutons)
        'enp-blue-dark': '#001A33',      // Bleu nuit très sombre pour états actifs/hover
        'enp-blue-light': '#EAF2F8',     // Bleu clair institutionnel (surfaces actives, sélections)
        'enp-blue-ice': '#F5F9FC',       // Bleu très clair (fond panneaux, sidebars)
        'enp-teal': '#008080',           // Vert sarcelle officiel de l'engrenage du logo ENP (#008080)
        'enp-teal-dark': '#005C5C',      // Sarcelle sombre
        'enp-teal-light': '#E6F5F5',     // Sarcelle clair (surfaces innovantes, badges techniques)
        'enp-green-inst': '#0F766E',     // Vert institutionnel
        'enp-green-valid': '#16845B',    // Vert de validation (présence, publication, succès)
        'enp-green-light': '#E8F5EF',    // Vert clair (badges validés)
        'enp-red-inst': '#A3262A',       // Rouge institutionnel
        'enp-red-error': '#C62828',      // Rouge d'erreur (danger, suppression, alerte)
        'enp-red-light': '#FCEBEC',      // Rouge clair (fonds d'alerte)
        'enp-violet': '#6D28D9',         // Violet d'accent (distinction, alertes)
        'enp-violet-soft': '#F3E8FF',    // Violet doux (fonds d'accent)
        'enp-white': '#FFFFFF',          // Blanc pur
        'enp-bg': '#F4F6F8',             // Gris d'arrière-plan de travail
        'enp-border': '#D8DEE5',         // Gris de bordure net
        'enp-border-light': '#E8ECEF',   // Gris de bordure discrète
        'enp-gray-medium': '#6B7280',    // Gris moyen (métadonnées, placeholders)
        'enp-gray-dark': '#263238',      // Gris foncé (titres secondaires)
        'enp-black': '#17212B',          // Noir institutionnel (texte principal)

        // Alias de compatibilité
        'enp-primary': '#0A4275',
        'enp-primary-dark': '#002140',
        'enp-primary-light': '#EAF2F8',
        'enp-ink': '#17212B',
>>>>>>> Stashed changes
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
