/**
 * Detalle de planes para UI (debe coincidir con functions/utils/modulePresets.js).
 */

import { normalizeLicensePlan, PLAN_LABELS_ES } from './planTiers';
import {
  MODULE_KEYS,
  MODULE_LABELS_ES
} from '../config/modulesCatalog';

export { MODULE_KEYS, MODULE_LABELS_ES };

function presetPremiumModules() {
  const m = {};
  for (const k of MODULE_KEYS) m[k] = true;
  return m;
}

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

export function getModulePresetForPlan(rawPlan) {
  const p = normalizeLicensePlan(rawPlan);
  if (p === 'premium') return presetPremiumModules();
  if (p === 'intermediate') return presetIntermediateModules();
  return presetBasicModules();
}

export const PLAN_IDS = ['basic', 'intermediate', 'premium'];

export const PLAN_COMMERCIAL_META_ES = {
  basic: {
    includedUsers: 2,
    includedBranches: 1,
    extraUserArs: 12000,
    extraBranchArs: 25000,
    accessPolicy:
      'Sesión única por usuario. Sesiones concurrentes de la empresa hasta el cupo de usuarios activos del plan.'
  },
  intermediate: {
    includedUsers: 6,
    includedBranches: 3,
    extraUserArs: 10000,
    extraBranchArs: 22000,
    accessPolicy:
      'Sesión única por usuario. Sesiones concurrentes de la empresa hasta el cupo de usuarios activos del plan.'
  },
  premium: {
    includedUsers: 15,
    includedBranches: 8,
    extraUserArs: 9000,
    extraBranchArs: 20000,
    accessPolicy:
      'Sesión única por usuario. Sesiones concurrentes de la empresa hasta el cupo de usuarios activos del plan.'
  }
};

/** Textos orientativos por plan (marketing / instructivo) */
export const PLAN_DEEP_COPY_ES = {
  basic: {
    tagline: 'Operación diaria esencial',
    pitch:
      'Pensado para comercios que venden en mostrador y controlan stock sin necesidad de compras formales ni listas avanzadas.',
    advantages: [
      'Punto de venta y stock para seguir el día a día sin fricción',
      'Clientes y ventas para facturar y consultar historial',
      'Menor superficie de menú: menos distracciones para el equipo'
    ],
    highlight: 'Ideal para mostrador único o despensa que prioriza velocidad de cobro.',
    commercial:
      'Incluye hasta 2 usuarios y 1 sucursal; podés sumar usuarios/sucursales adicionales cuando tu operación crezca.'
  },
  intermediate: {
    tagline: 'Negocio completo sin industrial',
    pitch:
      'La opción equilibrada: compras, proveedores, listas de precios y transferencias entre locales, sin módulos de producción ni flota.',
    advantages: [
      'Compras y proveedores para abastecer con trazabilidad',
      'Listas de precios y transferencias para multi-sucursal',
      'Reportes y caja alineados al volumen medio de operación'
    ],
    highlight: 'Recomendada para distribuidoras y cadenas chicas que ya gestionan reposición y varios puntos.',
    commercial:
      'Incluye hasta 6 usuarios y 3 sucursales con opción de ampliar por adicionales.'
  },
  premium: {
    tagline: 'Todo el sistema, sin techo',
    pitch:
      'Acceso completo a producción, recetas, materias primas, auditoría, vehículos y promociones cuando el negocio escala.',
    advantages: [
      'Producción, recetas y materias primas para fabricación o cocina central',
      'Auditoría y trazabilidad para equipos más grandes',
      'Promociones y flota cuando el modelo de negocio lo requiere'
    ],
    highlight: 'Pensada para operaciones que industrializan, auditan o integran logística propia.',
    commercial:
      'Incluye hasta 15 usuarios y 8 sucursales; ideal para equipos grandes y multi-local.'
  }
};

export function countEnabledModules(preset) {
  return MODULE_KEYS.filter((k) => preset[k]).length;
}

export function planLabel(planId) {
  return PLAN_LABELS_ES[normalizeLicensePlan(planId)] || planId;
}
