/**
 * Normaliza el método de pago para movimientos de caja y agregados en reportes.
 * Admin, cajero y APIs deben converger en los mismos slugs.
 *
 * @param {string|null|undefined} raw
 * @returns {'efectivo'|'tarjeta'|'transferencia'|'mercadopago'|'credito'|'otros'}
 */
function normalizeMedioPagoCaja(raw) {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!s) return 'efectivo';
  if (['efectivo', 'cash'].includes(s)) return 'efectivo';
  if (['tarjeta', 'debito', 'credito_tarjeta', 'card'].includes(s)) return 'tarjeta';
  if (['transferencia', 'transf', 'banco', 'cbu', 'alias'].includes(s)) return 'transferencia';
  if (
    ['mercadopago', 'mercado pago', 'mp', 'billetera', 'wallet', 'qr', 'mercado_pago'].includes(s) ||
    s.includes('mercado') && s.includes('pago')
  ) {
    return 'mercadopago';
  }
  if (['credito', 'cuenta corriente', 'cuenta_corriente', 'ctacte', 'fiado'].includes(s)) return 'credito';
  return 'otros';
}

module.exports = { normalizeMedioPagoCaja };
