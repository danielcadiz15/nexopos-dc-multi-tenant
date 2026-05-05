/**
 * Evaluación de licencia: período activo, gracia 24h post-vencimiento, bloqueo total.
 */

const GRACE_MS = 24 * 60 * 60 * 1000;

function paidUntilToMillis(paidUntil) {
  if (paidUntil == null || paidUntil === '') return null;
  try {
    if (typeof paidUntil.toDate === 'function') {
      const d = paidUntil.toDate();
      const ms = d.getTime();
      return Number.isFinite(ms) ? ms : null;
    }
    if (typeof paidUntil === 'object' && typeof paidUntil._seconds === 'number') {
      return paidUntil._seconds * 1000 + Math.floor((paidUntil._nanoseconds || 0) / 1e6);
    }
    const ms = new Date(paidUntil).getTime();
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

/**
 * Ventas (crear/editar/pagos) = facturación. GET permitido en gracia.
 */
function isFacturacionRequest(method, path) {
  const m = (method || '').toUpperCase();
  if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return false;
  const p = path || '';
  return p.startsWith('/ventas');
}

/**
 * @param {object|null} lic — doc license desde Firestore
 * @returns {{ phase: string, blocked?: boolean, graceEndsAt?: number, paidUntilMs?: number }}
 */
function evaluateLicenseState(lic) {
  if (!lic || typeof lic !== 'object' || Object.keys(lic).length === 0) {
    return { phase: 'none' };
  }
  if (lic.blocked === true) {
    return { phase: 'blocked', blocked: true };
  }
  const until = paidUntilToMillis(lic.paidUntil);
  if (until == null) {
    return { phase: 'none' };
  }
  const now = Date.now();
  if (now <= until) {
    return { phase: 'active', paidUntilMs: until };
  }
  const graceEnd = until + GRACE_MS;
  if (now <= graceEnd) {
    return { phase: 'grace', graceEndsAt: graceEnd, paidUntilMs: until };
  }
  return { phase: 'expired', paidUntilMs: until, graceEndsAt: graceEnd };
}

module.exports = {
  GRACE_MS,
  paidUntilToMillis,
  evaluateLicenseState,
  isFacturacionRequest
};
