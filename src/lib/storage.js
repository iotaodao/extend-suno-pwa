// ─── IndexedDB persistence layer ──────────────────────────────────────────
// Two stores:
//   • history     — completed tasks (taskId, params, response, submittedAt)
//   • queue       — submissions made offline; replayed on reconnect via bg sync
// Survives across app restarts on both PWA and Capacitor (different DB engines
// underneath but same IDB API).
// ──────────────────────────────────────────────────────────────────────────

const DB_NAME = 'extend-suno-db';
const DB_VERSION = 1;

let dbPromise = null;

const openDB = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('history')) {
        const s = db.createObjectStore('history', { keyPath: 'taskId' });
        s.createIndex('submittedAt', 'submittedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  return dbPromise;
};

const tx = async (store, mode = 'readonly') => {
  const db = await openDB();
  return db.transaction(store, mode).objectStore(store);
};

// ─── History ────────────────────────────────────────────────────────────
export const saveHistoryEntry = async (entry) => {
  const store = await tx('history', 'readwrite');
  return new Promise((res, rej) => {
    const r = store.put(entry);
    r.onsuccess = () => res(entry);
    r.onerror   = () => rej(r.error);
  });
};

export const getAllHistory = async () => {
  const store = await tx('history');
  return new Promise((res, rej) => {
    const r = store.getAll();
    r.onsuccess = () => res(r.result.sort((a, b) => b.submittedAt - a.submittedAt));
    r.onerror   = () => rej(r.error);
  });
};

export const deleteHistoryEntry = async (taskId) => {
  const store = await tx('history', 'readwrite');
  return new Promise((res, rej) => {
    const r = store.delete(taskId);
    r.onsuccess = () => res();
    r.onerror   = () => rej(r.error);
  });
};

export const clearHistory = async () => {
  const store = await tx('history', 'readwrite');
  return new Promise((res, rej) => {
    const r = store.clear();
    r.onsuccess = () => res();
    r.onerror   = () => rej(r.error);
  });
};

// ─── Offline submission queue ────────────────────────────────────────────
export const enqueueSubmission = async (payload) => {
  const store = await tx('queue', 'readwrite');
  return new Promise((res, rej) => {
    const r = store.add({ payload, queuedAt: Date.now() });
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
};

export const getQueuedSubmissions = async () => {
  const store = await tx('queue');
  return new Promise((res, rej) => {
    const r = store.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
};

export const dequeueSubmission = async (id) => {
  const store = await tx('queue', 'readwrite');
  return new Promise((res, rej) => {
    const r = store.delete(id);
    r.onsuccess = () => res();
    r.onerror   = () => rej(r.error);
  });
};

// ─── Simple settings (api key, last used model, etc.) ────────────────────
export const getSetting = async (key) => {
  const store = await tx('settings');
  return new Promise((res, rej) => {
    const r = store.get(key);
    r.onsuccess = () => res(r.result?.value);
    r.onerror   = () => rej(r.error);
  });
};

export const setSetting = async (key, value) => {
  const store = await tx('settings', 'readwrite');
  return new Promise((res, rej) => {
    const r = store.put({ key, value });
    r.onsuccess = () => res();
    r.onerror   = () => rej(r.error);
  });
};
