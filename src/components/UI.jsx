import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { T, fmtSec } from '../lib/theme.js';

// ─── Background star-field ───────────────────────────────────────────────
export const StarField = () => {
  const stars = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < 80; i++) {
      arr.push({
        x: Math.random() * 100, y: Math.random() * 100,
        s: Math.random() * 1.4 + 0.3, d: Math.random() * 4 + 2,
        a: Math.random() * 0.5 + 0.1,
      });
    }
    return arr;
  }, []);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {stars.map((s, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.s, height: s.s, background: T.blue, opacity: s.a,
            animation: `twinkle ${s.d}s ease-in-out ${s.d/2}s infinite`,
          }} />
      ))}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse at 20% 0%, rgba(125,168,216,0.08) 0%, transparent 50%),
                     radial-gradient(ellipse at 80% 100%, rgba(91,143,203,0.06) 0%, transparent 50%)`
      }} />
    </div>
  );
};

// ─── Animated waveform ────────────────────────────────────────────────────
export const Waveform = ({ active = true, bars = 32, color = T.blue }) => (
  <div className="flex items-end gap-[3px] h-10">
    {Array.from({ length: bars }).map((_, i) => (
      <div key={i} style={{
        width: 3,
        height: active ? `${20 + Math.sin(i * 0.6) * 30 + Math.random() * 30}%` : '20%',
        background: color, opacity: 0.3 + Math.random() * 0.5, borderRadius: 1,
        animation: active ? `wave ${0.6 + (i % 5) * 0.15}s ease-in-out ${i * 0.04}s infinite alternate` : 'none',
      }} />
    ))}
  </div>
);

// ─── Form atoms ───────────────────────────────────────────────────────────
export const Label = ({ children, required, hint }) => (
  <div className="flex items-baseline justify-between mb-1.5">
    <label className="text-[11px] tracking-[0.18em] uppercase font-medium font-sans" style={{ color: T.textDim }}>
      {children}{required && <span style={{ color: T.blue }}> *</span>}
    </label>
    {hint && <span className="text-[10px] font-mono" style={{ color: T.textMute }}>{hint}</span>}
  </div>
);

export const Input = ({ value, onChange, placeholder, type = 'text', mono = false, disabled = false }) => (
  <input
    type={type} value={value} onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder} disabled={disabled}
    className={`w-full px-3.5 py-2.5 rounded-md text-[13px] outline-none transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${mono ? 'font-mono' : 'font-sans'}`}
    style={{ background: T.bgInput, border: `1px solid ${T.border}`, color: T.text }}
    onFocus={(e) => { if (!disabled) { e.target.style.borderColor = T.borderHi; e.target.style.background = '#0B1B2E'; } }}
    onBlur={(e) => { e.target.style.borderColor = T.border; e.target.style.background = T.bgInput; }}
  />
);

export const Textarea = ({ value, onChange, placeholder, rows = 3, disabled = false }) => (
  <textarea
    value={value} onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder} rows={rows} disabled={disabled}
    className="w-full px-3.5 py-2.5 rounded-md text-[13px] outline-none transition-all duration-200 resize-none leading-relaxed font-sans disabled:opacity-40 disabled:cursor-not-allowed"
    style={{ background: T.bgInput, border: `1px solid ${T.border}`, color: T.text }}
    onFocus={(e) => { if (!disabled) { e.target.style.borderColor = T.borderHi; e.target.style.background = '#0B1B2E'; } }}
    onBlur={(e) => { e.target.style.borderColor = T.border; e.target.style.background = T.bgInput; }}
  />
);

export const Select = ({ value, onChange, options, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);
  const current = options.find(o => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => !disabled && setOpen(!open)} disabled={disabled}
        className="w-full px-3.5 py-2.5 rounded-md text-[13px] font-mono flex items-center justify-between transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: T.bgInput, border: `1px solid ${open ? T.borderHi : T.border}`, color: T.text }}>
        <span className="flex items-center gap-2"><span style={{ color: T.blue }}>◆</span>{current?.label || '—'}</span>
        <ChevronDown size={14} style={{ color: T.textDim, transform: open ? 'rotate(180deg)' : '', transition: 'transform 200ms' }} />
      </button>
      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1.5 rounded-md py-1 shadow-2xl"
          style={{ background: T.bgCard, border: `1px solid ${T.borderHi}` }}>
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full text-left px-3.5 py-2 text-[12px] font-mono flex items-center justify-between hover:bg-white/5 transition"
              style={{ color: o.value === value ? T.blue : T.text }}>
              <span>{o.label}</span>
              {o.tag && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(165,200,240,0.1)', color: T.textDim }}>{o.tag}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Segmented = ({ value, onChange, options }) => (
  <div className="inline-flex p-0.5 rounded-md" style={{ background: T.bgInput, border: `1px solid ${T.border}` }}>
    {options.map(o => (
      <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}
        className="px-3.5 py-1.5 text-[10px] uppercase tracking-[0.2em] rounded transition-all font-sans"
        style={{
          background: value === o.value ? T.bgCard : 'transparent',
          color:      value === o.value ? T.blue   : T.textDim,
          border:    `1px solid ${value === o.value ? T.borderHi : 'transparent'}`,
        }}>
        {o.label}
      </button>
    ))}
  </div>
);

// ─── Slider for 0..1 weights ─────────────────────────────────────────────
export const WeightSlider = ({ value, onChange, label, hint }) => {
  const ref = useRef(null);
  const drag = useRef(false);
  const update = (clientX) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    onChange(parseFloat(pct.toFixed(2)));
  };
  useEffect(() => {
    const move = (e) => drag.current && update(e.touches ? e.touches[0].clientX : e.clientX);
    const up   = () => drag.current = false;
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up);
    };
  });
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] tracking-[0.18em] uppercase" style={{ color: T.textDim }}>{label}</span>
        <span className="text-[11px] tabular-nums font-mono" style={{ color: T.blue }}>{value.toFixed(2)}</span>
      </div>
      <div ref={ref}
        onMouseDown={(e) => { drag.current = true; update(e.clientX); }}
        onTouchStart={(e) => { drag.current = true; update(e.touches[0].clientX); }}
        className="relative h-6 cursor-pointer flex items-center touch-none">
        <div className="absolute left-0 right-0 h-[2px] rounded-full" style={{ background: T.bgInput }} />
        <div className="absolute left-0 h-[2px] rounded-full" style={{
          width: `${value * 100}%`,
          background: `linear-gradient(90deg, ${T.blueGlow}, ${T.blue})`,
        }} />
        <div className="absolute -translate-x-1/2 w-3 h-3 rounded-full"
          style={{ left: `${value * 100}%`, background: T.blue, boxShadow: `0 0 8px ${T.blue}` }} />
      </div>
      {hint && <div className="text-[10px] mt-1" style={{ color: T.textMute }}>{hint}</div>}
    </div>
  );
};

// ─── Continue-at timeline ────────────────────────────────────────────────
export const Timeline = ({ value, onChange, max = 240, disabled = false }) => {
  const trackRef = useRef(null);
  const drag = useRef(false);
  const update = (clientX) => {
    if (!trackRef.current || disabled) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onChange(parseFloat((pct * max).toFixed(1)));
  };
  useEffect(() => {
    const move = (e) => drag.current && update(e.touches ? e.touches[0].clientX : e.clientX);
    const up   = () => drag.current = false;
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up);
    };
  });
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={`select-none ${disabled ? 'opacity-40' : ''}`}>
      <div ref={trackRef}
        onMouseDown={(e) => { if (!disabled) { drag.current = true; update(e.clientX); } }}
        onTouchStart={(e) => { if (!disabled) { drag.current = true; update(e.touches[0].clientX); } }}
        className={`relative h-12 touch-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        {Array.from({ length: 13 }).map((_, i) => (
          <div key={i} className="absolute top-0 bottom-0"
            style={{ left: `${(i/12)*100}%`, width: 1, background: T.border }} />
        ))}
        <div className="absolute top-0 bottom-0 left-0" style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, transparent, rgba(165,200,240,0.08), rgba(165,200,240,0.18))`,
        }} />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pct}%` }}>
          <div className="w-[2px] h-8" style={{ background: T.blue, boxShadow: `0 0 12px ${T.blue}` }} />
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
            style={{ background: T.blue, boxShadow: `0 0 8px ${T.blue}` }} />
        </div>
        <div className="absolute bottom-1 left-2 text-[9px] font-mono" style={{ color: T.textMute }}>0:00</div>
        <div className="absolute bottom-1 right-2 text-[9px] font-mono" style={{ color: T.textMute }}>{fmtSec(max)}</div>
      </div>
      <div className="flex items-baseline justify-between mt-2">
        <span className="text-[10px] tracking-widest uppercase" style={{ color: T.textMute }}>continue from</span>
        <span className="text-[16px] tabular-nums font-mono" style={{ color: T.blue }}>
          {fmtSec(value)}<span className="text-[11px]" style={{ color: T.textMute }}>.{String(Math.floor((value % 1) * 10))}</span>
        </span>
      </div>
    </div>
  );
};
