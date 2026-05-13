/** Debe coincidir con functions/utils/planTiers.js */
export const PLAN_TIERS = ['basic', 'intermediate', 'premium'];

export const PLAN_LABELS_ES = {
  trial: 'Cortesía inicial',
  demo: 'Cortesía inicial',
  basic: 'Básica',
  intermediate: 'Intermedia',
  premium: 'Premium'
};

export function normalizeLicensePlan(raw) {
  const s = String(raw || 'basic')
    .toLowerCase()
    .trim();
  if (s === 'pro') return 'intermediate';
  if (s === 'enterprise') return 'premium';
  if (s === 'demo' || s === 'trial') return 'trial';
  if (PLAN_TIERS.includes(s)) return s;
  return 'basic';
}

export function defaultPlanPrices() {
  return { basic: 80000, intermediate: 120000, premium: 180000 };
}
