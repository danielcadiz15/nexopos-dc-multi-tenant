/** Defaults alineados al modelo comercial: dos cuotas fijas de instalación. */
const DEFAULT_ONBOARDING_INSTALLMENT_ARS = 250000;
const DEFAULT_ONBOARDING_INSTALLMENTS_TOTAL = 2;

/**
 * @param {Record<string, unknown>} raw — doc platform/billing o similar
 */
function resolveOnboardingFromDoc(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  let amt =
    d.onboardingInstallmentAmountARS != null ? Number(d.onboardingInstallmentAmountARS) : NaN;
  if (!Number.isFinite(amt) || amt <= 0) amt = DEFAULT_ONBOARDING_INSTALLMENT_ARS;
  let total = d.onboardingInstallmentsTotal != null ? Number(d.onboardingInstallmentsTotal) : NaN;
  if (!Number.isFinite(total) || total < 1) total = DEFAULT_ONBOARDING_INSTALLMENTS_TOTAL;
  if (total > 24) total = 24;
  return {
    onboardingInstallmentAmountARS: Math.round(amt * 100) / 100,
    onboardingInstallmentsTotal: Math.floor(total)
  };
}

function amountMatchesMercadoPago(actual, expected) {
  const a = Number(actual);
  const e = Number(expected);
  if (!Number.isFinite(a) || !Number.isFinite(e) || e <= 0) return false;
  const tolerance = Math.max(5, e * 0.01);
  return Math.abs(a - e) <= tolerance;
}

module.exports = {
  DEFAULT_ONBOARDING_INSTALLMENT_ARS,
  DEFAULT_ONBOARDING_INSTALLMENTS_TOTAL,
  resolveOnboardingFromDoc,
  amountMatchesMercadoPago
};
