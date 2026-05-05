/** Debe coincidir con functions/licenseHelpers.js (24 h post-vencimiento). */
export const LICENSE_GRACE_MS = 24 * 60 * 60 * 1000;

function paidUntilToMs(raw) {
  if (raw == null || raw === '') return null;
  try {
    if (typeof raw.toDate === 'function') {
      const d = raw.toDate();
      const ms = d.getTime();
      return Number.isFinite(ms) ? ms : null;
    }
    if (typeof raw === 'object' && typeof raw._seconds === 'number') {
      return raw._seconds * 1000 + Math.floor((raw._nanoseconds || 0) / 1e6);
    }
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

/**
 * @returns {{ phase: 'none'|'active'|'grace'|'expired'|'blocked', graceEndsAt?: number, paidUntilMs?: number, pagoUrl?: string|null }}
 */
export function evaluateLicenseUiState(lic) {
  if (!lic || typeof lic !== 'object') {
    return { phase: 'none' };
  }
  const pagoUrl = lic.pagoBilleteraUrl || lic.pago_billetera_url || null;
  if (lic.blocked === true) {
    return { phase: 'blocked', pagoUrl };
  }
  const until = paidUntilToMs(lic.paidUntil);
  if (until == null) {
    return { phase: 'none', pagoUrl };
  }
  const now = Date.now();
  if (now <= until) {
    return { phase: 'active', paidUntilMs: until, pagoUrl };
  }
  const graceEnd = until + LICENSE_GRACE_MS;
  if (now <= graceEnd) {
    return { phase: 'grace', graceEndsAt: graceEnd, paidUntilMs: until, pagoUrl };
  }
  return { phase: 'expired', graceEndsAt: graceEnd, paidUntilMs: until, pagoUrl };
}

export function formatGraceCountdown(graceEndsAtMs) {
  if (!graceEndsAtMs) return '';
  const sec = Math.max(0, Math.floor((graceEndsAtMs - Date.now()) / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h} h ${m} min`;
}
