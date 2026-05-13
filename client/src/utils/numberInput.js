/**
 * Helpers para inputs numéricos controlados: permitir vacío mientras se edita
 * y convertir a número solo al calcular o enviar.
 */

export function numberOrZero(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Valor mostrado en input (null/undefined → cadena vacía). */
export function numberInputDisplay(value) {
  if (value === null || value === undefined) return '';
  return value;
}
