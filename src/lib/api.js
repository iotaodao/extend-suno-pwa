// ─── Suno API client ──────────────────────────────────────────────────────
// Centralizes all calls to sunoapi.org. Background sync replays POSTs that
// failed offline.
// ──────────────────────────────────────────────────────────────────────────

import { dequeueSubmission, getQueuedSubmissions, saveHistoryEntry } from './storage.js';

export const API = {
  GEN:    'https://api.sunoapi.org/api/v1',
  UPLOAD: 'https://sunoapiorg.redpandaai.co',
};

const headers = (apiKey, json = true) => ({
  'Authorization': `Bearer ${apiKey}`,
  ...(json ? { 'Content-Type': 'application/json' } : {}),
});

// ─── Submit extend (existing audioId) ────────────────────────────────────
export const submitExtend = async (apiKey, body) => {
  const res = await fetch(`${API.GEN}/generate/extend`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(data.msg || `HTTP ${res.status}`);
  return data.data.taskId;
};

// ─── Submit upload-extend (own file via uploadUrl) ───────────────────────
export const submitUploadExtend = async (apiKey, body) => {
  const res = await fetch(`${API.GEN}/generate/upload-extend`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(data.msg || `HTTP ${res.status}`);
  return data.data.taskId;
};

// ─── File upload (multipart stream) ──────────────────────────────────────
// Returns a promise that resolves to { fileUrl, fileId, ... }. Progress is
// reported through onProgress(percent).
export const uploadFile = (apiKey, file, { onProgress, signal } = {}) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API.UPLOAD}/api/file-stream-upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.floor((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res?.data?.fileUrl) resolve(res.data);
        else reject(new Error(res.msg || `Upload failed (HTTP ${xhr.status})`));
      } catch {
        reject(new Error('Invalid response'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new Error('Upload cancelled'));
    if (signal) signal.addEventListener('abort', () => xhr.abort());

    const fd = new FormData();
    fd.append('file', file);
    fd.append('uploadPath', 'extend-source');
    fd.append('fileName', `extend-${Date.now()}-${file.name}`);
    xhr.send(fd);
  });

// ─── Poll task status ────────────────────────────────────────────────────
export const fetchTaskStatus = async (apiKey, taskId) => {
  const res = await fetch(
    `${API.GEN}/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
    { headers: headers(apiKey, false) }
  );
  const j = await res.json();
  if (j.code !== 200) throw new Error(j.msg || `HTTP ${res.status}`);
  return j.data; // { taskId, status, response?, errorMessage? }
};

// ─── Replay queued submissions when back online ──────────────────────────
// Called by NetworkStatus hook when navigator.onLine flips to true.
export const replayQueue = async (apiKey) => {
  const queued = await getQueuedSubmissions();
  const replayed = [];
  for (const item of queued) {
    try {
      const { type, body, params } = item.payload;
      const taskId = type === 'upload-extend'
        ? await submitUploadExtend(apiKey, body)
        : await submitExtend(apiKey, body);
      await saveHistoryEntry({
        taskId, status: 'PENDING', submittedAt: Date.now(), params, queued: true,
      });
      await dequeueSubmission(item.id);
      replayed.push(taskId);
    } catch (e) {
      console.warn('[Queue] replay failed for item', item.id, e);
      // leave in queue for next attempt
      break;
    }
  }
  return replayed;
};
