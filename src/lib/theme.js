// ─── Color & dimension tokens ─────────────────────────────────────────────
export const T = {
  bg:        '#070F1F',
  bgRaised:  '#0B1A2E',
  bgCard:    '#0E2138',
  bgInput:   '#091627',
  border:    'rgba(166, 200, 235, 0.08)',
  borderHi:  'rgba(166, 200, 235, 0.18)',
  text:      '#E6EEF8',
  textDim:   '#8AA4C4',
  textMute:  '#5A7090',
  blue:      '#A5C8F0',
  blueDeep:  '#7DA8D8',
  blueGlow:  '#5B8FCB',
  success:   '#86C7B0',
  warn:      '#E8C58A',
  danger:    '#E89A9A',
};

export const fmtBytes = (n) => {
  if (!n) return '0 B';
  const k = 1024, units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${(n / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
};
export const fmtSec = (s) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

export const STATUS_META = {
  PENDING:    { label: 'queued',     color: T.warn },
  GENERATING: { label: 'generating', color: T.blue },
  SUCCESS:    { label: 'completed',  color: T.success },
  FAILED:     { label: 'failed',     color: T.danger },
};
