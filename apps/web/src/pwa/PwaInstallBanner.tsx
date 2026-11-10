import { useState } from 'react';
import { Smartphone, Download, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';
import { usePwaInstall } from './usePwaInstall';
import { Button } from '@/components/ui';

export function PwaInstallBanner() {
  const { peutInstaller, estInstalle, estIos, installer, guideIosOuvert, fermerGuideIos } =
    usePwaInstall();
  const [banniereMasquee, setBanniereMasquee] = useState(false);

  // Si l'application est déjà installée ou si l'utilisateur a fermé la bannière
  if (estInstalle || !peutInstaller || banniereMasquee) {
    return null;
  }

  return (
    <>
      {/* Bannière discrète d'installation mobile */}
      <div className="bg-enp-blue-deep text-white border-b border-enp-gold/30 px-3 py-2 sm:px-4 sm:py-2.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1.5 bg-white/10 rounded-none shrink-0 text-enp-gold">
              <Smartphone className="w-4 h-4" />
            </span>
            <div className="truncate">
              <span className="font-bold text-white font-sans">
                Installez l'application ENP
              </span>
              <span className="hidden md:inline text-white/70 ml-2">
                Accès direct depuis votre écran d'accueil, sans passer par le navigateur.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void installer()}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-enp-gold text-enp-blue-deep text-xs font-bold hover:bg-yellow-400 transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Installer</span>
            </button>
            <button
              type="button"
              onClick={() => setBanniereMasquee(true)}
              className="p-1 text-white/60 hover:text-white transition-colors"
              title="Masquer"
              aria-label="Fermer la bannière"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Guide d'installation spécifique pour iPhone / iPad (Safari) */}
      {guideIosOuvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-white border-2 border-enp-blue-deep max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-enp-border pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-enp-blue-primary" />
                <h3 className="font-bold text-base text-enp-blue-deep">
                  Installer sur iPhone / iPad
                </h3>
              </div>
              <button
                type="button"
                onClick={fermerGuideIos}
                className="text-enp-gray-medium hover:text-enp-black p-1"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-enp-gray-medium leading-relaxed">
              Pour ajouter le portail de l'ENP sur l'écran d'accueil de votre appareil Apple, suivez ces 3 étapes simples depuis Safari :
            </p>

            <ol className="space-y-3 text-xs text-enp-black">
              <li className="flex items-start gap-2.5 p-2 bg-enp-blue-ice/30 border border-enp-border">
                <span className="flex items-center justify-center w-5 h-5 bg-enp-blue-primary text-white font-bold text-[11px] shrink-0">
                  1
                </span>
                <div>
                  Appuyez sur le bouton <strong className="text-enp-blue-deep">Partager</strong> en bas de votre écran Safari.
                  <div className="mt-1 flex items-center gap-1 text-enp-blue-primary font-medium">
                    <Share className="w-3.5 h-3.5" />
                    <span>Icône carré avec flèche vers le haut</span>
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-2.5 p-2 bg-enp-blue-ice/30 border border-enp-border">
                <span className="flex items-center justify-center w-5 h-5 bg-enp-blue-primary text-white font-bold text-[11px] shrink-0">
                  2
                </span>
                <div>
                  Faites défiler le menu et sélectionnez <strong className="text-enp-blue-deep">« Sur l'écran d'accueil »</strong>.
                  <div className="mt-1 flex items-center gap-1 text-enp-blue-primary font-medium">
                    <PlusSquare className="w-3.5 h-3.5" />
                    <span>Ajouter à l'écran d'accueil</span>
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-2.5 p-2 bg-enp-blue-ice/30 border border-enp-border">
                <span className="flex items-center justify-center w-5 h-5 bg-enp-blue-primary text-white font-bold text-[11px] shrink-0">
                  3
                </span>
                <div>
                  Appuyez sur <strong className="text-enp-green-valid">« Ajouter »</strong> en haut à droite. L'icône de l'ENP apparaîtra sur votre écran comme une application native.
                </div>
              </li>
            </ol>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" size="sm" onClick={fermerGuideIos}>
                J'ai compris
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

