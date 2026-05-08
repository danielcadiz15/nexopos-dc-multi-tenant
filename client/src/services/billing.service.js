import ApiService from './api.service';

const api = new ApiService('/billing/mercadopago');

/**
 * Precio mensual y si MP está configurado en el servidor (token + precio).
 */
export async function getBillingPublicConfig() {
  const { data, status } = await api.get('/public-config');
  return { data, status };
}

/** Checkout Pro — un mes; `plan` = basic | intermediate | premium (default: plan de la empresa). */
export async function createLicenseMercadoPagoPreference(body = {}) {
  return api.post('/preference', body);
}

/** Suscripción con débito automático mensual (preapproval). */
export async function createLicenseMercadoPagoPreapproval(body = {}) {
  return api.post('/preapproval', body);
}
