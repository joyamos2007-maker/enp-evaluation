export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA ENP] Service Worker actif, scope :', registration.scope);
        })
        .catch((error) => {
          console.warn('[PWA ENP] Enregistrement Service Worker :', error);
        });
    });
  }
}

