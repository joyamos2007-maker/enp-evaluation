import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Info, X, ShieldCheck, BookOpen, AlertTriangle } from 'lucide-react';

export interface InfoBubbleProps {
  /** Titre affiché dans l'en-tête de la bulle d'information */
  title: string;
  /** Contenu détaillé ou texte réglementaire */
  content: React.ReactNode;
  /** Badge institutionnel optionnel (ex: 'RÉGLEMENTATION', 'ANONYMAT') */
  badge?: string;
  /** Libellé optionnel affiché à côté du bouton 'i' */
  triggerLabel?: string;
  /** Variante visuelle du bouton déclencheur */
  triggerVariant?: 'default' | 'pill' | 'compact' | 'subtle';
  /** Durée d'affichage automatique en millisecondes (défaut : 6000 ms, 0 = permanent jusqu'au clic) */
  duration?: number;
  /** Icône d'en-tête personnalisée */
  icon?: 'info' | 'shield' | 'book' | 'warning';
  /** Classes CSS supplémentaires pour le conteneur du bouton */
  className?: string;
  /** Accessible label */
  ariaLabel?: string;
}

/**
 * Bulle d'information réglementaire éphémère.
 * Déclenchée par un discret bouton 'i'.
 * Disparaît rapidement (compte à rebours visuel) ou sur simple pression/toucher.
 */
export function InfoBubble({
  title,
  content,
  badge = 'INFORMATION OFFICIELLE',
  triggerLabel,
  triggerVariant = 'default',
  duration = 6000,
  icon = 'info',
  className = '',
  ariaLabel,
}: InfoBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempsRestant, setTempsRestant] = useState(duration);
  const [enPause, setEnPause] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const fermer = useCallback(() => {
    setIsOpen(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const ouvrir = useCallback(() => {
    setTempsRestant(duration);
    setIsOpen(true);
    setEnPause(false);
  }, [duration]);

  // Gestion du compte à rebours éphémère
  useEffect(() => {
    if (!isOpen || duration <= 0) return;

    if (enPause) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalle = 100; // actualisation fluide tous les 100ms
    timerRef.current = window.setInterval(() => {
      setTempsRestant((prev) => {
        if (prev <= 100) {
          fermer();
          return 0;
        }
        return prev - 100;
      });
    }, intervalle);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, duration, enPause, fermer]);

  // Fermeture par touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, fermer]);

  // Fermeture au clic en dehors
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        fermer();
      }
    };
    // Écouter après un court délai pour ne pas intercepter le clic d'ouverture
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, fermer]);

  const progressionPct = duration > 0 ? Math.max(0, Math.min(100, (tempsRestant / duration) * 100)) : 100;
  const secondesRestantes = Math.ceil(tempsRestant / 1000);

  const iconeEnTete = {
    info: <Info className="w-4 h-4 text-enp-gold shrink-0" aria-hidden="true" />,
    shield: <ShieldCheck className="w-4 h-4 text-enp-gold shrink-0" aria-hidden="true" />,
    book: <BookOpen className="w-4 h-4 text-enp-gold shrink-0" aria-hidden="true" />,
    warning: <AlertTriangle className="w-4 h-4 text-enp-gold shrink-0" aria-hidden="true" />,
  }[icon];

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Bouton déclencheur 'i' */}
      {triggerVariant === 'compact' ? (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={ariaLabel || `Information : ${title}`}
          aria-expanded={isOpen}
          title={title}
          className="w-7 h-7 flex items-center justify-center bg-enp-blue-light/60 hover:bg-enp-blue-primary text-enp-blue-deep hover:text-white border border-enp-blue-primary/30 transition-colors cursor-pointer active:scale-95 shrink-0 group"
        >
          <Info className="w-3.5 h-3.5 text-enp-blue-primary group-hover:text-white shrink-0 transition-colors" />
        </button>
      ) : triggerVariant === 'pill' ? (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={ariaLabel || `Information : ${title}`}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-enp-blue-light/60 hover:bg-enp-blue-primary hover:text-white border border-enp-blue-primary/30 text-enp-blue-deep font-semibold text-xs transition-colors cursor-pointer active:scale-95 shadow-2xs font-sans group"
        >
          <Info className="w-3.5 h-3.5 text-enp-blue-primary group-hover:text-white shrink-0 transition-colors" />
          {triggerLabel && <span className="truncate">{triggerLabel}</span>}
        </button>
      ) : triggerVariant === 'subtle' ? (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={ariaLabel || `Information : ${title}`}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1 text-xs text-enp-blue-primary hover:text-enp-blue-deep underline font-medium cursor-pointer font-sans"
        >
          <Info className="w-3 h-3 text-current shrink-0" />
          {triggerLabel && <span>{triggerLabel}</span>}
        </button>
      ) : (
        <button
          type="button"
          onClick={ouvrir}
          aria-label={ariaLabel || `Information : ${title}`}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-enp-blue-light hover:bg-enp-blue-primary text-enp-blue-deep hover:text-white border border-enp-blue-primary/30 font-medium text-xs transition-colors cursor-pointer active:scale-95 font-sans group"
        >
          <Info className="w-3.5 h-3.5 text-enp-blue-primary group-hover:text-white shrink-0 transition-colors" />
          {triggerLabel && <span className="font-semibold">{triggerLabel}</span>}
        </button>
      )}

      {/* Bulle d'information flottante */}
      {isOpen && (
        <>
          {/* Léger voile pour mobile assurant la mise en avant sans bloquer l'interaction */}
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:hidden animate-fade-in"
            onClick={fermer}
            aria-hidden="true"
          />

          <div
            ref={bubbleRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="info-bubble-title"
            onMouseEnter={() => setEnPause(true)}
            onMouseLeave={() => setEnPause(false)}
            onTouchStart={() => setEnPause(true)}
            onTouchEnd={() => setEnPause(false)}
            className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:top-20 sm:w-96 z-50 bg-white border-2 border-enp-blue-deep shadow-modal animate-fade-in text-enp-black overflow-hidden"
          >
            {/* Barre de compte à rebours visuel */}
            {duration > 0 && (
              <div className="h-1 w-full bg-enp-blue-deep/20 overflow-hidden">
                <div
                  className="h-full bg-enp-gold transition-all ease-linear"
                  style={{ width: `${progressionPct}%` }}
                />
              </div>
            )}

            {/* En-tête institutionnel bleu profond */}
            <div className="bg-enp-blue-deep text-white px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-[#082642]">
              <div className="flex items-center gap-2 min-w-0">
                {iconeEnTete}
                <div className="min-w-0">
                  <div className="text-[10px] font-bold tracking-wider uppercase text-enp-gold truncate">
                    {badge}
                  </div>
                  <h3 id="info-bubble-title" className="text-xs font-bold text-white truncate">
                    {title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={fermer}
                aria-label="Fermer la bulle d'information"
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corps du message */}
            <div className="p-3.5 text-xs text-enp-black leading-relaxed font-sans bg-white">
              {typeof content === 'string' ? <p>{content}</p> : content}
            </div>

            {/* Pied éphémère informatif avec fermeture rapide */}
            <div className="px-3.5 py-1.5 bg-enp-blue-ice/60 border-t border-enp-border flex items-center justify-between text-[11px] text-enp-gray-medium">
              <span className="flex items-center gap-1">
                {enPause ? (
                  <span className="text-enp-blue-primary font-medium">Lecture en pause</span>
                ) : duration > 0 ? (
                  <span>Disparaît dans {secondesRestantes}s</span>
                ) : (
                  <span>Information officielle</span>
                )}
              </span>
              <button
                type="button"
                onClick={fermer}
                className="text-enp-blue-primary hover:text-enp-blue-deep font-semibold underline cursor-pointer"
              >
                Fermer maintenant
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
