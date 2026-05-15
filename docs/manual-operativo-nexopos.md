# Manual Operativo NexoPOS (Web + Caja Android)

Documento unificado para implementacion, onboarding y uso diario del sistema.

> Este manual describe lo que hoy existe en el sistema productivo y en el codigo actual del proyecto.

## 1) Objetivo del manual

Este instructivo sirve para:

- Crear una empresa nueva (alta estandar).
- Crear una empresa demo de 48 horas (alta comercial).
- Ingresar correctamente como administrador o cajero.
- Entender y operar cada modulo principal del sistema.
- Resolver consultas frecuentes de uso diario.

## 2) Tipos de acceso y perfiles

### Accesos disponibles en login

En la pantalla de login hay dos modos:

- **Administrador**: abre el panel web administrativo completo.
- **Cajero**: abre la pantalla de mostrador/caja.

Si un usuario sin rol admin intenta entrar como administrador, el sistema lo redirige a caja con advertencia.

### Roles habituales

- **Administrador**: acceso amplio por defecto y gestion de configuracion.
- **Usuario con permisos**: acceso granular segun permisos asignados.
- **Cajero**: acceso operativo de venta, limitado por permisos y modulos habilitados.

## 3) Alta de empresa (flujo estandar)

### Paso a paso

1. Ir a `https://nexopos-dc.web.app/login`.
2. Click en **Crear empresa**.
3. Completar email y password.
4. Confirmar email desde el enlace recibido.
5. Volver al sistema y abrir pantalla de verificacion.
6. Crear la empresa.
7. El sistema activa el onboarding de configuracion de empresa.

### Resultado esperado

- Empresa creada en entorno multi-tenant.
- Usuario fundador asociado como administrador.
- Acceso al panel segun plan/licencia configurada.

## 4) Alta de empresa demo (48 hs)

### Paso a paso

1. Ir a login.
2. Click en **Probar demo gratis (48 hs)**.
3. Completar alta de cuenta.
4. Verificar email.
5. Confirmar creacion de empresa demo.
6. Ingresar al sistema.

### Comportamiento de la demo

- Se crea una empresa en modo demo por 48 horas.
- Se habilita experiencia full para evaluacion comercial.
- El flujo muestra mensajes de bienvenida y continuidad de compra.
- El sistema contempla protecciones para evitar abuso de demos repetidas.

## 5) Ingreso al sistema (admin y caja)

## Login administrador

- Seleccionar modo **Administrador**.
- Ingresar credenciales.
- Si el usuario es admin, entra al panel web.
- En app nativa de caja, la opcion admin abre la web externa.

## Login cajero

- Seleccionar modo **Cajero**.
- Ingresar credenciales.
- Abre la vista de mostrador (ruta de caja).

## Botones auxiliares en login

- **Descargar app Caja (APK)**: descarga la APK publicada en URL fija.
- **Soporte remoto (TeamViewer)**: abre TeamViewer QuickSupport (app o store).

## 6) Estructura funcional por modulos

Nota: la visibilidad depende de **plan**, **modulos habilitados** y **permisos del usuario**.

## Dashboard

- Vista general del negocio.
- Indicadores y accesos rapidos.

## Productos

- Lista, alta y edicion de productos.
- Categorias.
- Gestion de precios.
- Integracion con sugerencia de precio por costos/gastos.

## Produccion

- Materias primas.
- Recetas.
- Ordenes de produccion.

## Ventas

- Punto de venta web.
- Lista de ventas.
- Ventas eliminadas (segun permisos/rol).
- Devoluciones.

## Compras

- Lista de compras.
- Nueva compra.
- Proveedores.

## Inventario

- Stock por sucursal.
- Transferencias.
- Ajustes de stock.
- Control de stock e historial.

## Finanzas

- Caja diaria.
- Gastos (con impacto configurable en costos y/o caja).
- Informe de gastos desde Reportes.

## Clientes

- Lista de clientes.
- Alta/edicion.

## Promociones

- Alta de promociones.
- Gestion de promociones vigentes.

## Reportes

- Reporte de ventas.
- Reporte de compras.
- Reporte de ganancias.
- Informe de gastos.

## Usuarios

- Lista de usuarios.
- Alta/edicion.
- Gestion de permisos.
- Perfil.

## Configuracion

- Sucursales.
- Datos de empresa.
- Auditoria.

## Admin (superadmin)

- Configuracion comercial/plataforma global.
- Parametros de facturacion/licencias.

## 7) Caja Android (operacion)

## Uso operativo

- Vista optimizada para mostrador.
- Flujo de busqueda, carrito, cobro y ticket.
- Soporte offline para ventas pendientes de sincronizacion.

## Actualizacion de app

- Boton **Actualizar** en caja:
  - refresca configuracion;
  - compara version instalada vs version en servidor;
  - descarga actualizacion solo si hay una mas nueva.

## Descarga directa de APK

- URL publica estable:
  - `https://nexopos-dc.web.app/app-caja.apk`
- Metadata de version:
  - `https://nexopos-dc.web.app/app-caja-version.json`

## 8) Licencias, planes y acceso comercial

El modelo vigente combina:

- Plan base por modulos.
- Cupo de usuarios incluidos.
- Adicionales por usuario/sucursal.
- Sesion unica por usuario (si inicia en otro dispositivo, reemplaza sesion previa).
- Limite de sesiones concurrentes por empresa segun plan.

Referencia funcional/comercial:

- `docs/billing-mercadopago.md`

## 9) Flujos recomendados de onboarding (implementacion real)

## Onboarding rapido de nueva empresa

1. Alta de cuenta.
2. Verificacion de email.
3. Creacion de empresa.
4. Configuracion de empresa/sucursal.
5. Alta de usuarios.
6. Carga inicial de productos.
7. Prueba de venta.
8. Revision de reportes.

## Onboarding demo comercial

1. Alta demo.
2. Activacion por email.
3. Recorrido guiado:
   - Dashboard
   - Productos
   - Ventas/Caja
   - Reportes
   - Gastos + precio sugerido
4. Cierre comercial (plan sugerido al finalizar demo).

## 10) Preguntas frecuentes (FAQ)

## "No me deja entrar como admin"

- Verificar rol del usuario.
- Si es cajero, debe entrar en modo cajero.

## "La app de caja no actualiza"

- Verificar conectividad.
- Confirmar que `app-caja.apk` y `app-caja-version.json` esten publicados en hosting.

## "Un usuario se cerro solo"

- Revisar politica de sesion unica: puede haber iniciado sesion en otro dispositivo.

## "No veo un modulo en el menu"

- Revisar plan, modulos habilitados y permisos del usuario.

## 11) Checklist de capacitacion por cliente

- Alta de empresa finalizada.
- Sucursal principal configurada.
- Usuarios y permisos configurados.
- 10 productos de prueba cargados.
- 2 ventas de prueba emitidas.
- 1 compra de prueba registrada.
- 1 gasto de prueba registrado.
- Reportes de ventas y compras verificados.
- Caja Android instalada y actualizacion probada.

## 12) Documentos complementarios

- Despliegue tecnico: `docs/DESPLIEGUE.md`
- Licencias y Mercado Pago: `docs/billing-mercadopago.md`
- Kiosko Android: `docs/kiosko-android.md`
- Avance funcional: `docs/informe-avance-nexopos-2026-05-14.md`

---

Si queres, el siguiente paso es generar una **version comercial para clientes finales** (mas breve, con lenguaje no tecnico y con guion de demo de venta de 15 minutos).
