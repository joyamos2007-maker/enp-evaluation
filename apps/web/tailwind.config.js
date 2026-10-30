/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
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
        'enp-gold': '#B08D35',           // Doré discret (sceau officiel, distinction)
        'enp-gold-light': '#FBF6EA',     // Doré très clair (encadrés officiels)
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
        'enp-ink-soft': '#475569',
        'enp-sky': '#EAF2F8',
        'enp-bordeaux': '#A3262A',
        'enp-bordeaux-light': '#FCEBEC',
      },
      borderRadius: {
        'none': '0px',
        'sm': '2px',
        'DEFAULT': '2px',
        'md': '3px',
        'lg': '4px',
        'xl': '4px',
        '2xl': '4px',
        '3xl': '4px',
        'full': '9999px',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
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
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.18s ease-out',
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
