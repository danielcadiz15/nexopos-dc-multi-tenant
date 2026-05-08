# Licencias — Mercado Pago (abono mensual)

Integración server-side para cobrar la **licencia NexoPOS** en **ARS** y **extender automáticamente** el campo `paidUntil` (+1 mes por cada pago **aprobado**). Incluye:

- **Checkout Pro (preferencia)** — pago único por un mes.
- **Preapproval** — suscripción con débito recurrente mensual; cada cobro aprobado suma un mes vía webhook.
- **Webhook** — `POST/GET …/api/billing/mercadopago/webhook` (confirmación consultando `GET /v1/payments/:id`; idempotente con `billingMercadoPago/pay_<id>`).

## Requisitos

1. Cuenta [Mercado Pago](https://www.mercadopago.com.ar/developers) y **credenciales de producción** (access token).
2. **Firestore**: el backend escribe `companies/{orgId}/config/license`, `licenses/{orgId}`, `billingMercadoPago/*` y opcionalmente `platform/billing`.
3. **Cloud Functions / Cloud Run**: URL pública estable del API (ej. `https://…run.app/api`).

## Configuración en el servidor

| Variable / config | Descripción |
|-------------------|-------------|
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de la aplicación MP (Producción o Test). Preferir **secreto de entorno** en Firebase/Google Cloud. |
| Alternativa Firebase | `firebase functions:config:set mercadopago.access_token="APP_USR-..."` (legacy; el código lee `mercadopago.access_token`). |
| `LICENSE_MONTHLY_PRICE_ARS` | Fallback de precio si no hay doc en Firestore (opcional). |
| `PUBLIC_APP_URL` | Base del front para `back_urls` (default `https://nexopos-dc.web.app`). |
| `PUBLIC_API_BASE` | Base del API **sin** path final; se arma el webhook como `{PUBLIC_API_BASE}/api/billing/mercadopago/webhook`. |
| `MERCADOPAGO_WEBHOOK_URL` | Si se define, **reemplaza** el armado automático del webhook (URL completa). |

## Precio mensual (operación)

- **Panel super admin** (`/admin`): tarjeta *Licencias — precio Mercado Pago* → escribe `platform/billing.monthlyPriceARS`.
- O variable `LICENSE_MONTHLY_PRICE_ARS` en el entorno de Functions.

Sin precio `> 0` o sin token MP, los botones en **Configuración → Licencia** quedan deshabilitados con mensaje claro.

## Webhook en Mercado Pago

En [Tus integraciones → Webhooks](https://www.mercadopago.com.ar/developers/panel/app) configurá la URL:

`https://<TU_HOST_API>/api/billing/mercadopago/webhook`

Recomendado suscribir notificaciones de **Pagos** (`payment`). El handler acepta **POST** (cuerpo JSON) y **GET** (`?topic=payment&id=…`) por compatibilidad.

## Flujo cliente (UI)

1. **Configuración empresa** → **Licencia** → *Pagar 1 mes* o *Suscripción mensual automática*.
2. Se abre Mercado Pago en nueva pestaña; al volver, la app muestra toasts según `?mp=` en la URL.
3. La extensión de licencia ocurre cuando MP notifica y el pago figura **approved** (puede demorar segundos).

## Seguridad

- No se confía en el cuerpo del webhook a ciegas: se **relee el pago** con `GET /v1/payments/:id` usando el access token.
- Cada `payment_id` se aplica **una sola vez** (transacción Firestore + doc `billingMercadoPago/pay_<id>`).

## Endpoints internos

| Método | Ruta | Auth | Uso |
|--------|------|------|-----|
| GET | `/api/billing/mercadopago/public-config` | No | Precio y si MP está configurado. |
| POST | `/api/billing/mercadopago/preference` | Bearer + `orgId` | Crea preferencia Checkout. |
| POST | `/api/billing/mercadopago/preapproval` | Bearer + `orgId` + email usuario | Crea preaprobación mensual. |
| POST/GET | `/api/billing/mercadopago/webhook` | No (MP) | Notificaciones. |
| GET/PUT | `/api/admin/platform/billing` | Super admin email | Leer/escribir precio global. |

## Archivos relevantes

- `functions/routes/billing-mercadopago.routes.js` — lógica MP + extensión de licencia.
- `functions/index.js` — registro de rutas `/billing` y `/admin/platform/billing`.
- `client/src/services/billing.service.js` — llamadas desde el front.
- `client/src/pages/configuracion/configuracionempresa.js` — modal Licencia.
- `client/src/pages/admin/AdminPanel.js` — precio mensual.

## Notas

- En **sandbox** de MP, usar credenciales de prueba y `sandbox_init_point` si el SDK/respuesta lo expone; el front prioriza `init_point` y cae a `sandbox_init_point`.
- Preapproval puede exigir condiciones comerciales/habilitaciones según la cuenta MP; si falla, el flujo de **un mes** (preferencia) sigue siendo válido.
- Monto y moneda actualmente fijados en **ARS** (`currency_id: ARS`).
