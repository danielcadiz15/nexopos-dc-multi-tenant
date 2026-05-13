/**
 * Plantillas de módulos por plan de licencia (post–cuotas de instalación).
 * Podés afinar qué va en Básica / Intermedia / Premium sin tocar la lógica de cobro.
 */

const { normalizePlan } = require('./planTiers');

const KEYS = [
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

const PLAN_COMMERCIAL_META = {
  basic: {
    includedUsers: 2,
    includedBranches: 1,
    extraUserArs: 12000,
    extraBranchArs: 25000
  },
  intermediate: {
    includedUsers: 6,
    includedBranches: 3,
    extraUserArs: 10000,
    extraBranchArs: 22000
  },
  premium: {
    includedUsers: 15,
    includedBranches: 8,
    extraUserArs: 9000,
    extraBranchArs: 20000
  }
};

/** Todo habilitado — usado en las 2 primeras cuotas (versión full). */
function presetPremiumModules() {
  const m = {};
  for (const k of KEYS) m[k] = true;
  return m;
}

/** Equivale al default “intermedio” que tenía alta de tenant (sin algunos avanzados). */
function presetIntermediateModules() {
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

/** POS y stock esencial; sin producción, transferencias avanzadas ni billing pesado. */
function presetBasicModules() {
  const inter = presetIntermediateModules();
  return {
    ...inter,
    listas_precios: false,
    transferencias: false,
    proveedores: false,
    compras: false,
    promociones: false,
    auditoria: false,
    vehiculos: false,
    produccion: false,
    recetas: false,
    materias_primas: false,
    devoluciones: true,
    sucursales: true,
    usuarios: true
  };
}

function getModulePresetForPlan(rawPlan) {
  const p = normalizePlan(rawPlan);
  if (p === 'premium') return presetPremiumModules();
  if (p === 'intermediate') return presetIntermediateModules();
  return presetBasicModules();
}

module.exports = {
  KEYS,
  PLAN_COMMERCIAL_META,
  presetPremiumModules,
  presetIntermediateModules,
  presetBasicModules,
  getModulePresetForPlan
};
