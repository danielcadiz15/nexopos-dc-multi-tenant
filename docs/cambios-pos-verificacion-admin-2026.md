# Cambios: caja móvil, enrutamiento admin, verificación de correo y borrado central

Resumen de trabajo aplicado en el repositorio **nexopos-dc-multi-tenant** (cliente React, Cloud Functions, panel super admin). Útil para revisiones, soporte y próximos deploys.

---

## 1. Tablet apaisado — `MobilePuntoVenta.js`

- **Columnas**: carrito a la izquierda, panel de cobro a la derecha; fila inferior sin scroll global; scroll principal en la lista del carrito.
- **Alturas**: reparto vertical con `flex` entre resultados y bloque inferior; uso de `dvh` / `clamp` donde aplica para adaptar mejor a la pantalla.
- **Panel de cobro**: sin scroll en la columna completa (contenido compacto en landscape); scroll reservado al carrito cuando hay muchas líneas.
- **Hueco bajo “Agregar por código”**: la sección de resultados se oculta cuando no hay nada que mostrar (`mostrarResultados`), para que el bloque carrito/cobro suba.
- **Teclado numérico que se cerraba al focar “Dinero recibido”**: el layout alternaba entre “tablet apaisado” y otro modo cuando `window.innerHeight` bajaba al abrir el teclado. Se introdujo **`peakInnerHeightRef`** (máximo de `innerHeight` visto) para el umbral `landscapeTablet`, más reset en **`orientationchange`** con `setLayoutEpoch` para no confundir móvil grande al rotar.
- **`compact`**: en modo tablet apaisado no depende solo de la altura actual en teclado para no parpadear la UI.

Archivo principal: `client/src/components/mobile/MobilePuntoVenta.js`.

---

## 2. Administradores y vista móvil — `App.js`

- Quien tiene rol de **gestión** (administrador, admin, gerente, `rolId` admin/gerente, `isAdmin`) **no** entra por `MobileApp` (módulos placeholder “En desarrollo”) aunque el dispositivo sea móvil o ancho ≤ 768px.
- Esas cuentas usan el **`Layout`** completo con todas las rutas NexoPOS.
- Helper: `usuarioDebeVerSistemaWebCompleto`.

Archivo: `client/src/App.js`.

---

## 3. Panel super admin — eliminar empresa y Firebase Auth

**Problema**: al eliminar una empresa desde el panel solo se borraba Firestore; los usuarios seguían en **Authentication**.

**Solución** (`functions/index.js`, ruta `DELETE /admin/empresas/:id`):

1. Recolectar UID: `ownerUid` del doc `companies/{id}`, documentos `usuariosOrg` con `orgId == companyId`, y docs en `companies/{id}/usuarios`.
2. Borrar subcolecciones conocidas de `companies` y `tenants`, doc principal, `licenses/{id}`.
3. Borrar en raíz `sucursales` donde `orgId == companyId`.
4. Por cada UID: borrar `usuariosOrg/{uid}` y **`admin.auth().deleteUser(uid)`** (errores logueados, no tumban toda la operación).

El cliente del panel no cambió la API; sigue `AdminPanel.js` → `DELETE /admin/empresas/:id`.

---

## 4. Verificación obligatoria de correo

### Backend

- **`createTenant`** (callables): ya exigía `emailVerified` en el usuario.
- **`setActiveTenant`**: ahora también exige **`email_verified`** en el token (igual criterio que `joinTenant`).
- **Alta de usuario empresa** (`functions/routes/usuarios.routes.js`): `createUser` con **`emailVerified: false`** explícito; mensaje de respuesta indica que debe verificar tras iniciar sesión.

### Cliente

- **`ProtectedRoute.js`**: si hay sesión y **`!currentUser.emailVerified`**, redirección a **`/verificar-email`** (excepción: email súper-admin vía `isSuperAdminEmail` de `client/src/config/superAdmin.js`).
- Rutas **`/login`**, **`/signup`** siguen públicas.

### UX en español

- `client/src/utils/emailVerification.js`: **`getEmailActionCodeSettings()`** con `url` de retorno configurable por **`REACT_APP_PUBLIC_APP_URL`** (default `https://nexopos-dc.web.app`). Documentado en `client/.env.example`.
- **`sendEmailVerification(..., getEmailActionCodeSettings())`** en `AuthContext` (signup), `configuracionempresa.js` (registro unificado) y `VerificarEmailEmpresa.js` (reenvío).
- Toasts y textos en pantalla de verificación: instrucciones claras, spam, flujo “nueva empresa” vs “cuenta con organización”.
- Bandera **`postVerifyGoConfig`** + limpieza al entrar a configuración empresa: evita redirección incorrecta a `/` justo después de crear la organización.

### Spam / entregabilidad (operación)

- El HTML del mail lo define **Firebase Console** → Authentication → Plantillas.
- Recomendado: dominio autorizado, SPF/DKIM si se usa dominio propio, y plantilla en español coherente con la UI.

---

## 5. Deploy

- **Hosting**: build del cliente (`client/build`) → `firebase deploy --only hosting`.
- **Funciones**: obligatorio para borrado Auth y `setActiveTenant` actualizado → `firebase deploy --only functions` (o `hosting,functions` en un solo comando).

Variables de entorno del **cliente** (build): copiar desde `client/.env.example` a `client/.env.local` lo necesario (p. ej. `REACT_APP_PUBLIC_APP_URL`).

---

## 6. Archivos tocados (referencia rápida)

| Área | Archivos |
|------|----------|
| Caja móvil landscape | `client/src/components/mobile/MobilePuntoVenta.js` |
| Rutas admin móvil | `client/src/App.js` |
| Protección + verificación | `client/src/components/common/ProtectedRoute.js` |
| Auth / signup | `client/src/contexts/AuthContext.js` |
| Verificación UI | `client/src/pages/auth/VerificarEmailEmpresa.js` |
| Onboarding empresa | `client/src/pages/configuracion/configuracionempresa.js` |
| Action link correo | `client/src/utils/emailVerification.js`, `client/.env.example` |
| Delete empresa + Auth | `functions/index.js` |
| Callables tenant | `functions/callables/tenants.js` |
| Alta usuario API | `functions/routes/usuarios.routes.js` |

---

## 7. Nota para usuarios ya existentes

Quienes nunca hubieran verificado el correo en Firebase pueden quedar **bloqueados** hasta verificar (o usar “Reenviar correo” en `/verificar-email`). Es comportamiento esperado tras exigir verificación en toda la app protegida.

---

## 8. Corrección “Ya verifiqué”: token JWT y estado React

Tras hacer clic en el link del mail, `User.emailVerified` se actualiza con `reload()`, pero el **ID token** puede seguir llevando `email_verified: false` hasta forzar **`getIdToken(forceRefresh: true)`**. Las callables (`createTenant`, etc.) leen el token, no solo el objeto `User`. Por eso se expone **`refreshAuthSession`** en `AuthContext` (reload + token nuevo + actualización de `currentUser`). La pantalla `VerificarEmailEmpresa` y `handleCrearEmpresa` en configuración empresa lo usan antes de crear la organización o navegar al inicio.
