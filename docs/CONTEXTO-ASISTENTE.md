# Contexto vivo — NexoPOS DC (`nexopos-dc-multi-tenant`)

Este archivo es **puente entre sesiones** (vos, otro desarrollador o el asistente).  
**Actualizarlo** cuando haya trabajo relevante: qué cambió, cómo probarlo, comandos y pendientes.

---

## Última actualización resumida (sesión más reciente)

| Tema | Qué se hizo |
|------|----------------|
| Verificación correo tras “Ya verifiqué” | `refreshAuthSession` en `AuthContext`: `reload` + `getIdToken(true)` + actualizar `currentUser`; usado en `VerificarEmailEmpresa` y `configuracionempresa` antes de `createTenant` para que el JWT traiga `email_verified`. |
| Emuladores Firebase para probar antes de deploy | `firebase.json` → bloque `emulators`. Scripts: **`npm run emulators`** (stack completa, requiere **Java**) · **`npm run emulators:functions-only`** sin Java · **`npm run dev:functions-emu`** = functions emulator + cliente con `start:emu:functions`. Dos env en cliente: `client/.env.emulator` (**full**) y `client/.env.emulator.functions-only` (**api-only**). `firebase/config.js` respeta **`REACT_APP_EMULATORS_MODE`**. |
| Regla Cursor | `.cursor/rules/nexopos-context.mdc`: pedido explícito de **actualizar este archivo** al cerrar trabajo sustantivo. |

### Archivos tocados en lo anterior (lista útil para diff)

- `client/src/contexts/AuthContext.js` — función `refreshAuthSession`
- `client/src/pages/auth/VerificarEmailEmpresa.js`
- `client/src/pages/configuracion/configuracionempresa.js`
- `docs/cambios-pos-verificacion-admin-2026.md` — sección §8 sobre JWT
- `firebase.json`, `package.json` (raíz), `client/package.json`, `client/.env.emulator`, `client/.env.emulator.functions-only`, `client/src/firebase/config.js`, `client/.env.example`
- `.cursor/rules/nexopos-context.mdc`, `docs/CONTEXTO-ASISTENTE.md` (este archivo)

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
