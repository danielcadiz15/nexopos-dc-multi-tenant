import { normalizeLicensePlan } from './planTiers';

/**
 * Alta modelo onboarding_v2: primeras N cuotas a monto fijo (plataforma); después precio del plan elegido.
 */
export function isOnboardingPaymentPhase(lic, billingMp) {
  if (!lic || lic.billingModel !== 'onboarding_v2') return false;
  const slots = Number(billingMp?.onboardingInstallmentsTotal ?? 2);
  const paid = Math.min(Number(lic.onboardingInstallmentsPaid ?? 0), slots);
  return paid < slots;
}

/** Monto del próximo checkout en ARS (instalación o plan recurrente). */
export function getNextBillingAmountARS(lic, billingMp) {
  if (isOnboardingPaymentPhase(lic, billingMp)) {
    return Number(billingMp?.onboardingInstallmentAmountARS ?? 0);
  }
  const planKey = normalizeLicensePlan(lic?.chosenPlan || lic?.plan);
  return Number(billingMp?.planPrices?.[planKey] ?? billingMp?.monthlyPriceARS ?? 0);
}

/** Plan que se envía a la preferencia MP (define `chosenPlan` / cuota futura). */
export function getPreferredCheckoutPlan(lic) {
  return normalizeLicensePlan(lic?.chosenPlan || lic?.plan);
}
