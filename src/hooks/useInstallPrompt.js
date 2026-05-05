import { useEffect, useState } from 'react';
import { isNativePlatform } from '../lib/native.js';

// Captures the beforeinstallprompt event so the UI can offer an "Install"
// button at the right moment (Chrome/Edge/Android Chrome). Already-installed
// apps and Capacitor native get isInstallable === false.
export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (isNativePlatform()) return;

    // Already running standalone (installed PWA on Android/iOS/desktop)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
    if (standalone) setIsInstalled(true);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const installedHandler = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  return {
    isInstallable: !!deferredPrompt && !isInstalled && !isNativePlatform(),
    isInstalled,
    install,
  };
};
