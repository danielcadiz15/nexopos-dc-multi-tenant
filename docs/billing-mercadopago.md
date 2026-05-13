# Licencias — Mercado Pago (abono mensual)

Integración server-side para cobrar la **licencia NexoPOS** en **ARS** y **extender automáticamente** el campo `paidUntil` (**30 días** por cada pago **aprobado**, anclados a `date_approved` de MP, no un mes calendario). Incluye:

- **Checkout Pro (preferencia)** — pago único que suma 30 días de vigencia.
- **Preapproval** — suscripción con débito recurrente; cada cobro aprobado suma 30 días vía webhook.
- **Webhook** — `POST/GET …/api/billing/mercadopago/webhook` (confirmación consultando `GET /v1/payments/:id`; idempotente con `billingMercadoPago/pay_<id>`).

## Requisitos

1. Cuenta [Mercado Pago](https://www.mercadopago.com.ar/developers) y **credenciales de producción** (access token).
2. **Firestore**: el backend escribe `companies/{orgId}/config/license`, `licenses/{orgId}`, `billingMercadoPago/*` y opcionalmente `platform/billing`.
3. **Cloud Functions / Cloud Run**: URL pública estable del API (ej. `https://…run.app/api`).

## Configuración en el servidor (recomendado: Firebase Secrets)

La función **`api`** usa **`defineSecret('MERCADOPAGO_ACCESS_TOKEN')`**: el token vive en **Google Secret Manager** y Firebase inyecta el valor en tiempo de ejecución.

### Cómo cargar el token real (Mercado Pago → Credenciales de producción → Access Token)

Desde la raíz del repo, **sin pegar el token en el código**:

```powershell
$env:MERCADOPAGO_ACCESS_TOKEN = "APP_USR-xxxx"   # tu token real
.\scripts\mercadopago-secret.ps1
```

O un archivo `./secrets/mercadopago-token.txt` con **una línea** (está en `.gitignore):

```powershell
.\scripts\mercadopago-secret.ps1 -TokenFile ".\secrets\mercadopago-token.txt"
```

El comando `firebase functions:secrets:set … --force` crea una **nueva versión** del secreto; tras unos minutos Cloud Run usará esa versión (o redeploy menor de `api` si hiciera falta).

### Fallback (solo si trabajás sin Secrets)

Si en algún momento asignás `process.env.MERCADOPAGO_ACCESS_TOKEN` desde Cloud Run, el mismo código también lo contempla después de leer el secreto.

| Variable / config | Descripción |
|-------------------|-------------|
| `MERCADOPAGO_ACCESS_TOKEN` | Access token MP; **prioridad**: secreto Firebase `MERCADOPAGO_ACCESS_TOKEN`, luego variable de entorno en Cloud Run. |
| `LICENSE_MONTHLY_PRICE_ARS` | Fallback solo para precio **Básica** si no hay `planPrices.basic` en Firestore (opcional). |
| `PUBLIC_APP_URL` | Base del front para `back_urls` (default `https://nexopos-dc.web.app`). |
| `PUBLIC_API_BASE` | Base del API **sin** path final; se arma el webhook como `{PUBLIC_API_BASE}/api/billing/mercadopago/webhook`. |
| `MERCADOPAGO_WEBHOOK_URL` | Si se define, **reemplaza** el armado automático del webhook (URL completa). |

## Precios por plan (operación)

Hay **tres planes** con precio mensual independiente en **ARS**:

| Plan (Firestore / API) | Etiqueta UI |
|------------------------|-------------|
| `basic` | Básica |
| `intermediate` | Intermedia |
| `premium` | Premium |

- **Firestore** `platform/billing.planPrices`: objeto `{ basic, intermediate, premium }` (números ≥ 0).
- **Defaults comerciales** si no hay configuración guardada: Básica `$80.000`, Intermedia `$120.000`, Premium `$180.000`.
- **Compatibilidad**: si solo existe `monthlyPriceARS` (dato viejo), se usa como precio de **Básica** y se refleja en `planPrices.basic` al guardar desde admin.
- **Panel super admin** (`/admin`): tarjeta *Licencias — precios por plan* → guarda los tres valores.
- Variable **`LICENSE_MONTHLY_PRICE_ARS`** en Functions sigue siendo solo **fallback para Básica** si no hay `planPrices.basic` en Firestore.

**Checkout y suscripción** usan el plan de la empresa (`companies/.../config/license.plan`) o el plan elegido en el modal **Configuración → Licencia**, y cobran el monto de `planPrices` correspondiente.
Si ese plan tiene precio 0, los botones de pago quedan deshabilitados aunque otro plan sí tenga precio.

## Flujo nuevas empresas: kit + abono

El modelo comercial para nuevas empresas es:

1. En el alta se elige el abono futuro (`chosenPlan`): Básica, Intermedia o Premium.
2. Los dos primeros pagos son cuotas fijas del **kit inicial**: `$250.000` cada una (`onboardingInstallmentsTotal = 2`, `onboardingInstallmentAmountARS = 250000`).
3. Durante esas cuotas, la licencia opera con versión completa (`plan = premium`) para instalación, carga inicial y capacitación.
4. Desde el tercer pago, Mercado Pago cobra el valor del `chosenPlan` y el webhook aplica el preset de módulos correspondiente.

La empresa no necesita que un superadmin cambie el plan manualmente después del alta; el plan elegido queda persistido en `companies/{orgId}/config/license.chosenPlan` y `licenses/{orgId}.chosenPlan`.

Los valores históricos de plan **`pro`** y **`enterprise`** se normalizan a **Intermedia** y **Premium** al leer/guardar.

## Webhook en Mercado Pago

En [Tus integraciones → Webhooks](https://www.mercadopago.com.ar/developers/panel/app) configurá la URL:

`https://<TU_HOST_API>/api/billing/mercadopago/webhook`

Recomendado suscribir notificaciones de **Pagos** (`payment`). El handler acepta **POST** (cuerpo JSON) y **GET** (`?topic=payment&id=…`) por compatibilidad.

## Flujo cliente (UI)

1. **Configuración empresa** → **Licencia** → *Renovar* con Mercado Pago.
2. El checkout se abre en la **misma ventana** (mejor sesión MP y menos casos de botón «Pagar» deshabilitado por cookies entre pestañas). Con **tarjeta**, en Argentina suele hacer falta elegir **cuotas** y completar **titular y DNI** antes de que se habilite pagar.
3. Al volver, MP redirige al **inicio** (`/?mp=approved|failure|pending` o `?mp=sub_return` tras preapproval). Un modal global muestra el resultado y se limpia la query.
4. La extensión de licencia ocurre cuando MP notifica y el pago figura **approved** (puede demorar segundos); la barra de licencia se refresca al volver y de nuevo a los pocos segundos.

Variable opcional en el build del cliente: `REACT_APP_MERCADOPAGO_SANDBOX=true` para priorizar `sandbox_init_point` cuando probás con credenciales de prueba.

## Licencia sin `paidUntil` (sin pago registrado)

Si la empresa **no tiene** fecha `paidUntil` válida en `companies/.../config/license` (o `licenses/...`):

1. En el **primer** `checkLicense` que ejecute la API, se guarda `unpaidGraceStartedAt` (Firestore) y arrancan **24 h de cortesía**.
2. Durante esas 24 h el usuario puede usar el sistema **salvo registrar ventas nuevas** (misma regla que la gracia post-vencimiento).
3. Pasadas las 24 h sin pago, las rutas protegidas responden **402** con mensaje claro; el usuario puede **pagar desde la barra de licencia** o **Configuración → Licencia** (las rutas `/billing/mercadopago/*` no exigen licencia paga).
4. Un pago aprobado por MP **borra** `unpaidGraceStartedAt` y define `paidUntil`.

La barra superior de la app muestra siempre **plan**, **estado / días o cuenta regresiva** y el botón **Pagar con Mercado Pago** cuando corresponde.

## Seguridad

- No se confía en el cuerpo del webhook a ciegas: se **relee el pago** con `GET /v1/payments/:id` usando el access token.
- Cada `payment_id` se aplica **una sola vez** (transacción Firestore + doc `billingMercadoPago/pay_<id>`).

## Endpoints internos

| Método | Ruta | Auth | Uso |
|--------|------|------|-----|
| GET | `/api/billing/mercadopago/public-config` | No | `planPrices`, `monthlyPriceARS` (espejo Básica), flags MP. |
| POST | `/api/billing/mercadopago/preference` | Bearer + `orgId` | Body opcional `{ "plan": "basic" \| "intermediate" \| "premium" }` (default: plan de la empresa). |
| POST | `/api/billing/mercadopago/preapproval` | Bearer + `orgId` + email usuario | Igual, body opcional `plan`. Guarda `mercadopagoBillingPlan` en la licencia. |
| POST/GET | `/api/billing/mercadopago/webhook` | No (MP) | Notificaciones. |
| GET/PUT | `/api/admin/platform/billing` | Super admin email | GET: `planPrices` + `monthlyPriceARS`. PUT: `{ planPrices: { basic, intermediate, premium } }` y/o `monthlyPriceARS` (solo Básica). |

## Archivos relevantes

- `functions/routes/billing-mercadopago.routes.js` — lógica MP + extensión de licencia.
- `functions/utils/planTiers.js` — normalización de IDs de plan (basic / intermediate / premium).
- `functions/index.js` — registro de rutas `/billing` y `/admin/platform/billing`.
- `client/src/utils/planTiers.js` — misma semántica de planes en el front (mantener alineado con Functions).
- `client/src/services/billing.service.js` — llamadas desde el front.
- `client/src/components/billing/MercadoPagoReturnHandler.js` — modal de retorno MP (query `?mp=`).
- `client/src/pages/configuracion/configuracionempresa.js` — modal Licencia.
- `client/src/pages/admin/AdminPanel.js` — precio mensual.

## URLs de producción (proyecto `nexopos-dc`)

| Recurso | URL |
|--------|-----|
| Front (Hosting) | `https://nexopos-dc.web.app` |
| API Cloud Run (`api`) | `https://api-5q2i5764zq-uc.a.run.app` |
| Webhook (pegar en MP Developers) | `https://api-5q2i5764zq-uc.a.run.app/api/billing/mercadopago/webhook` |
| `public-config` (smoke test) | `https://api-5q2i5764zq-uc.a.run.app/api/billing/mercadopago/public-config` |

Si en el futuro cambia el host de Cloud Run, actualizá el webhook en Mercado Pago y, si aplica, `PUBLIC_API_BASE` / `MERCADOPAGO_WEBHOOK_URL` en el entorno de la función.

## Checklist de puesta en marcha

Para compilar y subir **Hosting + Functions + reglas**, seguí la guía **[Despliegue a Firebase](./DESPLIEGUE.md)**.

1. **Secreto** `MERCADOPAGO_ACCESS_TOKEN` en Google Secret Manager (vía `scripts/mercadopago-secret.ps1` o consola Firebase).
2. **Redeploy** de `functions:api` tras rotar el secreto (`firebase deploy --only functions:api --project nexopos-dc --force`).
3. **Precios** `platform/billing.planPrices` (Básica / Intermedia / Premium): al menos uno mayor que cero; **o** solo `monthlyPriceARS` legacy (equivale a Básica); **o** `LICENSE_MONTHLY_PRICE_ARS` en Cloud Run como fallback de Básica.
4. **Webhook** en [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel/app): misma URL de la tabla, eventos de **payment**.
5. **Prueba manual**: en una empresa, **Configuración → Licencia** → pago; tras aprobar, revisar `paidUntil` (≈30 días desde acreditación o apilado sobre vigencia previa) en `companies/{orgId}/config/license` y doc idempotente `billingMercadoPago/pay_<paymentId>`.

## Verificación automática (smoke tests)

Desde PowerShell en la raíz del repo:

```powershell
.\scripts\verify-billing-mp.ps1
```

Equivalente con `curl` (no envía credenciales):

```bash
curl -sS "https://api-5q2i5764zq-uc.a.run.app/api/billing/mercadopago/public-config"
curl -sS -o /dev/null -w "%{http_code}\n" "https://api-5q2i5764zq-uc.a.run.app/api/billing/mercadopago/webhook"
```

### Respuesta de `public-config`

| Campo | Significado |
|-------|----------------|
| `planPrices` | `{ basic, intermediate, premium }` desde `platform/billing`. |
| `monthlyPriceARS` | Espejo del precio **Básica** (compatibilidad con clientes viejos). |
| `mercadoPagoTokenPresent` | El servidor tiene access token (secreto o env). |
| `mercadoPagoConfigured` | Token y **al menos un** plan con precio mayor a cero. |

El webhook responde **200** y cuerpo `OK` incluso sin `payment_id` (MP puede hacer pings de prueba); el procesamiento ocurre en segundo plano cuando hay id.

## Resolución de problemas

- **Botones de licencia deshabilitados**: `mercadoPagoConfigured` es `false` → subí precio en `/admin` o variable de entorno; verificá `mercadoPagoTokenPresent`.
- **En la web de Mercado Pago el botón «Pagar» sigue gris**: casi siempre es **validación del medio elegido** (tarjeta: número, vencimiento, CVV, **titular**, **DNI**, **cuotas**; dinero en cuenta: **iniciar sesión** en MP). Además, la preferencia **no debe mandar datos de pagador inventados** (apellido genérico o nombre sin apellido): el backend arma `payer` solo con email y, si existen en `companies/.../usuarios`, **nombre + apellido** y DNI/CUIT opcional; el resto lo completa el comprador en MP.
- **Webhook no extiende licencia**: confirmá URL en MP, notificaciones `payment`, y en logs de Cloud Run búsquedas `[MP]` / `[MP webhook]`. El pago debe quedar `approved` y traer `org_id` en metadata o `external_reference` con el `orgId`.
- **Cambié el token**: nueva versión del secreto + redeploy de `api`.

## Notas

- En **sandbox** de MP, usar credenciales de prueba y `sandbox_init_point` si el SDK/respuesta lo expone; el front prioriza `init_point` y cae a `sandbox_init_point`.
- Preapproval puede exigir condiciones comerciales/habilitaciones según la cuenta MP; si falla, el flujo de **un mes** (preferencia) sigue siendo válido.
- Monto y moneda actualmente fijados en **ARS** (`currency_id: ARS`).
