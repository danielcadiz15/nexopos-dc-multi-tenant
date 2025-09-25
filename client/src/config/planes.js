export const ALL_MODULE_KEYS = [
  'productos',
  'categorias',
  'proveedores',
  'compras',
  'ventas',
  'punto_venta',
  'caja',
  'devoluciones',
  'stock',
  'transferencias',
  'listas_precios',
  'clientes',
  'reportes',
  'promociones',
  'gastos',
  'auditoria',
  'vehiculos',
  'produccion',
  'materias_primas',
  'recetas',
  'usuarios',
  'sucursales',
  'configuracion'
];

export const BASE_ALWAYS_ON = {
  configuracion: true,
  usuarios: true,
  sucursales: true
};

export const PLANES = {
  basico: {
    label: 'Básico',
    descripcion:
      'Incluye Dashboard general, Caja, Punto de ventas, Compras y Productos.',
    modules: [
      'productos',
      'categorias',
      'proveedores',
      'compras',
      'ventas',
      'punto_venta',
      'caja',
      'devoluciones'
    ]
  },
  intermedio: {
    label: 'Intermedio',
    descripcion:
      'Todo el plan Básico más Inventario, Clientes, Reportes, Promociones y herramientas de gestión.',
    modules: [
      'productos',
      'categorias',
      'proveedores',
      'compras',
      'ventas',
      'punto_venta',
      'caja',
      'devoluciones',
      'stock',
      'transferencias',
      'listas_precios',
      'clientes',
      'reportes',
      'promociones',
      'gastos'
    ]
  },
  full: {
    label: 'Full',
    descripcion:
      'Todo lo del plan Intermedio más Producción, Vehículos y Auditoría avanzada.',
    modules: [
      'productos',
      'categorias',
      'proveedores',
      'compras',
      'ventas',
      'punto_venta',
      'caja',
      'devoluciones',
      'stock',
      'transferencias',
      'listas_precios',
      'clientes',
      'reportes',
      'promociones',
      'gastos',
      'produccion',
      'materias_primas',
      'recetas',
      'vehiculos',
      'auditoria'
    ]
  }
};

export const DEFAULT_PLAN = 'basico';

export const normalizePlan = (plan) => {
  const normalized = (plan || '').toLowerCase();
  if (PLANES[normalized]) {
    return normalized;
  }
  return DEFAULT_PLAN;
};

export const getModulesForPlan = (plan) => {
  const normalized = normalizePlan(plan);
  const modules = {};

  ALL_MODULE_KEYS.forEach((key) => {
    modules[key] = false;
  });

  Object.keys(BASE_ALWAYS_ON).forEach((key) => {
    modules[key] = BASE_ALWAYS_ON[key];
  });

  PLANES[normalized].modules.forEach((key) => {
    modules[key] = true;
  });

  return modules;
};
