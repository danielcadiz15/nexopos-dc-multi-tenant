# Informe de avance NexoPOS (2026-05-14)

## Estado general

El sistema quedo desplegado en produccion con cambios de frontend y backend para robustez operativa, experiencia en tablet/android, demo comercial y base de control de abonos por modulos + usuarios.

- Hosting: `https://nexopos-dc.web.app`
- API principal: `https://api-5q2i5764zq-uc.a.run.app`

## Cambios principales implementados

### 1) UX/UI y flujo comercial

- Ajuste de banner/licencia para no tapar perfil y reducir friccion visual.
- CTA de demo 48h integrado en flujo de autenticacion.
- Login con imagen de fondo completa y modal conservado.
- Mejoras de contraste en sidebar administrador.

### 2) Demo 48h y licenciamiento

- Flujo demo de 48h con verificacion de email.
- Estados de licencia extendidos (`demo_active`, `demo_expired`, grace, unpaid flow).
- Prevencion de abuso por email para demos repetidas.

### 3) Finanzas/Gastos + precio sugerido

- Nuevo modulo de gastos en backend y frontend.
- Integracion de gastos con caja cuando origen de fondos es caja.
- Opcion de incluir gastos en costos para calculo de precio sugerido.
- Sincronizacion de gastos de finanzas al panel de precio sugerido en productos.

### 4) Reportes

- Correcciones en reportes de compras para proveedores y totales migrados.
- Correcciones en tarjetas de resumen de reporte de ventas (normalizacion de campos).

### 5) Android/Tablet/Kiosko

- Mejoras de estabilidad para evitar congelamientos por relanzados agresivos.
- Ajustes en layout de cajero para tablet horizontal.
- Modal de carrito completo con boton cerrar y scroll robusto.
- Mejoras de apertura admin y control de URL permitidas.

### 6) Seguridad operativa de sesiones (nuevo)

Se implemento base de control para esquema mixto de abono:

- Sesion unica por usuario/email (con transferencia de sesion al login mas reciente).
- Limite de sesiones concurrentes por empresa segun plan.
- Limite de usuarios creados por empresa segun plan.
- Headers de sesion por dispositivo en cliente para control de backend.
- Logout forzado en cliente cuando la sesion es reemplazada o excede limites.

Archivos nuevos:

- `functions/utils/subscriptionAccess.js`
- `client/src/utils/sessionControl.js`

Archivos clave actualizados:

- `functions/utils/auth.js`
- `functions/routes/usuarios.routes.js`
- `functions/index.js`
- `client/src/services/api.service.js`
- `client/src/contexts/AuthContext.js`

## Modelo comercial acordado (base actual)

Se definio avanzar con:

- Plan base por modulos habilitados.
- Cupo de usuarios incluidos por plan.
- Cobro adicional por usuario extra.
- Control tecnico de sesiones concurrentes para sostener rendimiento y orden operativo.

Referencia actual (parametrizable):

- `functions/utils/modulePresets.js` en `PLAN_COMMERCIAL_META`.

## Pendientes recomendados (siguiente fase)

- Parametrizar en panel admin central los limites de:
  - usuarios maximos creados
  - sesiones concurrentes
  - extras por usuario/sucursal
- Exponer reporte administrativo de sesiones activas por empresa.
- Actualizar `firebase-functions` a ultima version (warning de deploy).
- Pulir warnings de lint historicos no bloqueantes.
- Ejecutar pruebas E2E de sesion cruzada (web + tablet + app caja).

## Riesgos y observaciones

- Al existir cambios extensos en varias areas, es importante mantener pruebas manuales guiadas por flujo (login, ventas, caja, reportes, configuracion).
- El control de sesion depende de que el cliente envie headers de sesion (ya implementado en `ApiService`).

## Mini guia de validacion rapida (QA)

1. Ingresar con mismo usuario en dispositivo A (queda activo).
2. Ingresar con mismo usuario en dispositivo B.
3. Volver a operar en A: debe forzar cierre y pedir login.
4. Intentar crear usuarios por encima del cupo del plan: debe bloquear con mensaje de limite.
5. Abrir login en web/tablet y validar la nueva imagen de fondo.

## Resumen ejecutivo

El sistema esta quedando con base solida para escalar comercialmente:

- Mejor UX en puntos criticos de operacion.
- Licenciamiento y demo mas orientados a conversion.
- Finanzas conectadas a costos y precios sugeridos.
- Control inicial de concurrencia/sesiones para modelo de abono mixto.
