# Contexto vivo — NexoPOS DC (`nexopos-dc-multi-tenant`)

Este archivo es **puente entre sesiones** (vos, otro desarrollador o el asistente).  
**Actualizarlo** cuando haya trabajo relevante: qué cambió, cómo probarlo, comandos y pendientes.

---

## Última actualización resumida (sesión más reciente — 2026-05-08)

| Tema | Qué se hizo |
|------|----------------|
| **Deploy + doc + revisión funcional** | Se ejecutó **`npm run build`**: compilación OK (solo ESLint/source map/Browserslist como antes). Doc ampliado en **`docs/cambios-pos-verificacion-admin-2026.md`** (§9 balanza EAN13, §10 offline/cola, §11 checklist deploy). **`.gitignore`**: carpeta **`backups/`** ignorada. Push a **`origin/main`** y **`firebase deploy --only hosting,functions`** (con timeout de discovery ampliado si hace falta). |
| **POS móvil — balanza EAN13** | En `MobilePuntoVenta.js`: etiquetas peso variable prefijo 20–29, cantidad desde gramos, líneas separadas con `producto_id`/`codigo_balanza`. Commit **`88684fb`**. |

### Histórico inmediato (mismo día, commit anterior)

| Tema | Qué se hizo |
|------|----------------|
| **Caja móvil offline** | Cola en `localStorage`, sync al volver online, flujo venta con confirmación ante stock superado / negativo. Commit del **2026-05-08** (mensaje feat caja offline). |

### Sesiones anteriores (contexto Wizard / API empresa)

| Tema | Qué se hizo |
|------|----------------|
| **Wizard interactivo primera configuración** | Con empresa creada (`orgId`) y datos vacíos, la pantalla ahora abre un asistente de 4 pasos (identidad, fiscal, dirección/contacto, facturación/logo) con barra de progreso, validaciones por paso y CTA final de guardado. Incluye opción “Prefiero formulario completo” para salir del wizard. |
| **Onboarding / crear empresa (UI + datos)** | Sin `orgId`: guía paso a paso en la misma tarjeta (“Configurar empresa”), placeholders y textos cortos por campo para indicar qué va en cada lugar; valores iniciales del formulario ya no traen NexoPOS / Posadas / slogan de ejemplo — quedan vacíos y la referencia es el `placeholder`. Banner azul contextual si aún no hay empresa. Bloque ayuda en “Configuración de facturas” (numeración, PV 0001, térmico). Registro inicial: placeholders en email/nombre empresa. |
| **`configuracion.service.js`** | `obtenerConfiguracionPorDefecto` y `formatearConfiguracion`: sin texto de marca ni localidad provincial por defecto. Al **guardar**, `punto_venta` vacío → se envía `0001` para no romper backend. Logo: salida API unificada a `tamaño_logo` en el objeto que consume el cliente; al guardar se toma `config.tamaño_logo` o `config.tamano_logo`. Fallback `obtenerConfiguracionEmpresa` ya no usa nombre/dirección de demo. |
| **API configuración (`functions`)** | **Causa de datos “Condinea”/demo para todos**: el backend leía un documento **global** `configuracion_empresa/datos_principales`. **Fix**: rutas `/configuracion/*` ejecutan **`authenticateUser`** antes; empresa en `companies/{orgId}/config/empresa` y espejo en `tenants/{orgId}/config/empresa`. Sin `req.companyId` → plantilla vacía (solo placeholders del cliente). `?orgId` no reemplaza al token — si diffiere de la sesión, 403. Requiere **deploy de Functions** (el hosting solo no alcanza). |

### Archivos tocados en lo anterior (lista útil para diff)

- `client/src/pages/configuracion/configuracionempresa.js` — wizard interactivo + onboarding, placeholders, guía y validación por pasos
- `client/src/services/configuracion.service.js` — defaults vacíos, `punto_venta` en guardado, `tamaño_logo`, errores nombre/dirección vacíos en fallback antiguo
- `functions/routes/configuracion.routes.js`, `functions/index.js` — configuración por tenant + auth en `/configuracion`

### Historial cercano en este repo (contexto anterior)

| Tema | Qué se hizo |
|------|----------------|
| Verificación correo tras “Ya verifiqué” | `refreshAuthSession` en `AuthContext`: `reload` + `getIdToken(true)` + actualizar `currentUser`; usado en `VerificarEmailEmpresa` y `configuracionempresa` antes de `createTenant` para que el JWT traiga `email_verified`. |
| Emuladores Firebase para probar antes de deploy | `firebase.json` → bloque `emulators`. Scripts: **`npm run emulators`** (stack completa, requiere **Java**) · **`npm run emulators:functions-only`** sin Java · **`npm run dev:functions-emu`**. Dos env en cliente: `client/.env.emulator` (**full**) y `client/.env.emulator.functions-only` (**api-only**). `firebase/config.js` respeta **`REACT_APP_EMULATORS_MODE`**. |
| Regla Cursor | `.cursor/rules/nexopos-context.mdc`: pedido explícito de **actualizar este archivo** al cerrar trabajo sustantivo. |

- `client/src/contexts/AuthContext.js`, `VerificarEmailEmpresa.js`, `docs/cambios-pos-verificacion-admin-2026.md`, emuladores y reglas Cursor (ver commits previos).

---

## Probar localmente con emuladores (antes de deploy)

### Requisitos

- Firebase CLI instalada (`firebase --version`).
- **JDK 11 o superior** instalado y en el `PATH` (`java -version`). Sin esto **no arranca el emulador de Firestore** y `npm run emulators` termina en error (“Could not spawn java -version”).

Si todavía no tenés Java, instalá uno LTS (p. ej. Temurin 17) y reabrí la terminal.

### Si solo querés Functions (sin Firestore/Java)

```bash
npm run emulators:functions-only
```

En `client/.env.emulator`, cambiá **`REACT_APP_EMULATORS_MODE=api-only`** (así no intenta enlazar Auth/Firestore emulator que no están arriba). Mantene la misma **`REACT_APP_FIREBASE_FUNCTIONS_URL`**; el emulador de Functions escucha en **:5001** y la UI suele estar en **http://127.0.0.1:4000**.

**Advertencia**: con `api-only`, Auth/Firestore del SDK siguen siendo los del **proyecto remoto**: útil para depurar la API contra datos reales, no para aislar todo offline.

Para **demo completa offline** (`npm run emulators` con Auth+Firestore+Functions) necesitás **JDK** instalado.

### Esta máquina (último arranque comprobado)

Se verificó `npm run emulators:functions-only` — emulador Functions en **5001**, UI **4000**. El intento **`npm run emulators`** falló hasta instalar Java (`java -version` en PATH).

### Último deploy y git (operación humana / asistente)

- Ver **primer commit que aparezca** tras esta sesión con mensaje tipo *deploy / docs 2026-05-08* — convive con **`88684fb`** (balanza POS) ya en `origin/main`.
- Comando estándar: **`npm run build`** → **`firebase deploy --only hosting,functions`** (si CLI da timeout en discovery de Functions: `FUNCTIONS_DISCOVERY_TIMEOUT=60` o equivalente PowerShell antes del deploy).
- Sitio: [nexopos-dc.web.app](https://nexopos-dc.web.app).

*(Despliegues Wizard/config API anteriores: commits `9413f31`, `a1a6707` en el mismo repo.)*

### Terminal 1 — emuladores (Auth + Firestore + Functions)

Desde **raíz del repo** `nexopos-dc-multi-tenant`:

```bash
npm run emulators
```

- Consola útil del emulador: **http://127.0.0.1:4000**
- Auth: `:9099` · Firestore: `:8080` · Functions: `:5001`

### Terminal 2 — cliente React contra emuladores

```bash
cd client
npm run start:emu
```

Lee `client/.env.emulator` (flags públicos sin secretos).

### Una sola terminal (opcional)

Desde raíz (requiere que `client` ya tenga `node_modules`; instala antes `npm install` en raíz y en `client`):

```bash
npm run dev:full-emu
```

### Limitaciones prácticas

- **Emails de verificación** en Auth Emulator no son “reales”; la UI del emulador puede mostrar enlaces/logs.
- Los datos son **solo locales** hasta exportarlos/importarlos (`firebase emulators:export` / `:import`).
- Si algo sigue llamando solo a producción, revisá que **`REACT_APP_USE_EMULATORS=true`** esté cargado (solo via `start:emu` / `.env.emulator`).

### Modo antiguo (solo Functions emulator)

Siguen existiendo `npm run server` y `npm start` (`--only functions`); el cliente sigue usando **prod** Auth/Firestore salvo overrides manuales. Para prueba **coherent** preferir `npm run emulators` + `start:emu`.

---

## Deploy producción (recordatorio corto)

```bash
cd nexopos-dc-multi-tenant
npm run build
firebase deploy --only hosting,functions
```

Hosting: `https://nexopos-dc.web.app`.

---

## Documentación relacionada en el repo

- `docs/cambios-pos-verificacion-admin-2026.md` — historial técnico: POS tablet apaisado, admin vs MobileApp, delete empresa + Auth, verificación obligatoria, etc.

---

## Pendientes conocidos / ideas (editar cuando haya nueva info)

- (Opcional) Añadir emulador de **Storage** si subida de logos se prueba en local.
- (Opcional) Script `firestore.rules`/`indexes` automatizado en CI.

---

## Instrucción para quien/a qué modifique código en el siguiente turno

1. Abrir **`docs/CONTEXTO-ASISTENTE.md`** y **actualizar la tabla superior** + listas después de trabajo relevante.
2. Si tocás verificación/email/tenant, releer §8 en `docs/cambios-pos-verificacion-admin-2026.md`.
3. Deploy solo cuando el usuario lo pida explícitamente; preferir **`npm run dev:full-emu`** + `start:emu` para validación local.
