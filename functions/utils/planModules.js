const ALL_MODULE_KEYS = [
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

const BASE_ALWAYS_ON = {
  configuracion: true,
  usuarios: true,
  sucursales: true
};

const PLANES = {
  basico: {
    label: 'Básico',
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

const DEFAULT_PLAN = 'basico';

const normalizePlan = (plan) => {
  if (!plan) return DEFAULT_PLAN;
  const normalized = String(plan).toLowerCase();
  return PLANES[normalized] ? normalized : DEFAULT_PLAN;
};

const getModulesForPlan = (plan) => {
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

module.exports = {
  ALL_MODULE_KEYS,
  PLANES,
  DEFAULT_PLAN,
  normalizePlan,
  getModulesForPlan
};
