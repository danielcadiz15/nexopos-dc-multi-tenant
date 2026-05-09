/**
 * URL de Checkout Pro: en sandbox (credenciales de prueba) suele existir solo `sandbox_init_point`.
 * En producción priorizamos `init_point`.
 */
export function getMercadoPagoCheckoutUrl(responseData) {
  const d = responseData?.data || responseData || {};
  const init = d.init_point;
  const sand = d.sandbox_init_point;
  const forceSandbox = String(process.env.REACT_APP_MERCADOPAGO_SANDBOX || '').toLowerCase() === 'true';
  if (forceSandbox && sand) return sand;
  if (init) return init;
  return sand || init || '';
}

/**
 * Abre Checkout en la **misma ventana** para que la sesión de Mercado Pago y las cookies funcionen bien
 * (en pestaña nueva a veces el botón «Pagar» queda deshabilitado hasta completar datos o por restricciones del navegador).
 */
export function goToMercadoPagoCheckout(url) {
  if (!url || typeof url !== 'string') return;
  window.location.assign(url);
}
