const DEVICE_KEY = 'nexo_device_id';
const SESSION_KEY = 'nexo_session_id';
const SESSION_STARTED_AT_KEY = 'nexo_session_started_at_ms';

function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage no disponible
  }
}

function safeStorageRemove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // storage no disponible
  }
}

function randomId(prefix) {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
  } catch {
    // fallback
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ensureDeviceId() {
  const existing = safeStorageGet(DEVICE_KEY);
  if (existing) return existing;
  const next = randomId('dev');
  safeStorageSet(DEVICE_KEY, next);
  return next;
}

export function ensureSessionId() {
  const existing = safeStorageGet(SESSION_KEY);
  if (existing) {
    const started = safeStorageGet(SESSION_STARTED_AT_KEY);
    if (!started) safeStorageSet(SESSION_STARTED_AT_KEY, String(Date.now()));
    return existing;
  }
  const next = randomId('ses');
  safeStorageSet(SESSION_KEY, next);
  safeStorageSet(SESSION_STARTED_AT_KEY, String(Date.now()));
  return next;
}

export function rotateSessionId() {
  const next = randomId('ses');
  safeStorageSet(SESSION_KEY, next);
  safeStorageSet(SESSION_STARTED_AT_KEY, String(Date.now()));
  return next;
}

export function clearSessionId() {
  safeStorageRemove(SESSION_KEY);
  safeStorageRemove(SESSION_STARTED_AT_KEY);
}

export function getSessionStartedAtMs() {
  const raw = safeStorageGet(SESSION_STARTED_AT_KEY);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    const now = Date.now();
    safeStorageSet(SESSION_STARTED_AT_KEY, String(now));
    return now;
  }
  return n;
}
