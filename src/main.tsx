import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'caches' in window) {
  void caches.delete('html-navigation-cache').catch(() => {});
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let hasReloaded = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || hasReloaded) return;
    hasReloaded = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void updateSW(true);
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const checkForUpdate = () => {
        if (navigator.onLine) {
          void registration.update().catch(() => {});
        }
      };

      checkForUpdate();
      window.setInterval(checkForUpdate, 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkForUpdate();
        }
      });
    },
  });
}

createRoot(document.getElementById('root')!).render(<App />);
