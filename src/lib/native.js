// ─── Native platform shim ─────────────────────────────────────────────────
// Provides one unified API for both web (PWA) and Capacitor (Android).
// Each function gracefully degrades on web: e.g. native share → web Share API
// → copy to clipboard. No code outside this module needs to know the platform.
// ──────────────────────────────────────────────────────────────────────────

import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

export const platformName = () => {
  try { return Capacitor.getPlatform(); } catch { return 'web'; }
};

// ─── Initialization (call once from main.jsx) ────────────────────────────
export const initNativePlatform = async () => {
  if (!isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const { SplashScreen } = await import('@capacitor/splash-screen');
    const { App } = await import('@capacitor/app');

    // Match status bar to deep navy background
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#070F1F' });
    await StatusBar.setOverlaysWebView({ overlay: false });

    // Hide splash after app shell is ready
    setTimeout(() => SplashScreen.hide(), 200);

    // Hardware back button handler
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else App.exitApp();
    });
  } catch (e) {
    console.warn('[Native] Init failed:', e);
  }
};

// ─── Share (results, file URLs, text) ────────────────────────────────────
export const sharePayload = async ({ title, text, url, dialogTitle }) => {
  if (isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url, dialogTitle });
      return { success: true, method: 'native' };
    } catch (e) {
      if (e.message?.includes('cancel')) return { success: false, method: 'native', cancelled: true };
      console.warn('[Share] native failed, falling back', e);
    }
  }
  // Web Share API
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { success: true, method: 'web-share' };
    } catch (e) {
      if (e.name === 'AbortError') return { success: false, cancelled: true };
    }
  }
  // Final fallback: clipboard
  try {
    await navigator.clipboard.writeText(url || text || title);
    return { success: true, method: 'clipboard' };
  } catch {
    return { success: false };
  }
};

// ─── Toast (status messages) ─────────────────────────────────────────────
export const showToast = async (message, duration = 'short') => {
  if (isNativePlatform()) {
    try {
      const { Toast } = await import('@capacitor/toast');
      await Toast.show({ text: message, duration });
      return;
    } catch {}
  }
  // Web fallback — dispatch to UI layer
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, duration } }));
};

// ─── File picker ─────────────────────────────────────────────────────────
// On native: prompts the system file picker and returns a File-like object.
// On web: trigger an <input type="file"> click in the calling component.
export const pickAudioFileNative = async () => {
  if (!isNativePlatform()) return null;
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    // Capacitor doesn't ship a built-in file picker; use the @capawesome/capacitor-file-picker
    // OR fall back to <input type="file"> which works fine inside Capacitor WebView.
    return null; // signal caller to use input element
  } catch {
    return null;
  }
};

// ─── Save audio result locally ───────────────────────────────────────────
export const saveAudioToDevice = async (url, filename) => {
  if (isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const response = await fetch(url);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      const result = await Filesystem.writeFile({
        path: `Extend-Suno/${filename}`,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      await showToast(`Saved to Documents/Extend-Suno/${filename}`);
      return { success: true, uri: result.uri };
    } catch (e) {
      console.error('[Save] failed:', e);
      await showToast('Failed to save file');
      return { success: false, error: e.message };
    }
  }
  // Web — anchor download
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  return { success: true, method: 'web-download' };
};

const blobToBase64 = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
