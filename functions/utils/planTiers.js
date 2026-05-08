/** Planes de licencia con precio propio (ver platform/billing.planPrices). */

const PLAN_TIERS = ['basic', 'intermediate', 'premium'];

function normalizePlan(raw) {
  const s = String(raw || 'basic')
    .toLowerCase()
    .trim();
  if (s === 'pro') return 'intermediate';
  if (s === 'enterprise') return 'premium';
  if (PLAN_TIERS.includes(s)) return s;
  return 'basic';
}

module.exports = { PLAN_TIERS, normalizePlan };
