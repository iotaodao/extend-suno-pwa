import React, { useState, useRef } from 'react';
import {
  UploadCloud, AlertCircle, X, Trash2, Play, Pause,
  Check, Link2,
} from 'lucide-react';
import { T, fmtBytes, fmtSec } from '../lib/theme.js';
import { uploadFile } from '../lib/api.js';

export const UploadPanel = ({
  apiKey, demoMode, model,
  uploaded, onUploaded, onClear,
  initialFile, // optional File from share-target
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const previewAudioRef = useRef(null);

  // Probe duration locally
  const probeDuration = (f) => new Promise((res) => {
    const url = URL.createObjectURL(f);
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => res({ duration: a.duration, url });
    a.onerror = () => res({ duration: null, url });
    a.src = url;
  });

  const acceptFile = async (f) => {
    setError(null);
    if (!f) return;
    if (!f.type.startsWith('audio/') && !/\.(mp3|wav|m4a|ogg|flac)$/i.test(f.name)) {
      setError('Please select an audio file (mp3, wav, m4a, ogg, flac)');
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError(`File too large: ${fmtBytes(f.size)} (max 100MB)`);
      return;
    }
    const { duration: dur, url } = await probeDuration(f);
    if (model === 'V4_5ALL' && dur && dur > 60) {
      setError(`V4_5ALL accepts only ≤ 1 min audio (your file: ${fmtSec(dur)})`);
      URL.revokeObjectURL(url);
      return;
    }
    if (dur && dur > 480) {
      setError(`Audio is too long: ${fmtSec(dur)} (max 8 min for extend)`);
      URL.revokeObjectURL(url);
      return;
    }
    setFile(f);
    setDuration(dur);
    setAudioPreview(url);
  };

  // Auto-accept files arriving via share-target
  React.useEffect(() => {
    if (initialFile) acceptFile(initialFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  const onSelect = (e) => acceptFile(e.target.files?.[0]);
  const onDrop   = (e) => { e.preventDefault(); setDragOver(false); acceptFile(e.dataTransfer.files?.[0]); };

  const upload = async () => {
    if (!file) return;
    setError(null);

    if (demoMode) {
      setUploading(true); setProgress(0);
      let p = 0;
      const tick = setInterval(() => {
        p += 8 + Math.random() * 12;
        if (p >= 100) {
          clearInterval(tick);
          setProgress(100); setUploading(false);
          onUploaded({
            fileUrl: `https://sunoapiorg.redpandaai.co/files/audio/demo-${Date.now()}.mp3`,
            fileName: file.name, fileSize: file.size, duration, previewUrl: audioPreview,
          });
        } else setProgress(Math.floor(p));
      }, 180);
      return;
    }

    if (!apiKey?.trim()) { setError('API key required for live upload'); return; }
    setUploading(true); setProgress(0);

    abortRef.current = new AbortController();
    try {
      const data = await uploadFile(apiKey, file, {
        onProgress: setProgress,
        signal: abortRef.current.signal,
      });
      setUploading(false);
      onUploaded({
        fileUrl: data.fileUrl, fileId: data.fileId,
        fileName: data.fileName || file.name, fileSize: data.fileSize || file.size,
        duration, expiresAt: data.expiresAt, previewUrl: audioPreview,
      });
    } catch (e) {
      setUploading(false);
      if (e.message !== 'Upload cancelled') setError(e.message);
      else setProgress(0);
    }
  };

  const cancelUpload = () => abortRef.current?.abort();

  const clear = () => {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setFile(null); setDuration(null); setAudioPreview(null);
    setProgress(0); setError(null); setPreviewPlaying(false);
    if (inputRef.current) inputRef.current.value = '';
    onClear?.();
  };

  const togglePreview = () => {
    const a = previewAudioRef.current; if (!a) return;
    if (previewPlaying) { a.pause(); setPreviewPlaying(false); }
    else { a.play().catch(() => {}); setPreviewPlaying(true); }
  };

  // ─── Uploaded ────────────────────────────────────────────────────────
  if (uploaded) {
    return (
      <div className="rounded-md p-4" style={{ background: T.bgCard, border: '1px solid rgba(134,199,176,0.25)' }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(134,199,176,0.1)', border: '1px solid rgba(134,199,176,0.25)' }}>
            <Check size={16} style={{ color: T.success }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: T.success }}>uploaded</span>
              {uploaded.expiresAt && (
                <span className="text-[9px] font-mono" style={{ color: T.textMute }}>
                  expires {new Date(uploaded.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="text-[12px] truncate font-serif mb-1" style={{ color: T.text }}>{uploaded.fileName}</div>
            <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: T.textMute }}>
              <span>{fmtBytes(uploaded.fileSize)}</span>
              {uploaded.duration && <span>{fmtSec(uploaded.duration)}</span>}
              <a href={uploaded.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:opacity-80" style={{ color: T.blueDeep }}>
                <Link2 size={10} /> source url
              </a>
            </div>
          </div>
          <button onClick={clear} className="flex-shrink-0 p-1.5 rounded hover:bg-white/5" title="Remove">
            <Trash2 size={13} style={{ color: T.textDim }} />
          </button>
        </div>
      </div>
    );
  }

  // ─── Uploading ──────────────────────────────────────────────────────
  if (uploading) {
    return (
      <div className="rounded-md p-5" style={{ background: T.bgCard, border: `1px solid ${T.borderHi}` }}>
        <div className="flex items-center gap-3 mb-3">
          <UploadCloud size={16} style={{ color: T.blue }} className="animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] truncate font-serif" style={{ color: T.text }}>{file?.name}</div>
            <div className="text-[10px] font-mono" style={{ color: T.textMute }}>
              {fmtBytes(file?.size || 0)} · uploading…
            </div>
          </div>
          <span className="text-[18px] tabular-nums font-serif font-light" style={{ color: T.blue }}>
            {progress}<span className="text-[11px]" style={{ color: T.textMute }}>%</span>
          </span>
        </div>
        <div className="h-[3px] rounded-full overflow-hidden mb-3" style={{ background: T.bgInput }}>
          <div className="h-full transition-all duration-200"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${T.blueGlow}, ${T.blue})`, boxShadow: `0 0 10px ${T.blue}` }} />
        </div>
        <button onClick={cancelUpload} className="text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5" style={{ color: T.textMute }}>
          <X size={11} /> cancel
        </button>
      </div>
    );
  }

  // ─── Selected, ready to upload ──────────────────────────────────────
  if (file) {
    return (
      <div className="rounded-md p-4" style={{ background: T.bgCard, border: `1px solid ${T.borderHi}` }}>
        <audio ref={previewAudioRef} src={audioPreview} preload="metadata" onEnded={() => setPreviewPlaying(false)} />
        <div className="flex items-center gap-3 mb-3">
          <button onClick={togglePreview}
            className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center transition-all"
            style={{ background: 'rgba(165,200,240,0.08)', border: `1px solid ${T.borderHi}`, color: T.blue }}>
            {previewPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] truncate font-serif" style={{ color: T.text }}>{file.name}</div>
            <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: T.textMute }}>
              <span>{fmtBytes(file.size)}</span>
              {duration && <span>{fmtSec(duration)}</span>}
              <span>{file.type || 'audio'}</span>
            </div>
          </div>
          <button onClick={clear} className="flex-shrink-0 p-1.5 rounded hover:bg-white/5" title="Remove">
            <Trash2 size={13} style={{ color: T.textDim }} />
          </button>
        </div>

        {error && (
          <div className="px-3 py-2 mb-3 rounded text-[11px] flex items-start gap-2"
            style={{ background: 'rgba(232,154,154,0.05)', border: '1px solid rgba(232,154,154,0.2)', color: T.danger }}>
            <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />{error}
          </div>
        )}

        <button onClick={upload}
          className="w-full py-2.5 rounded text-[11px] uppercase tracking-[0.25em] font-sans font-semibold flex items-center justify-center gap-2 transition-all"
          style={{ background: `linear-gradient(135deg, ${T.blue}, ${T.blueDeep})`, color: T.bg, border: `1px solid ${T.blue}` }}>
          <UploadCloud size={13} /> upload to suno
        </button>
      </div>
    );
  }

  // ─── Empty: drag-drop zone ──────────────────────────────────────────
  return (
    <div>
      <input ref={inputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac" className="hidden" onChange={onSelect} />
      <button onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="w-full rounded-md p-8 transition-all duration-200 group"
        style={{ background: dragOver ? 'rgba(165,200,240,0.04)' : T.bgInput, border: `1px dashed ${dragOver ? T.blue : T.border}` }}>
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <UploadCloud size={28} style={{ color: dragOver ? T.blue : T.textDim }} />
            {dragOver && (
              <div className="absolute -inset-3 rounded-full" style={{
                background: `radial-gradient(circle, ${T.blue}33, transparent 70%)`,
                animation: 'pulse-glow 1.4s ease-in-out infinite',
              }} />
            )}
          </div>
          <div className="text-center">
            <div className="text-[13px] mb-1 font-serif" style={{ color: T.text }}>
              {dragOver ? 'drop the file' : 'tap to choose audio or drop file'}
            </div>
            <div className="text-[10px] font-mono" style={{ color: T.textMute }}>
              mp3 · wav · m4a · ogg · flac · max 100MB · ≤ 8 min
              {model === 'V4_5ALL' && <span style={{ color: T.warn }}> · V4_5ALL: ≤ 1 min</span>}
            </div>
          </div>
        </div>
      </button>
      {error && (
        <div className="px-3 py-2 mt-3 rounded text-[11px] flex items-start gap-2"
          style={{ background: 'rgba(232,154,154,0.05)', border: '1px solid rgba(232,154,154,0.2)', color: T.danger }}>
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />{error}
        </div>
      )}
      <div className="text-[10px] mt-3 leading-relaxed" style={{ color: T.textMute }}>
        Files are stored on Suno's CDN for 3 days (free).
        Uploaded URL is then sent to <code className="font-mono" style={{ color: T.textDim }}>upload-extend</code> endpoint.
      </div>
    </div>
  );
};
