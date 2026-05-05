import React from 'react';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import { T } from '../lib/theme.js';

// ─── Install banner (PWA) ────────────────────────────────────────────────
export const InstallBanner = ({ onInstall, onDismiss }) => (
  <div className="rounded-lg p-3 flex items-center gap-3 slide-down"
    style={{ background: T.bgRaised, border: `1px solid ${T.borderHi}` }}>
    <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center"
      style={{ background: 'rgba(165,200,240,0.08)', border: `1px solid ${T.borderHi}` }}>
      <Download size={14} style={{ color: T.blue }} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[12px]" style={{ color: T.text }}>Install Extend·Suno</div>
      <div className="text-[10px]" style={{ color: T.textMute }}>Works offline · launches like a native app</div>
    </div>
    <button onClick={onInstall}
      className="text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 rounded font-sans font-semibold"
      style={{ background: T.blue, color: T.bg }}>
      install
    </button>
    <button onClick={onDismiss} className="p-1 hover:bg-white/5 rounded">
      <X size={12} style={{ color: T.textMute }} />
    </button>
  </div>
);

// ─── Update prompt (new SW available) ────────────────────────────────────
export const UpdateBanner = ({ onApply, onDismiss }) => (
  <div className="rounded-lg p-3 flex items-center gap-3 slide-down"
    style={{ background: T.bgRaised, border: `1px solid ${T.borderHi}` }}>
    <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center"
      style={{ background: 'rgba(232,197,138,0.08)', border: '1px solid rgba(232,197,138,0.2)' }}>
      <RefreshCw size={14} style={{ color: T.warn }} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[12px]" style={{ color: T.text }}>Update available</div>
      <div className="text-[10px]" style={{ color: T.textMute }}>A newer version is ready to install</div>
    </div>
    <button onClick={onApply}
      className="text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 rounded font-sans font-semibold"
      style={{ background: T.warn, color: T.bg }}>
      reload
    </button>
    <button onClick={onDismiss} className="p-1 hover:bg-white/5 rounded">
      <X size={12} style={{ color: T.textMute }} />
    </button>
  </div>
);

// ─── Offline indicator ───────────────────────────────────────────────────
export const OfflineBadge = ({ queuedCount = 0 }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full slide-down"
    style={{ background: 'rgba(232,197,138,0.06)', border: '1px solid rgba(232,197,138,0.2)' }}>
    <WifiOff size={11} style={{ color: T.warn }} />
    <span className="text-[10px] uppercase tracking-[0.2em] font-sans" style={{ color: T.warn }}>
      offline
      {queuedCount > 0 && <span className="ml-1.5 font-mono" style={{ color: T.textDim }}>· {queuedCount} queued</span>}
    </span>
  </div>
);

// ─── Toast (web fallback for native toasts) ──────────────────────────────
export const Toast = ({ message, onDone }) => {
  React.useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-md slide-down"
      style={{ background: T.bgCard, border: `1px solid ${T.borderHi}` }}>
      <span className="text-[12px]" style={{ color: T.text }}>{message}</span>
    </div>
  );
};
