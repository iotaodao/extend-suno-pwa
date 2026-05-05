import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Share2 } from 'lucide-react';
import { T, fmtSec } from '../lib/theme.js';
import { Waveform } from './UI.jsx';
import { sharePayload, saveAudioToDevice, isNativePlatform } from '../lib/native.js';

const demoCover = (hue) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
    <defs><radialGradient id='g' cx='30%' cy='30%'>
      <stop offset='0%' stop-color='hsl(${hue},60%,70%)'/>
      <stop offset='100%' stop-color='hsl(${hue+40},40%,15%)'/>
    </radialGradient></defs>
    <rect width='200' height='200' fill='url(%23g)'/>
    <circle cx='100' cy='100' r='30' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='1'/>
    <circle cx='100' cy='100' r='50' fill='none' stroke='rgba(255,255,255,0.2)' stroke-width='1'/>
    <circle cx='100' cy='100' r='70' fill='none' stroke='rgba(255,255,255,0.1)' stroke-width='1'/>
  </svg>`
)}`;

export const SongCard = ({ song, index }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onTime = () => setProgress(a.currentTime / (a.duration || 1));
    const onEnd  = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('ended', onEnd); };
  }, []);

  const toggle = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => {}); setPlaying(true); }
  };

  const cover = song.image_url || demoCover(200 + index * 30);
  const filename = `${song.title?.replace(/[^a-z0-9]/gi, '_') || 'extension'}-${index + 1}.mp3`;

  const onSave = () => saveAudioToDevice(song.audio_url, filename);
  const onShare = () => sharePayload({
    title: song.title || 'Suno extension',
    text: `Check out this song extension: ${song.title}`,
    url: song.audio_url,
    dialogTitle: 'Share extension',
  });

  return (
    <div className="rounded-lg p-4 transition-all duration-300 hover:translate-y-[-1px]"
      style={{ background: T.bgCard, border: `1px solid ${T.border}` }}>
      <audio ref={audioRef} src={song.audio_url} preload="none" />
      <div className="flex gap-3.5">
        <div className="relative flex-shrink-0">
          <img src={cover} alt="" className="w-20 h-20 rounded-md object-cover" style={{ border: `1px solid ${T.border}` }} />
          <button onClick={toggle}
            className="absolute inset-0 flex items-center justify-center rounded-md transition-all duration-200"
            style={{ background: 'rgba(7,15,31,0.5)', backdropFilter: 'blur(4px)' }}>
            {playing ? <Pause size={20} style={{ color: T.blue }} /> : <Play size={20} style={{ color: T.blue }} />}
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[10px] tracking-widest font-mono" style={{ color: T.textMute }}>0{index + 1}</span>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: T.textDim }}>variant</span>
            <span className="ml-auto text-[10px] tabular-nums font-mono" style={{ color: T.textMute }}>
              {song.duration ? fmtSec(song.duration) : '—:—'}
            </span>
          </div>
          <div className="text-[13px] mb-2 truncate font-serif" style={{ color: T.text }}>
            {song.title || 'Untitled extension'}
          </div>
          <div className="flex items-center gap-2 mb-2"><Waveform active={playing} bars={20} /></div>
          <div className="h-[2px] rounded-full overflow-hidden" style={{ background: T.bgInput }}>
            <div className="h-full transition-all duration-100"
              style={{ width: `${progress * 100}%`, background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] truncate flex-1 font-mono" style={{ color: T.textMute }}>
              {(song.id || '').toString().slice(0, 12) || '—'}…
            </span>
            <button onClick={onShare}
              className="text-[10px] uppercase tracking-widest flex items-center gap-1 hover:opacity-80"
              style={{ color: T.blueDeep }}>
              <Share2 size={11} /> share
            </button>
            <button onClick={onSave}
              className="text-[10px] uppercase tracking-widest flex items-center gap-1 hover:opacity-80"
              style={{ color: T.blueDeep }}>
              <Download size={11} /> {isNativePlatform() ? 'save' : 'mp3'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
