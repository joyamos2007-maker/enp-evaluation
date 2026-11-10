import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [estInstalle, setEstInstalle] = useState(false);
  const [estIos, setEstIos] = useState(false);
  const [guideIosOuvert, setGuideIosOuvert] = useState(false);

  useEffect(() => {
    // 1. Vérifier si l'application est déjà lancée en mode autonome (PWA installée)
    const estStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setEstInstalle(estStandalone);

    // 2. Détecter l'environnement iOS (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setEstIos(isIosDevice);

    // 3. Écouter l'événement standard d'installation Chrome / Android / Edge
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setEstInstalle(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installer = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setEstInstalle(true);
      }
      setDeferredPrompt(null);
    } else if (estIos) {
      setGuideIosOuvert(true);
    }
  }, [deferredPrompt, estIos]);

  return {
    peutInstaller: !estInstalle && (deferredPrompt !== null || estIos),
    estInstalle,
    estIos,
    installer,
    guideIosOuvert,
    ouvrirGuideIos: () => setGuideIosOuvert(true),
    fermerGuideIos: () => setGuideIosOuvert(false),
  };
}

