# Cambios en flujos core - 2026-05-10

## Resumen

Se revisaron y corrigieron problemas concretos en los flujos principales del sistema multi-tenant:

- Productos: actualización y eliminación desde frontend alineadas con las rutas REST reales del backend.
- Compras: creación con pago inicial corregida para evitar doble registro de pago.
- Caja en compras: rollback de compra si el pago desde caja falla por saldo insuficiente.
- Transferencias: rutas de devolución, cancelación, detalle y aprobación ajustadas al contexto `companies/{orgId}`.
- Transferencias: aprobación y movimiento de stock ejecutados de forma atómica.
- Transferencias: enriquecimiento de productos buscando primero en productos del tenant.
- Ventas: edición de venta centralizada en backend, con ajuste de stock multi-tenant dentro de la misma transacción.
- Ventas: validación de stock insuficiente al editar, evitando truncar stock silenciosamente a cero.
- Caja en ventas: normalización de medios de pago y actualización del saldo de caja al registrar ingresos/devoluciones.
- Auditoría: módulo funcional con panel, filtros, resumen y trazabilidad multi-tenant.

## Módulo Auditoría

Se reemplazó la pantalla placeholder de `/auditoria` por un módulo operativo orientado a trazabilidad de acciones críticas.

### Alcance funcional

- Historial filtrable por módulo, acción, usuario, rango de fechas y cantidad de registros.
- Tarjetas de resumen para eventos filtrados, alertas y eventos críticos.
- Desglose visual de actividad por módulo.
- Listado con fecha, evento, usuario, módulo e importancia.

### Persistencia

Los eventos nuevos se guardan por empresa en:

```text
companies/{orgId}/auditoria
```

Cada evento incluye acción, módulo, entidad, usuario, sucursal, monto opcional, severidad y metadata sanitizada.

### Eventos registrados automáticamente

- Ventas: creación, edición, eliminación, cambio de estado y registro de pagos.
- Compras: creación, edición/recepción y registro de pagos.
- Stock: ajustes manuales y ajustes provenientes de control de inventario.
- Caja: movimientos manuales de ingreso/egreso.

La auditoría se registra como operación auxiliar: si falla el log, no se interrumpe la operación principal.

## Verificación

Se ejecutaron las siguientes validaciones:

- `npm run build`
- `node --check functions/routes/ventas.routes.js`
- `node --check functions/routes/transferencias.routes.js`
- `node --check functions/routes/auditoria.routes.js`
- `node --check functions/utils/auditLogger.js`
- Revisión de lints sobre archivos tocados

El build terminó correctamente. Permanecen warnings preexistentes del frontend, principalmente imports no usados, dependencias faltantes en hooks y advertencias de sourcemaps de dependencias.

## Notas de despliegue

El proyecto se despliega con:

```powershell
npm run deploy
```

En Windows se recomienda usar los scripts de npm o `npx firebase` para evitar bloqueos de PowerShell con `firebase.ps1`.

## Deploy realizado

Deploy completo ejecutado correctamente contra el proyecto Firebase `nexopos-dc`.

- Hosting publicado en: https://nexopos-dc.web.app
- Consola Firebase: https://console.firebase.google.com/project/nexopos-dc/overview
- Function principal `api(us-central1)`: https://api-5q2i5764zq-uc.a.run.app

Durante el deploy Firebase informó una advertencia no bloqueante: no pudo limpiar algunas imágenes de build de Cloud Functions. El deploy terminó exitosamente, pero conviene revisar o limpiar manualmente esas imágenes si aparece facturación residual.
