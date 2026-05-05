// ─── PWA service worker registration (workbox-window) ─────────────────────
// Skipped on Capacitor native — there the WebView serves bundled assets directly
// and a cross-origin SW would conflict.
// ──────────────────────────────────────────────────────────────────────────
import { Workbox } from 'workbox-window';
import { isNativePlatform } from './native.js';

let wb = null;

export const registerServiceWorker = () => {
  if (isNativePlatform()) {
    console.info('[SW] Skipped — running on native platform');
    return;
  }
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Service workers are not supported');
    return;
  }
  if (import.meta.env.DEV) {
    // PWA plugin already registers in dev with devOptions.enabled
  }

  wb = new Workbox('/sw.js', { scope: '/' });

  // Fired when an updated SW has finished installing and is waiting
  wb.addEventListener('waiting', () => {
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  });

  // Fired after the user accepts the update
  wb.addEventListener('controlling', () => {
    window.location.reload();
  });

  wb.register().catch((err) => {
    console.error('[SW] Registration failed:', err);
  });
};

export const acceptUpdate = () => {
  if (!wb) return;
  wb.messageSkipWaiting();
};
