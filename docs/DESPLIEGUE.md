# Despliegue a Firebase (NexoPOS DC)

Proyecto Firebase: **`nexopos-dc`**. Este documento describe cómo compilar y publicar **Hosting**, **Cloud Functions** (incluye la función HTTP `api` en Cloud Run), y el resto de recursos definidos en `firebase.json`.

## Requisitos previos

1. [Firebase CLI](https://firebase.google.com/docs/cli) instalado (`firebase --version`).
2. Sesión iniciada con una cuenta que tenga permisos en el proyecto:

   ```powershell
   firebase login
   ```

3. Dependencias instaladas en raíz, `functions/` y `client/`:

   ```powershell
   npm run install-all
   ```

## Qué se publica (`firebase.json`)

| Destino | Origen / comportamiento |
|---------|-------------------------|
| **Hosting** | Sitio `nexopos-dc`; carpeta estática `client/build`. |
| **Functions** | Código en `functions/`; `predeploy` ejecuta `npm --prefix functions run build`. La función `api` se sirve vía Cloud Run (2ª gen). |
| **Firestore** | Reglas `firestore.rules` e índices `firestore.indexes.json`. |
| **Storage** | Reglas `storage.rules`. |

URLs habituales de producción están en [billing-mercadopago.md](./billing-mercadopago.md#urls-de-producción-proyecto-nexopos-dc) (front, API, webhook).

## Build completo (cliente + functions)

Desde la **raíz** del repositorio:

```powershell
Set-Location "ruta\al\repo\nexopos-dc-multi-tenant"
npm run build
```

Esto ejecuta `client` → `npm run build` (React production) y `functions` → `npm run build` (TypeScript/JavaScript según el `package.json` de functions). El Hosting sirve **solo** `client/build`; conviene no omitir este paso antes de desplegar el front.

### Variables de entorno del cliente (build)

Definilas **antes** del build si las necesitás en producción (Create React App solo inyecta las que empiezan con `REACT_APP_`):

| Variable | Uso |
|----------|-----|
| `REACT_APP_MERCADOPAGO_SANDBOX` | Si es `true`, el checkout prioriza `sandbox_init_point` cuando exista (pruebas con credenciales de prueba de MP). |
| `REACT_APP_FIREBASE_FUNCTIONS_URL` / `REACT_APP_API_URL` | Opcional: override del API. Si **no** están definidas en el build de **producción**, el cliente usa la URL de Cloud Run por defecto (`api-…run.app`), no `localhost`. **No** compilar el hosting de producción con `.env.local` que apunte a emuladores o a `localhost` si otros usuarios van a usar `*.web.app`. |

El resto de la configuración de billing (precios, token en servidor) no va en el build del cliente; ver [billing-mercadopago.md](./billing-mercadopago.md).

### Firebase Auth: dominios autorizados

Si el login falla **solo** desde ciertos dominios (p. ej. custom domain o URL distinta a `nexopos-dc.web.app`), en [Firebase Console](https://console.firebase.google.com) → **Authentication** → **Settings** → **Authorized domains** agregá el host exacto del front (sin path).

## Desplegar todo

Desde la raíz del repo, con el proyecto por defecto ya en `.firebaserc` (`nexopos-dc`):

```powershell
firebase deploy --project nexopos-dc
```

Publica Hosting, Functions, reglas de Firestore y Storage, e índices de Firestore si hubo cambios. La primera vez o tras cambios grandes de índices, Firestore puede tardar hasta que los índices queden **en servicio** en la consola.

### Despliegue parcial (cuando no querés tocar reglas)

Solo front y API (caso típico tras cambios de código):

```powershell
firebase deploy --project nexopos-dc --only "hosting,functions"
```

Solo la función `api` (por ejemplo tras rotar el secreto `MERCADOPAGO_ACCESS_TOKEN`):

```powershell
firebase deploy --project nexopos-dc --only functions:api --force
```

## Secretos y billing

El token de Mercado Pago no se commitea: usá `scripts/mercadopago-secret.ps1` y redeploy de `api` si rotás el secreto. Detalle en [billing-mercadopago.md](./billing-mercadopago.md#configuración-en-el-servidor-recomendado-firebase-secrets).

## Verificación rápida post-deploy

```powershell
.\scripts\verify-billing-mp.ps1
```

O manualmente: `GET …/api/billing/mercadopago/public-config` y comprobar que el front carga en `https://nexopos-dc.web.app`.

## Historial de despliegues documentados

| Fecha | Notas |
|-------|--------|
| 2026-05-08 | Despliegue completo (`firebase deploy --project nexopos-dc`): Hosting `https://nexopos-dc.web.app`, Functions 2ª gen (`api`, `createTenant`, `joinTenant`, `setActiveTenant`, `apiSetupAdmin`, `bootstrapAdmin`), reglas Storage, reglas e índices Firestore. Incluye mejoras de Checkout MP (pagador, cuotas, redirección en misma ventana) y esta guía. |

*(Actualizá esta tabla cuando hagas releases relevantes.)*
