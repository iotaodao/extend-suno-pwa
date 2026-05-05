import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Music2, Loader2, ChevronRight, Wand2, KeyRound, History,
  AlertCircle, CheckCircle2, Sparkles, Radio, X, ChevronDown,
  Sliders, Webhook, Settings2, Mic2, Ban, FileAudio, Check,
} from 'lucide-react';
import {
  StarField, Waveform, Label, Input, Textarea, Select,
  Segmented, WeightSlider, Timeline,
} from './components/UI.jsx';
import { UploadPanel } from './components/UploadPanel.jsx';
import { SongCard } from './components/SongCard.jsx';
import { InstallBanner, UpdateBanner, OfflineBadge, Toast } from './components/Banners.jsx';
import { T, fmtSec, STATUS_META } from './lib/theme.js';
import {
  submitExtend, submitUploadExtend, fetchTaskStatus, replayQueue,
} from './lib/api.js';
import {
  saveHistoryEntry, getAllHistory, deleteHistoryEntry,
  getSetting, setSetting, enqueueSubmission, getQueuedSubmissions,
} from './lib/storage.js';
import { useNetworkStatus } from './hooks/useNetworkStatus.js';
import { useInstallPrompt } from './hooks/useInstallPrompt.js';
import { useUpdatePrompt } from './hooks/useUpdatePrompt.js';
import { useShareTarget } from './hooks/useShareTarget.js';
import { isNativePlatform, platformName, showToast } from './lib/native.js';

const DEMO_AUDIO_A = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3';
const DEMO_AUDIO_B = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3';
const demoCover = (h) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><radialGradient id='g' cx='30%' cy='30%'><stop offset='0%' stop-color='hsl(${h},60%,70%)'/><stop offset='100%' stop-color='hsl(${h+40},40%,15%)'/></radialGradient></defs><rect width='200' height='200' fill='url(%23g)'/></svg>`)}`;

// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  // Settings
  const [demoMode, setDemoMode] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Source / params
  const [source, setSource] = useState('suno');
  const [audioId, setAudioId] = useState('');
  const [uploaded, setUploaded] = useState(null);
  const [model, setModel] = useState('V5_5');
  const [callBackUrl, setCallBackUrl] = useState('');
  const [defaultParamFlag, setDefaultParamFlag] = useState(true);
  const [continueAt, setContinueAt] = useState(60);
  const [prompt, setPrompt] = useState('');
  const [styleField, setStyleField] = useState('');
  const [title, setTitle] = useState('');
  const [instrumental, setInstrumental] = useState(false);

  // Advanced
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [negativeTags, setNegativeTags] = useState('');
  const [vocalGender, setVocalGender] = useState('');
  const [styleWeight, setStyleWeight] = useState(0.65);
  const [weirdnessConstraint, setWeirdnessConstraint] = useState(0.5);
  const [audioWeight, setAudioWeight] = useState(0.65);
  const [personaId, setPersonaId] = useState('');
  const [personaModel, setPersonaModel] = useState('style_persona');

  // Task state
  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [toastMsg, setToastMsg] = useState(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [sharedFile, setSharedFile] = useState(null);

  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);
  const wasOfflineRef = useRef(false);

  // ─── Hooks ──────────────────────────────────────────────────────────
  const online = useNetworkStatus();
  const { isInstallable, install } = useInstallPrompt();
  const { updateAvailable, apply: applyUpdate } = useUpdatePrompt();
  useShareTarget(setSharedFile);

  const maxContinueAt = uploaded?.duration || 240;

  // ─── Load persisted state on mount ──────────────────────────────────
  useEffect(() => {
    (async () => {
      const [savedKey, hist, queue] = await Promise.all([
        getSetting('apiKey'),
        getAllHistory(),
        getQueuedSubmissions(),
      ]);
      if (savedKey) setApiKey(savedKey);
      if (hist) setHistory(hist);
      if (queue) setQueuedCount(queue.length);
    })();
  }, []);

  // ─── Persist API key ────────────────────────────────────────────────
  useEffect(() => {
    if (apiKey) setSetting('apiKey', apiKey);
  }, [apiKey]);

  // ─── If shared file arrived, switch to upload tab ───────────────────
  useEffect(() => {
    if (sharedFile) {
      setSource('upload');
      showToast('Audio received from share');
    }
  }, [sharedFile]);

  // ─── Replay queued submissions when coming back online ──────────────
  useEffect(() => {
    if (online && wasOfflineRef.current && !demoMode && apiKey) {
      replayQueue(apiKey).then((replayed) => {
        if (replayed.length > 0) {
          setToastMsg(`Replayed ${replayed.length} queued submission${replayed.length > 1 ? 's' : ''}`);
          getAllHistory().then(setHistory);
          getQueuedSubmissions().then(q => setQueuedCount(q.length));
        }
      });
    }
    wasOfflineRef.current = !online;
  }, [online, demoMode, apiKey]);

  // ─── Cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => () => cleanupPolling(), []);

  const cleanupPolling = () => {
    if (pollRef.current)  { clearInterval(pollRef.current);  pollRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startElapsedTimer = () => {
    startedAtRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
  };

  // ─── DEMO mode ──────────────────────────────────────────────────────
  const runDemo = useCallback(() => {
    const taskId = `demo_${Math.random().toString(36).slice(2, 14)}`;
    setTask({ taskId, status: 'PENDING', response: null });
    startElapsedTimer();
    let phase = 0;
    pollRef.current = setInterval(() => {
      phase++;
      if (phase === 1) setTask(t => t ? { ...t, status: 'GENERATING' } : t);
      else if (phase >= 6) {
        cleanupPolling();
        const sourceLabel = source === 'upload' ? uploaded?.fileName?.split('.')[0] : audioId.slice(0, 6);
        const finished = {
          taskId, status: 'SUCCESS', submittedAt: Date.now(),
          params: { source, audioId, uploadUrl: uploaded?.fileUrl, model, defaultParamFlag,
                    prompt, style: styleField, title, continueAt, callBackUrl, instrumental },
          response: { data: [
            { id: `${taskId}_a`, title: title || `${sourceLabel} · extended`,
              audio_url: DEMO_AUDIO_A, image_url: demoCover(210),
              tags: styleField || 'ambient', duration: 184.2 },
            { id: `${taskId}_b`, title: title || `${sourceLabel} · extended`,
              audio_url: DEMO_AUDIO_B, image_url: demoCover(230),
              tags: styleField || 'ambient', duration: 192.7 },
          ]},
        };
        setTask(finished);
        saveHistoryEntry(finished).then(() => getAllHistory().then(setHistory));
        setSubmitting(false);
      }
    }, 1200);
  }, [source, audioId, uploaded, model, defaultParamFlag, prompt, styleField, title, continueAt, callBackUrl, instrumental]);

  // ─── REAL mode ──────────────────────────────────────────────────────
  const runReal = useCallback(async () => {
    try {
      const isUpload = source === 'upload';
      const body = {
        defaultParamFlag, model, callBackUrl,
        ...(isUpload ? { uploadUrl: uploaded.fileUrl, instrumental } : { audioId }),
        ...(defaultParamFlag && {
          prompt, style: styleField, title, continueAt,
          ...(negativeTags && { negativeTags }),
          ...(vocalGender && { vocalGender }),
          ...(typeof styleWeight === 'number' && { styleWeight }),
          ...(typeof weirdnessConstraint === 'number' && { weirdnessConstraint }),
          ...(typeof audioWeight === 'number' && { audioWeight }),
          ...(personaId && { personaId, personaModel }),
        }),
      };

      // If offline → enqueue and bail out
      if (!online) {
        await enqueueSubmission({ type: isUpload ? 'upload-extend' : 'extend', body,
          params: { source, audioId, uploadUrl: uploaded?.fileUrl, model, defaultParamFlag,
                    prompt, style: styleField, title, continueAt, callBackUrl, instrumental } });
        const q = await getQueuedSubmissions();
        setQueuedCount(q.length);
        setSubmitting(false);
        setToastMsg('Queued — will submit when online');
        return;
      }

      const taskId = isUpload
        ? await submitUploadExtend(apiKey, body)
        : await submitExtend(apiKey, body);

      setTask({ taskId, status: 'PENDING', response: null });
      startElapsedTimer();

      pollRef.current = setInterval(async () => {
        try {
          const d = await fetchTaskStatus(apiKey, taskId);
          setTask(t => ({ ...t, ...d }));
          if (d.status === 'SUCCESS') {
            cleanupPolling();
            setSubmitting(false);
            const record = { ...d, submittedAt: Date.now(),
              params: { source, audioId, uploadUrl: uploaded?.fileUrl, model, defaultParamFlag,
                        prompt, style: styleField, title, continueAt, callBackUrl, instrumental } };
            await saveHistoryEntry(record);
            const updated = await getAllHistory();
            setHistory(updated);
          } else if (d.status === 'FAILED') {
            cleanupPolling();
            setError(d.errorMessage || 'Generation failed');
            setSubmitting(false);
          }
        } catch { /* keep polling */ }
      }, 5000);
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }, [online, apiKey, source, audioId, uploaded, defaultParamFlag, model, callBackUrl,
      instrumental, prompt, styleField, title, continueAt, negativeTags, vocalGender,
      styleWeight, weirdnessConstraint, audioWeight, personaId, personaModel]);

  const validate = () => {
    if (source === 'suno' && !audioId.trim()) return 'audioId required';
    if (source === 'upload' && !uploaded?.fileUrl) return 'upload audio file first';
    if (!callBackUrl.trim()) return 'callBackUrl required (use webhook.site for testing)';
    if (defaultParamFlag) {
      if (source === 'upload') {
        if (!styleField.trim()) return 'style required in custom mode';
        if (!title.trim()) return 'title required in custom mode';
        if (!instrumental && !prompt.trim()) return 'prompt required (used as exact lyrics)';
      } else {
        if (!prompt.trim()) return 'prompt required in custom mode';
        if (!styleField.trim()) return 'style required in custom mode';
        if (!title.trim()) return 'title required in custom mode';
        if (!continueAt || continueAt <= 0) return 'continueAt must be > 0';
      }
    }
    if (!demoMode && !apiKey.trim()) return 'enter Bearer token or enable demo mode';
    return null;
  };

  const submit = () => {
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    cleanupPolling();
    if (demoMode) runDemo(); else runReal();
  };

  const cancel = () => { cleanupPolling(); setTask(null); setSubmitting(false); setElapsed(0); };

  const fillDemo = () => {
    if (source === 'suno') setAudioId('e2310000-aaaa-bbbb-cccc-8cadc7dc1234');
    setCallBackUrl('https://webhook.site/your-unique-id');
    setContinueAt(uploaded?.duration ? Math.min(60, uploaded.duration - 10) : 60);
    setTitle('Midnight Reverie');
    setStyleField('ambient electronic, dreamy, cinematic');
    setPrompt('Continue with a soaring atmospheric section, layered synth pads, distant vocals, gradually building.');
  };

  const handleDeleteHistoryEntry = async (taskId) => {
    await deleteHistoryEntry(taskId);
    setHistory(await getAllHistory());
  };

  // Listen for web-fallback toasts
  useEffect(() => {
    const handler = (e) => setToastMsg(e.detail.message);
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, []);

  const statusMeta = task ? STATUS_META[task.status] || STATUS_META.GENERATING : null;
  const sourceReady = source === 'suno' ? !!audioId.trim() : !!uploaded;
  const StatusIcon = statusMeta && (
    task?.status === 'SUCCESS' ? CheckCircle2 :
    task?.status === 'FAILED'  ? AlertCircle :
    task?.status === 'PENDING' ? Loader2 : Radio
  );
  const native = isNativePlatform();

  return (
    <div className="min-h-screen w-full relative font-sans" style={{ background: T.bg, color: T.text }}>
      <StarField />

      {/* HEADER */}
      <header className={`relative z-10 border-b ${native ? 'safe-top' : ''}`} style={{ borderColor: T.border }}>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Music2 size={20} style={{ color: T.blue }} />
              <div className="absolute -inset-2 rounded-full" style={{ background: `radial-gradient(circle, ${T.blue}22, transparent 70%)` }} />
            </div>
            <div>
              <div className="text-[15px] tracking-[0.02em] font-serif font-medium">
                Extend<span style={{ color: T.blue }}>·</span>Suno
              </div>
              <div className="text-[9px] tracking-[0.3em] uppercase font-mono hidden sm:block" style={{ color: T.textMute }}>
                sunoapi.org · v5.5 · {native ? platformName() : 'pwa'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!online && <OfflineBadge queuedCount={queuedCount} />}

            <button onClick={() => setDemoMode(!demoMode)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] transition-all"
              style={{
                background: demoMode ? 'rgba(165,200,240,0.08)' : 'transparent',
                border: `1px solid ${demoMode ? T.borderHi : T.border}`,
                color: demoMode ? T.blue : T.textDim,
              }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{
                background: demoMode ? T.blue : T.textMute,
                boxShadow: demoMode ? `0 0 6px ${T.blue}` : 'none',
              }} />
              {demoMode ? 'demo' : 'live'}
            </button>

            {!demoMode && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md"
                style={{ background: T.bgInput, border: `1px solid ${T.border}` }}>
                <KeyRound size={12} style={{ color: T.textDim }} />
                <input type={showApiKey ? 'text' : 'password'} value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)} placeholder="bearer token"
                  className="bg-transparent outline-none text-[11px] w-36 font-mono" style={{ color: T.text }} />
                <button onClick={() => setShowApiKey(!showApiKey)} className="text-[9px]" style={{ color: T.textMute }}>
                  {showApiKey ? 'hide' : 'show'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* PWA banners */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-4 space-y-2">
        {isInstallable && !installDismissed && (
          <InstallBanner onInstall={install} onDismiss={() => setInstallDismissed(true)} />
        )}
        {updateAvailable && !updateDismissed && (
          <UpdateBanner onApply={applyUpdate} onDismiss={() => setUpdateDismissed(true)} />
        )}
      </div>

      {/* MAIN */}
      <main className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {/* Hero */}
        <div className="mb-8 sm:mb-12 max-w-2xl fade-up">
          <div className="text-[10px] tracking-[0.4em] uppercase mb-3 font-mono" style={{ color: T.blueDeep }}>
            ─── 01 / continuation
          </div>
          <h1 className="text-[32px] sm:text-[42px] leading-[1.05] tracking-[-0.02em] mb-3 font-serif font-light">
            Continue the song from a chosen <em style={{ color: T.blue, fontStyle: 'italic', fontWeight: 400 }}>moment</em>.
          </h1>
          <p className="text-[13px] sm:text-[14px] leading-relaxed max-w-lg" style={{ color: T.textDim }}>
            Pick an existing Suno track or upload your own audio — Suno extends it with two variant continuations using v5.5.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-4 sm:gap-6">
          {/* FORM */}
          <section className="col-span-12 lg:col-span-7 fade-up" style={{ animationDelay: '80ms' }}>
            <div className="rounded-xl p-4 sm:p-6" style={{ background: T.bgRaised, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Wand2 size={14} style={{ color: T.blue }} />
                  <span className="text-[11px] uppercase tracking-[0.25em]" style={{ color: T.textDim }}>extend parameters</span>
                </div>
                <button onClick={fillDemo} className="text-[10px] uppercase tracking-[0.2em] hover:underline" style={{ color: T.blueDeep }}>
                  fill demo →
                </button>
              </div>

              {/* SOURCE TABS */}
              <div className="mb-5">
                <div className="text-[10px] tracking-[0.3em] uppercase mb-2.5 font-mono" style={{ color: T.textMute }}>─── source</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setSource('suno'); setUploaded(null); }}
                    className="p-3.5 rounded-md text-left transition-all"
                    style={{ background: source === 'suno' ? T.bgCard : T.bgInput, border: `1px solid ${source === 'suno' ? T.borderHi : T.border}` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Music2 size={13} style={{ color: source === 'suno' ? T.blue : T.textDim }} />
                      <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: source === 'suno' ? T.blue : T.textDim }}>suno track</span>
                    </div>
                    <div className="text-[10px] leading-relaxed" style={{ color: T.textMute }}>
                      Continue an existing Suno-generated song by audioId
                    </div>
                  </button>
                  <button onClick={() => { setSource('upload'); setAudioId(''); }}
                    className="p-3.5 rounded-md text-left transition-all"
                    style={{ background: source === 'upload' ? T.bgCard : T.bgInput, border: `1px solid ${source === 'upload' ? T.borderHi : T.border}` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <FileAudio size={13} style={{ color: source === 'upload' ? T.blue : T.textDim }} />
                      <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: source === 'upload' ? T.blue : T.textDim }}>upload file</span>
                    </div>
                    <div className="text-[10px] leading-relaxed" style={{ color: T.textMute }}>
                      Upload your own audio (mp3, wav, etc.) to extend
                    </div>
                  </button>
                </div>
              </div>

              {/* SOURCE INPUT */}
              <div className="mb-5">
                {source === 'suno' ? (
                  <>
                    <Label required hint="uuid">audio id</Label>
                    <Input value={audioId} onChange={setAudioId} placeholder="e2310000-aaaa-bbbb-cccc-…" mono />
                  </>
                ) : (
                  <UploadPanel apiKey={apiKey} demoMode={demoMode} model={model}
                    uploaded={uploaded} onUploaded={setUploaded} onClear={() => setUploaded(null)}
                    initialFile={sharedFile} />
                )}
              </div>

              {/* MODE TOGGLE */}
              <div className="mb-6 flex items-center justify-between p-3 rounded-md" style={{ background: T.bgInput, border: `1px solid ${T.border}` }}>
                <div className="flex items-center gap-2.5">
                  <Settings2 size={13} style={{ color: T.blue }} />
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: T.text }}>parameter mode</div>
                    <div className="text-[10px] mt-0.5" style={{ color: T.textMute }}>
                      {defaultParamFlag ? 'override prompt, style, title, continueAt' : 'reuse all original audio parameters'}
                    </div>
                  </div>
                </div>
                <Segmented value={defaultParamFlag} onChange={setDefaultParamFlag}
                  options={[{ value: true, label: 'custom' }, { value: false, label: 'default' }]} />
              </div>

              {/* MODEL + CALLBACK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <Label required hint="match source">model</Label>
                  <Select value={model} onChange={setModel} options={[
                    { value: 'V5_5',     label: 'V5_5',     tag: 'recommended' },
                    { value: 'V5',       label: 'V5' },
                    { value: 'V4_5PLUS', label: 'V4_5PLUS' },
                    { value: 'V4_5ALL',  label: 'V4_5ALL', tag: source === 'upload' ? '≤1 min' : undefined },
                    { value: 'V4_5',     label: 'V4_5' },
                    { value: 'V4',       label: 'V4' },
                  ]} />
                </div>
                <div>
                  <Label required hint="webhook">callback url</Label>
                  <div className="relative">
                    <Webhook size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.textMute }} />
                    <input type="url" value={callBackUrl} onChange={(e) => setCallBackUrl(e.target.value)}
                      placeholder="https://your-server.com/callback"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-md text-[13px] outline-none transition-all duration-200 font-mono"
                      style={{ background: T.bgInput, border: `1px solid ${T.border}`, color: T.text }}
                      onFocus={(e) => { e.target.style.borderColor = T.borderHi; }}
                      onBlur={(e) => { e.target.style.borderColor = T.border; }} />
                  </div>
                </div>
              </div>

              {/* CUSTOM-MODE BLOCK */}
              <div className={`transition-all duration-300 ${defaultParamFlag ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                <div className="my-6 flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: T.border }} />
                  <span className="text-[9px] tracking-[0.3em] uppercase font-mono" style={{ color: T.textMute }}>custom parameters</span>
                  <div className="flex-1 h-px" style={{ background: T.border }} />
                </div>

                {source === 'upload' && (
                  <div className="mb-5 flex items-center justify-between p-3 rounded-md" style={{ background: T.bgInput, border: `1px solid ${T.border}` }}>
                    <div className="flex items-center gap-2.5">
                      <Mic2 size={13} style={{ color: instrumental ? T.textMute : T.blue }} />
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: T.text }}>
                          {instrumental ? 'instrumental' : 'with vocals'}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color: T.textMute }}>
                          {instrumental ? 'no lyrics required' : 'prompt is used as exact lyrics'}
                        </div>
                      </div>
                    </div>
                    <Segmented value={instrumental} onChange={setInstrumental}
                      options={[{ value: false, label: 'vocals' }, { value: true, label: 'instrumental' }]} />
                  </div>
                )}

                <div className="mb-5">
                  <Label required hint={uploaded?.duration ? `≤ ${fmtSec(uploaded.duration)}` : 'seconds'}>continue at</Label>
                  <Timeline value={continueAt} onChange={setContinueAt} max={maxContinueAt} disabled={!defaultParamFlag} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <Label required>title</Label>
                    <Input value={title} onChange={setTitle} placeholder="Untitled continuation" disabled={!defaultParamFlag} />
                  </div>
                  <div>
                    <Label required>style</Label>
                    <Input value={styleField} onChange={setStyleField} placeholder="ambient, cinematic" disabled={!defaultParamFlag} />
                  </div>
                </div>

                <div className="mb-5">
                  <Label required={!(source === 'upload' && instrumental)}
                    hint={source === 'upload' && !instrumental ? 'used as exact lyrics' : 'describe direction'}>
                    prompt
                  </Label>
                  <Textarea value={prompt} onChange={setPrompt} rows={4} disabled={!defaultParamFlag}
                    placeholder={source === 'upload' && !instrumental ? '[Verse]\nYour lyrics here…' :
                      'Describe how the song should continue — mood, instrumentation, energy…'} />
                </div>

                <button onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="w-full flex items-center justify-between py-3" style={{ borderTop: `1px solid ${T.border}` }}>
                  <div className="flex items-center gap-2">
                    <Sliders size={12} style={{ color: T.textDim }} />
                    <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: T.textDim }}>advanced controls</span>
                  </div>
                  <ChevronDown size={14} style={{ color: T.textDim, transform: advancedOpen ? 'rotate(180deg)' : '', transition: 'transform 200ms' }} />
                </button>

                {advancedOpen && (
                  <div className="pt-2 pb-2 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label hint="exclude styles"><span className="inline-flex items-center gap-1"><Ban size={10} /> negative tags</span></Label>
                        <Input value={negativeTags} onChange={setNegativeTags} placeholder="lo-fi, distorted" disabled={!defaultParamFlag} />
                      </div>
                      <div>
                        <Label hint="auto if empty"><span className="inline-flex items-center gap-1"><Mic2 size={10} /> vocal gender</span></Label>
                        <Select value={vocalGender} onChange={setVocalGender} disabled={!defaultParamFlag}
                          options={[{ value: '', label: 'auto' }, { value: 'm', label: 'male' }, { value: 'f', label: 'female' }]} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-1">
                      <WeightSlider value={styleWeight} onChange={setStyleWeight} label="style weight" hint="adherence to style" />
                      <WeightSlider value={weirdnessConstraint} onChange={setWeirdnessConstraint} label="weirdness" hint="creative deviation" />
                      <WeightSlider value={audioWeight} onChange={setAudioWeight} label="audio weight" hint="source influence" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <Label hint="optional">persona id</Label>
                        <Input value={personaId} onChange={setPersonaId} placeholder="persona_…" mono disabled={!defaultParamFlag} />
                      </div>
                      <div>
                        <Label>persona model</Label>
                        <Select value={personaModel} onChange={setPersonaModel} disabled={!defaultParamFlag || !personaId}
                          options={[
                            { value: 'style_persona', label: 'style_persona', tag: 'default' },
                            { value: 'voice_persona', label: 'voice_persona', tag: 'V5 only' },
                          ]} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="my-4 px-3.5 py-2.5 rounded-md text-[12px] flex items-start gap-2"
                  style={{ background: 'rgba(232,154,154,0.05)', border: '1px solid rgba(232,154,154,0.2)', color: T.danger }}>
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{error}
                </div>
              )}

              <button onClick={submit} disabled={submitting || !sourceReady}
                className="group relative w-full mt-6 py-3.5 rounded-md text-[12px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all duration-300 overflow-hidden disabled:cursor-not-allowed font-sans font-semibold"
                style={{
                  background: submitting || !sourceReady ? T.bgInput : `linear-gradient(135deg, ${T.blue}, ${T.blueDeep})`,
                  color:      submitting || !sourceReady ? T.textDim : T.bg,
                  border:    `1px solid ${submitting || !sourceReady ? T.border : T.blue}`,
                }}>
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" /><span>processing</span></>
                ) : !sourceReady ? (
                  <span>{source === 'upload' ? 'upload audio first' : 'enter audio id'}</span>
                ) : !online && !demoMode ? (
                  <span>queue while offline</span>
                ) : (
                  <><span>extend song</span><ChevronRight size={14} /></>
                )}
                {!submitting && sourceReady && (
                  <div className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                      background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                      backgroundSize: '200% 100%', animation: 'shimmer 3s infinite',
                    }} />
                )}
              </button>

              <div className="mt-3 text-[9px] tracking-[0.2em] uppercase text-center font-mono" style={{ color: T.textMute }}>
                POST · {source === 'upload' ? 'generate/upload-extend' : 'generate/extend'}
              </div>
            </div>
          </section>

          {/* RESULTS */}
          <section className="col-span-12 lg:col-span-5 space-y-4 sm:space-y-6 fade-up" style={{ animationDelay: '160ms' }}>
            {task ? (
              <div className="rounded-xl p-4 sm:p-6"
                style={{ background: T.bgRaised, border: `1px solid ${task.status === 'SUCCESS' ? 'rgba(134,199,176,0.25)' : T.borderHi}` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {StatusIcon && <StatusIcon size={14} style={{ color: statusMeta.color }}
                      className={task.status === 'PENDING' || task.status === 'GENERATING' ? 'animate-pulse' : ''} />}
                    <span className="text-[11px] uppercase tracking-[0.25em]" style={{ color: statusMeta.color }}>{statusMeta.label}</span>
                  </div>
                  {task.status !== 'SUCCESS' && task.status !== 'FAILED' && (
                    <button onClick={cancel} className="text-[10px] uppercase tracking-[0.2em] flex items-center gap-1" style={{ color: T.textMute }}>
                      <X size={11} /> cancel
                    </button>
                  )}
                </div>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: T.textMute }}>task</span>
                  <span className="text-[11px] truncate flex-1 font-mono" style={{ color: T.textDim }}>{task.taskId}</span>
                  {task.status !== 'SUCCESS' && task.status !== 'FAILED' && (
                    <span className="text-[11px] tabular-nums font-mono" style={{ color: T.blue }}>{fmtSec(elapsed)}</span>
                  )}
                </div>

                {task.status === 'SUCCESS' && task.response?.data ? (
                  <div className="space-y-3">
                    {task.response.data.map((s, i) => <SongCard key={s.id || i} song={s} index={i} />)}
                  </div>
                ) : task.status === 'FAILED' ? (
                  <div className="text-[12px]" style={{ color: T.danger }}>{task.errorMessage || 'Generation failed'}</div>
                ) : (
                  <>
                    <div className="mb-3"><Waveform active /></div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: T.textMute }}>
                        {task.status === 'PENDING' ? 'queued in suno pipeline' : 'generating two variants'}
                      </span>
                    </div>
                    <div className="relative h-[3px] rounded-full overflow-hidden" style={{ background: T.bgInput }}>
                      <div className="absolute h-full w-1/3"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${T.blue}, transparent)`,
                          animation: 'indeterminate 1.8s ease-in-out infinite',
                          boxShadow: `0 0 12px ${T.blue}`,
                        }} />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-xl p-8 text-center" style={{ background: T.bgRaised, border: `1px dashed ${T.border}` }}>
                <Sparkles size={20} className="mx-auto mb-3" style={{ color: T.textMute }} />
                <div className="text-[12px] mb-1" style={{ color: T.textDim }}>No active task</div>
                <div className="text-[11px] leading-relaxed" style={{ color: T.textMute }}>Configure parameters and submit to begin.</div>
              </div>
            )}

            {/* History */}
            <div className="rounded-xl p-5" style={{ background: T.bgRaised, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History size={13} style={{ color: T.textDim }} />
                  <span className="text-[11px] uppercase tracking-[0.25em]" style={{ color: T.textDim }}>history</span>
                </div>
                <span className="text-[10px] font-mono" style={{ color: T.textMute }}>{history.length}</span>
              </div>
              {history.length === 0 ? (
                <div className="text-[11px] py-4 text-center" style={{ color: T.textMute }}>
                  Completed extensions persist across app restarts (IndexedDB)
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {history.map((h, i) => (
                    <div key={h.taskId} className="rounded-md p-3 group"
                      style={{ background: T.bgCard, border: `1px solid ${T.border}` }}>
                      <button onClick={() => setTask(h)} className="w-full text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono" style={{ color: T.blueDeep }}>
                            {String(history.length - i).padStart(2, '0')} · {h.taskId.slice(0, 14)}…
                          </span>
                          <span className="text-[9px]" style={{ color: T.textMute }}>
                            {new Date(h.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[12px] truncate font-serif" style={{ color: T.text }}>
                          {h.params?.title || h.response?.data?.[0]?.title || 'Untitled extension'}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] mt-0.5" style={{ color: T.textMute }}>
                          <span className="px-1.5 py-0.5 rounded font-mono" style={{ background: T.bgInput }}>
                            {h.params?.source === 'upload' ? '↑ upload' : '◆ suno'}
                          </span>
                          <span className="truncate">{h.params?.style} · {h.params?.model}</span>
                        </div>
                      </button>
                      <button onClick={() => handleDeleteHistoryEntry(h.taskId)}
                        className="text-[9px] uppercase tracking-[0.2em] mt-2 hover:opacity-80"
                        style={{ color: T.textMute }}>
                        delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className={`mt-12 pt-6 flex items-center justify-between text-[10px] uppercase tracking-[0.25em] ${native ? 'safe-bottom' : ''}`}
          style={{ borderTop: `1px solid ${T.border}`, color: T.textMute }}>
          <span className="font-mono">sunoapi.org · v5.5</span>
          <span>{native ? 'capacitor android' : 'pwa · session+idb'}</span>
        </footer>
      </main>

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  );
}
