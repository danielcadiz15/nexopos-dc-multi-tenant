# Migración La Fábrica -> NexoPOS Condinea

## Objetivo

Migrar la base Firebase del proyecto `la-fabrica-1` hacia el proyecto `nexopos-dc`, usando `Condinea` como empresa destino dentro de la arquitectura multi-tenant.

La empresa real asociada a `condinea@gmail.com` es:

```text
companies/TFuZVgLieO4OmlKLQ2l8/...
tenants/TFuZVgLieO4OmlKLQ2l8
licenses/TFuZVgLieO4OmlKLQ2l8
```

## Estrategia

No se usa `firestore import` directo porque NexoPOS tiene una estructura multi-tenant y módulos nuevos. La migración se hace con script Node y `firebase-admin`, copiando y normalizando colecciones raíz del sistema viejo hacia subcolecciones de la empresa destino.

El script corre en dos modos:

- `dry-run`: inspecciona, cuenta documentos y genera reporte sin escribir.
- `commit`: crea/actualiza la empresa destino y copia datos.

Además, antes de migrar se genera un backup local de las colecciones raíz del proyecto origen en:

```text
tmp/migration-backups/
```

## Regla de antigüedad

Para `Condinea`, la migración operativa lleva a NexoPOS solo los últimos 6 meses. Los datos maestros se migran completos.

Se migran completos:

- Productos
- Categorías
- Clientes
- Proveedores
- Sucursales
- Usuarios y roles
- Configuración
- Stock actual por sucursal
- Recetas, materias primas, vehículos y listas base

Se filtran por fecha de los últimos 6 meses:

- Ventas y ventas eliminadas
- Compras
- Movimientos de caja
- Movimientos de stock
- Transferencias
- Notificaciones
- Órdenes/producción
- Historial de precios
- Auditoría / ajustes / solicitudes operativas

El filtro revisa campos frecuentes como `fecha`, `fechaCreacion`, `createdAt`, `fechaActualizacion`, `fecha_venta`, `fecha_compra`, `fecha_eliminacion`, etc. Si un documento operativo no tiene fecha confiable, se conserva para evitar pérdida accidental.

## Comandos

```powershell
npm run migrate:la-fabrica:dry-run
npm run migrate:la-fabrica:commit
```

Equivalente manual:

```powershell
node scripts/migrate-la-fabrica-condinea.js --dry-run
node scripts/migrate-la-fabrica-condinea.js --commit
```

Opciones útiles:

```powershell
node scripts/migrate-la-fabrica-condinea.js --dry-run --org condinea --company-name "Condinea"
node scripts/migrate-la-fabrica-condinea.js --dry-run --only productos,clientes,ventas
node scripts/migrate-la-fabrica-condinea.js --dry-run --months 6
node scripts/migrate-la-fabrica-condinea.js --dry-run --no-backup
```

## Credenciales

El script soporta credenciales de aplicación de Google:

```powershell
gcloud auth application-default login
```

O service accounts por variable:

```powershell
$env:SOURCE_SERVICE_ACCOUNT="C:\keys\la-fabrica-1.json"
$env:TARGET_SERVICE_ACCOUNT="C:\keys\nexopos-dc.json"
```

No guardar claves JSON dentro del repositorio.

## Colecciones migradas

Se copian, cuando existen:

- `productos`
- `categorias`
- `proveedores`
- `clientes`
- `sucursales`
- `usuarios`
- `roles`
- `ventas`
- `compras`
- `gastos`
- `devoluciones`
- `listas_precios`
- `transferencias`
- `stock_sucursal`
- `movimientos_stock`
- `promociones`
- `recetas`
- `produccion`
- `materias_primas`
- `vehiculos`
- `servicios_vehiculos`
- `combustible`
- `notificaciones`
- `auditoria`
- `caja`
- `config`

También reconoce alias comunes:

- `stock` -> `stock_sucursal`
- `stockSucursal` -> `stock_sucursal`
- `movimientosStock` -> `movimientos_stock`
- `listasPrecios` -> `listas_precios`

Las subcolecciones se copian recursivamente, por ejemplo:

```text
ventas/{ventaId}/pagos
compras/{compraId}/pagos
caja/{sucursalId}/movimientos
```

## Validaciones recomendadas antes de `--commit`

1. Ejecutar `dry-run` y revisar el reporte generado en `tmp/migration-reports`.
2. Confirmar que las colecciones omitidas no sean necesarias.
3. Comparar conteos con Firebase Console de `la-fabrica-1`.
4. Verificar que `companies/condinea` no tenga datos productivos que puedan mezclarse.
5. Confirmar que el backup local se generó correctamente en `tmp/migration-backups`.

## Validaciones recomendadas después de `--commit`

1. Abrir NexoPOS como empresa `Condinea`.
2. Revisar conteos de productos, clientes, ventas y compras.
3. Verificar stock por sucursal.
4. Revisar caja por sucursal y movimientos.
5. Hacer una venta de prueba controlada.
6. Revisar reportes de ventas/compras/ganancias.

## Limitaciones

Firebase Auth no migra contraseñas desde Firestore. El script copia documentos de usuarios/roles si existen, pero los accesos reales se deben recrear/invitar o migrar con un procedimiento específico de Auth si el proyecto original lo permite.

El primer `commit` debe ejecutarse después de revisar el `dry-run`.

## Ejecución realizada

Fecha: 2026-05-12.

Se generó backup local completo de colecciones raíz:

```text
tmp/migration-backups/la-fabrica-1-1778558758749
```

Resumen de migración a `companies/condinea`:

- Documentos considerados para migrar a Condinea: `7.579`.
- Documentos filtrados por antigüedad: `5.983`.
- Corte usado para operaciones históricas: `2025-11-12`.
- Colecciones omitidas: `_migracion_backup`, `contadores`.
- Reporte commit: `tmp/migration-reports/la-fabrica-to-condinea-commit-1778560208856.json`.
- Reporte verificación posterior: `tmp/migration-reports/la-fabrica-to-condinea-dry-run-1778560274793.json`.

Notas:

- `stock-sucursal` y `stock_sucursal` se consolidaron en `companies/condinea/stock_sucursal` usando `sucursal_id + producto_id` como clave estable cuando estaba disponible.
- `movimientos_caja` y `saldo_caja` se normalizaron hacia la estructura actual `companies/condinea/caja`.
- El commit se ejecutó en modo idempotente con `merge`; una primera corrida parcial se detuvo por lentitud al revisar subcolecciones y luego se reejecutó optimizada hasta completar.

## Corrección de destino

Después de la primera ejecución se verificó que la cuenta `condinea@gmail.com` no apunta a `companies/condinea`, sino a:

```text
companies/TFuZVgLieO4OmlKLQ2l8
```

Se repitió la migración al tenant correcto.

Resumen verificado:

- Firebase Auth `condinea@gmail.com` -> custom claim `companyId: TFuZVgLieO4OmlKLQ2l8`.
- Destino correcto: `companies/TFuZVgLieO4OmlKLQ2l8`.
- Documentos migrados al destino correcto: `7.579`.
- Documentos filtrados por antigüedad: `5.983`.
- Reporte commit correcto: `tmp/migration-reports/la-fabrica-to-TFuZVgLieO4OmlKLQ2l8-commit-1778563781205.json`.

Conteos principales posteriores en el tenant correcto:

- Productos: `245`.
- Clientes: `1.466`.
- Ventas: `876`.
- Compras: `50`.
- Stock por sucursal: `879`.
- Movimientos de stock: `3.126`.
- Sucursales: `4`.
- Usuarios: `14`.
