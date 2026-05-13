/**
 * Catálogo único de módulos (empresa / licencia). Debe alinearse con
 * `functions/utils/modulePresets.js`.
 */

/** Orden estable para UI y merges */
export const MODULE_KEYS = [
  'productos',
  'categorias',
  'clientes',
  'proveedores',
  'compras',
  'ventas',
  'punto_venta',
  'stock',
  'listas_precios',
  'transferencias',
  'reportes',
  'promociones',
  'caja',
  'gastos',
  'devoluciones',
  'auditoria',
  'vehiculos',
  'produccion',
  'recetas',
  'materias_primas',
  'configuracion',
  'sucursales',
  'usuarios'
];

export const MODULE_LABELS_ES = {
  productos: 'Productos y catálogo',
  categorias: 'Categorías',
  clientes: 'Clientes',
  proveedores: 'Proveedores',
  compras: 'Compras',
  ventas: 'Historial de ventas',
  punto_venta: 'Punto de venta',
  stock: 'Stock y sucursales',
  listas_precios: 'Gestión de precios / listas',
  transferencias: 'Transferencias entre sucursales',
  reportes: 'Reportes',
  promociones: 'Promociones',
  caja: 'Caja',
  gastos: 'Gastos',
  devoluciones: 'Devoluciones',
  auditoria: 'Auditoría',
  vehiculos: 'Vehículos / flota',
  produccion: 'Producción',
  recetas: 'Recetas',
  materias_primas: 'Materias primas',
  configuracion: 'Configuración avanzada',
  sucursales: 'Sucursales',
  usuarios: 'Usuarios y permisos'
};

/** Documento por defecto al crear UI de módulos (equivalente “intermedio” del cliente). */
export function buildModulosDefaultIntermediate() {
  return {
    productos: true,
    categorias: true,
    clientes: true,
    proveedores: true,
    compras: true,
    ventas: true,
    punto_venta: true,
    stock: true,
    listas_precios: true,
    transferencias: true,
    reportes: true,
    promociones: false,
    caja: true,
    gastos: true,
    devoluciones: true,
    auditoria: false,
    vehiculos: false,
    produccion: false,
    recetas: false,
    materias_primas: false,
    configuracion: true,
    sucursales: true,
    usuarios: true
  };
}

/**
 * Normaliza lectura de Firestore: cada clave del catálogo existe;
 * `undefined` → habilitado (compatibilidad); solo `false` desactiva.
 */
export function mergeCompanyModules(raw = {}) {
  const merged = {};
  for (const k of MODULE_KEYS) {
    merged[k] = raw[k] !== false;
  }
  return merged;
}

/**
 * Primer módulo de licencia que bloquea la ruta, o null si no aplica.
 * Reglas ordenadas de más específica a genérica.
 */
export function getRequiredModuleForPath(pathname) {
  const path = pathname || '/';
  const rules = [
    [/^\/cajero/, 'punto_venta'],
    [/^\/productos\/precios/, 'listas_precios'],
    [/^\/productos(?:\/|$)/, 'productos'],
    [/^\/categorias(?:\/|$)/, 'categorias'],
    [/^\/punto-venta/, 'punto_venta'],
    [/^\/ventas-eliminadas/, 'ventas'],
    [/^\/ventas(?:\/|$)/, 'ventas'],
    [/^\/devoluciones/, 'devoluciones'],
    [/^\/clientes(?:\/|$)/, 'clientes'],
    [/^\/compras(?:\/|$)/, 'compras'],
    [/^\/proveedores(?:\/|$)/, 'proveedores'],
    [/^\/stock\/transferencias/, 'transferencias'],
    [/^\/stock(?:\/|$)/, 'stock'],
    [/^\/reportes(?:\/|$)/, 'reportes'],
    [/^\/promociones(?:\/|$)/, 'promociones'],
    [/^\/usuarios\/permisos/, 'usuarios'],
    [/^\/usuarios(?:\/|$)/, 'usuarios'],
    [/^\/materias-primas(?:\/|$)/, 'materias_primas'],
    [/^\/recetas(?:\/|$)/, 'recetas'],
    [/^\/produccion(?:\/|$)/, 'produccion'],
    [/^\/sucursales(?:\/|$)/, 'sucursales'],
    [/^\/caja(?:\/|$)/, 'caja'],
    [/^\/gastos(?:\/|$)/, 'gastos'],
    [/^\/transferencias(?:\/|$)/, 'transferencias'],
    [/^\/auditoria(?:\/|$)/, 'auditoria'],
    [/^\/configuracion\/empresa/, 'configuracion'],
    [/^\/listas-precios/, 'listas_precios'],
    [/^\/perfil(?:\/|$)/, null],
    [/^\/$/, null],
    [/^\/admin(?:\/|$)/, null]
  ];
  for (const [re, mod] of rules) {
    if (re.test(path)) return mod;
  }
  return null;
}
