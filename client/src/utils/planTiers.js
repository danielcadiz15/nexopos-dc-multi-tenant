/** Debe coincidir con functions/utils/planTiers.js */
export const PLAN_TIERS = ['basic', 'intermediate', 'premium'];

export const PLAN_LABELS_ES = {
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
  if (PLAN_TIERS.includes(s)) return s;
  return 'basic';
}

export function defaultPlanPrices() {
  return { basic: 0, intermediate: 0, premium: 0 };
}
