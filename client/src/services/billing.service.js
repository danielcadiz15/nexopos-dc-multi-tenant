import ApiService from './api.service';

const api = new ApiService('/billing/mercadopago');

/**
 * Precio mensual y si MP está configurado en el servidor (token + precio).
 */
export async function getBillingPublicConfig() {
  const { data, status } = await api.get('/public-config');
  return { data, status };
}

/** Checkout Pro — un mes; abre init_point en nueva pestaña. */
export async function createLicenseMercadoPagoPreference() {
  return api.post('/preference', {});
}

/** Suscripción con débito automático mensual (preapproval). */
export async function createLicenseMercadoPagoPreapproval() {
  return api.post('/preapproval', {});
}
