/**
 * Facturación de licencias con Mercado Pago (Argentina / ARS).
 * - Preferencia Checkout: un pago → +30 días desde acreditación (metadata / external_reference = orgId)
 * - Preapproval: débito recurrente; cada cobro aprobado dispara webhook
 * - Webhook: confirma pago vía GET /payments/:id y extiende paidUntil (idempotente)
 */

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const db = admin.firestore();
const { authenticateUser } = require('../utils/auth');
const { PLAN_TIERS, normalizePlan } = require('../utils/planTiers');
const { getModulePresetForPlan } = require('../utils/modulePresets');
const {
  resolveOnboardingFromDoc,
  amountMatchesMercadoPago
} = require('../utils/onboardingBilling');

const MP_API = 'https://api.mercadopago.com';

const PLAN_LABEL_ES = {
  basic: 'Básica',
  intermediate: 'Intermedia',
  premium: 'Premium'
};

const DEFAULT_PLAN_PRICES_ARS = {
  basic: 80000,
  intermediate: 120000,
  premium: 180000
};

function getAccessToken() {
  const fromEnv = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();
  try {
    const c = typeof functions.config === 'function' ? functions.config() : {};
    const t = c?.mercadopago?.access_token || c?.mp?.token;
    if (t && String(t).trim()) return String(t).trim();
  } catch {
    /* functions.config() no disponible fuera de Firebase */
  }
  return '';
}

async function mpFetch(path, options = {}) {
  const token = getAccessToken();
  if (!token) {
    const err = new Error('Mercado Pago no configurado (falta MERCADOPAGO_ACCESS_TOKEN)');
    err.code = 'MP_NOT_CONFIGURED';
    throw err;
  }
  const res = await fetch(`${MP_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || res.statusText || 'Error Mercado Pago');
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

function emptyPlanPrices() {
  return { ...DEFAULT_PLAN_PRICES_ARS };
}

async function loadBillingConfig() {
  let legacyMonthly = Number(process.env.LICENSE_MONTHLY_PRICE_ARS || 0);
  const planPrices = emptyPlanPrices();
  let billingDoc = {};
  try {
    const snap = await db.collection('platform').doc('billing').get();
    if (snap.exists) {
      billingDoc = snap.data() || {};
      const d = billingDoc;
      if (d.monthlyPriceARS != null && !Number.isNaN(Number(d.monthlyPriceARS))) {
        legacyMonthly = Number(d.monthlyPriceARS);
      }
      const pp = d.planPrices && typeof d.planPrices === 'object' ? d.planPrices : {};
      for (const k of PLAN_TIERS) {
        if (pp[k] != null && !Number.isNaN(Number(pp[k]))) {
          planPrices[k] = Number(pp[k]);
        }
      }
    }
  } catch (e) {
    console.warn('[billing] loadBillingConfig:', e.message);
  }
  if (planPrices.basic <= 0 && legacyMonthly > 0) {
    planPrices.basic = legacyMonthly;
  }
  const monthlyPriceARS = planPrices.basic;
  const onboardingMerged = resolveOnboardingFromDoc(billingDoc);
  return {
    monthlyPriceARS,
    planPrices,
    currencyId: 'ARS',
    ...onboardingMerged
  };
}

function priceForPlan(cfg, planId) {
  const id = normalizePlan(planId);
  const n = cfg.planPrices[id];
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
}

function anyPlanHasPositivePrice(cfg) {
  return PLAN_TIERS.some((k) => priceForPlan(cfg, k) > 0);
}

function onboardingPaymentConfigured(cfg) {
  const a = cfg?.onboardingInstallmentAmountARS;
  return typeof a === 'number' && a > 0;
}

async function loadCompanyLicenseDoc(orgId) {
  const id = String(orgId || '').trim();
  if (!id) return {};
  try {
    let lic = {};
    const r = await db.collection('companies').doc(id).collection('config').doc('license').get();
    if (r.exists) lic = r.data() || {};
    if (!lic.paidUntil && Object.keys(lic).length === 0) {
      const r2 = await db.collection('licenses').doc(id).get();
      if (r2.exists) lic = { ...lic, ...(r2.data() || {}) };
    }
    return lic;
  } catch (e) {
    console.warn('[billing] loadCompanyLicenseDoc:', e.message);
    return {};
  }
}

async function loadCompanyPlanForBilling(orgId) {
  const id = String(orgId || '').trim();
  if (!id) return 'basic';
  try {
    const ref = db.collection('companies').doc(id).collection('config').doc('license');
    let snap = await ref.get();
    let lic = snap.exists ? snap.data() || {} : {};
    if (!lic.plan && !snap.exists) {
      const r2 = await db.collection('licenses').doc(id).get();
      if (r2.exists) lic = { ...lic, ...(r2.data() || {}) };
    }
    return normalizePlan(lic.plan);
  } catch (e) {
    console.warn('[billing] loadCompanyPlanForBilling:', e.message);
    return 'basic';
  }
}

async function resolvePlanFromApprovedPayment(payment, orgId, licSnap) {
  const meta = payment.metadata || {};
  const kind = String(meta.kind || '');
  const fromFuture = meta.future_plan || meta.chosen_plan;
  if ((kind === 'license_onboarding' || kind === 'onboarding') && fromFuture) {
    return normalizePlan(fromFuture);
  }

  const fromMeta = meta.plan || meta.plan_id;
  if (fromMeta && kind !== 'license_onboarding') return normalizePlan(fromMeta);

  const id = String(orgId || '').trim();
  if (!id) return 'basic';

  const lic = licSnap && typeof licSnap === 'object' ? licSnap : {};
  const fromLic = lic.mercadopagoBillingPlan || lic.chosenPlan || lic.plan;
  return normalizePlan(fromLic);
}

function getPublicAppUrl() {
  return (process.env.PUBLIC_APP_URL || 'https://nexopos-dc.web.app').replace(/\/$/, '');
}

function getWebhookUrl(req) {
  const fixed = process.env.MERCADOPAGO_WEBHOOK_URL;
  if (fixed && String(fixed).trim()) return String(fixed).trim();

  const base = process.env.PUBLIC_API_BASE;
  if (base && String(base).trim()) {
    return `${String(base).trim().replace(/\/$/, '')}/api/billing/mercadopago/webhook`;
  }
  const host = req.get?.('host') || '';
  if (host && !host.includes('localhost')) {
    const proto = (req.get?.('x-forwarded-proto') || 'https').split(',')[0].trim();
    return `${proto}://${host}/api/billing/mercadopago/webhook`;
  }
  return 'https://api-5q2i5764zq-uc.a.run.app/api/billing/mercadopago/webhook';
}

function resolveOrgIdFromPayment(payment) {
  const meta = payment.metadata || {};
  const fromMeta = meta.org_id || meta.orgId;
  if (fromMeta) return String(fromMeta);

  const ext = payment.external_reference;
  if (ext != null && String(ext).trim()) {
    const s = String(ext).trim();
    if (s.startsWith('org:')) return s.slice(4);
    return s;
  }
  return null;
}

const LICENSE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/** Fecha de acreditación del pago en MP (para anclar los 30 días). */
function paymentApprovedMs(payment) {
  if (!payment || typeof payment !== 'object') return Date.now();
  const parse = (s) => {
    if (!s) return null;
    const t = new Date(s).getTime();
    return Number.isNaN(t) ? null : t;
  };
  return (
    parse(payment.date_approved) ||
    parse(payment.date_last_updated) ||
    parse(payment.date_created) ||
    Date.now()
  );
}

/**
 * Modelo onboarding_v2 (alta nueva): primeras N cuotas a monto fijo + full; después precio por plan elegido y ajuste de módulos.
 * Empresas sin billingModel siguen sólo validando contra el precio del plan (comportamiento previo).
 */
function usesOnboardingInstallmentsModel(lic) {
  return lic && lic.billingModel === 'onboarding_v2';
}

/**
 * Extiende la licencia **30 días** desde la acreditación del pago.
 * @param {{ payment: object, cfg: object, branch: 'onboarding'|'recurring', applyModulesFromPlan?: boolean }} ctx
 */
async function extendLicenseAfterPayment(orgId, paymentId, sourceLabel, ctx) {
  const id = String(orgId).trim();
  const payment = ctx && ctx.payment;

  if (!id || !payment) return { skipped: true, reason: 'no_org_or_payment' };

  const txnId = `pay_${paymentId}`;
  const txnRef = db.collection('billingMercadoPago').doc(txnId);
  const { cfg, branch } = ctx;
  const meta = payment.metadata || {};

  return db.runTransaction(async (t) => {
    const txnSnap = await t.get(txnRef);
    if (txnSnap.exists) {
      return { alreadyApplied: true, paidUntil: txnSnap.get('paidUntil') || null };
    }

    const licRefCompany = db.collection('companies').doc(id).collection('config').doc('license');
    const licRefRoot = db.collection('licenses').doc(id);

    const licSnap = await t.get(licRefCompany);
    let lic = licSnap.exists ? licSnap.data() || {} : {};
    if (!lic.paidUntil) {
      const r2 = await t.get(licRefRoot);
      if (r2.exists) lic = { ...lic, ...(r2.data() || {}) };
    }

    const approvedMs = paymentApprovedMs(payment);
    let previousEnd = lic.paidUntil ? new Date(lic.paidUntil).getTime() : approvedMs;
    if (Number.isNaN(previousEnd)) previousEnd = approvedMs;
    const base = Math.max(approvedMs, previousEnd);
    const paidUntil = new Date(base + LICENSE_PERIOD_MS).toISOString();

    const mergedChosenPlan = normalizePlan(
      meta.future_plan ||
        meta.chosen_plan ||
        (branch === 'recurring' ? meta.plan || meta.plan_id : null) ||
        lic.chosenPlan ||
        lic.plan ||
        'basic'
    );

    const slots = cfg.onboardingInstallmentsTotal || 2;
    let onboardingPaid = Number(lic.onboardingInstallmentsPaid || 0);
    if (Number.isNaN(onboardingPaid) || onboardingPaid < 0) onboardingPaid = 0;
    if (onboardingPaid > slots) onboardingPaid = slots;

    /** Plan efectivo en documento licencia tras este pago. */
    let planToStore =
      branch === 'onboarding'
        ? 'premium'
        : normalizePlan(meta.plan || meta.plan_id || lic.chosenPlan || mergedChosenPlan || 'basic');

    let onboardingInstallmentsPaidNext = onboardingPaid;
    if (branch === 'onboarding') {
      onboardingInstallmentsPaidNext = Math.min(onboardingPaid + 1, slots);
    }

    const payload = {
      ...lic,
      paidUntil,
      blocked: false,
      onboardingInstallmentsPaid: onboardingInstallmentsPaidNext,
      chosenPlan: mergedChosenPlan,
      plan: planToStore,
      lastMercadoPagoPaymentId: String(paymentId),
      lastMercadoPagoAt: new Date().toISOString(),
      lastMercadoPagoSource: sourceLabel || 'webhook',
      updatedAt: new Date().toISOString()
    };

    if (payload.trial === true) {
      payload.trial = admin.firestore.FieldValue.delete();
    }
    payload.trialDays = admin.firestore.FieldValue.delete();
    payload.trialStartedAt = admin.firestore.FieldValue.delete();
    payload.unpaidGraceStartedAt = admin.firestore.FieldValue.delete();

    /** Primera vez que pasa a abono recurrente: alinear módulos al plan contratado. */
    const shouldApplyModulePreset =
      branch === 'recurring' && ctx.applyModulesFromPlan === true && !lic.modulesAppliedForChosenPlanAt;

    if (shouldApplyModulePreset) {
      const preset = getModulePresetForPlan(planToStore);
      preset.updatedAt = new Date().toISOString();

      const modRefC = db.collection('companies').doc(id).collection('config').doc('modules');
      const modRefT = db.collection('tenants').doc(id).collection('config').doc('modules');
      t.set(modRefC, preset, { merge: true });
      t.set(modRefT, preset, { merge: true });

      payload.modulesAppliedForChosenPlanAt = new Date().toISOString();
    }

    t.set(txnRef, {
      orgId: id,
      paymentId: String(paymentId),
      source: sourceLabel || 'webhook',
      paidUntil,
      branch,
      plan: payload.plan || null,
      onboardingInstallmentsPaid: onboardingInstallmentsPaidNext,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    t.set(licRefCompany, payload, { merge: true });
    t.set(licRefRoot, payload, { merge: true });

    return {
      alreadyApplied: false,
      paidUntil,
      plan: payload.plan || null,
      branch,
      onboardingInstallmentsPaid: onboardingInstallmentsPaidNext
    };
  });
}

async function processPaymentNotification(paymentId) {
  if (!paymentId) return;
  const payment = await mpFetch(`/v1/payments/${paymentId}`, { method: 'GET' });
  if (payment.status !== 'approved') {
    console.log('[MP] pago no aprobado:', paymentId, payment.status);
    return;
  }

  const orgId = resolveOrgIdFromPayment(payment);
  if (!orgId) {
    console.warn('[MP] pago sin orgId en metadata/external_reference:', paymentId);
    return;
  }

  const cfg = await loadBillingConfig();
  const lic = await loadCompanyLicenseDoc(orgId);
  const txAmount = Number(payment.transaction_amount);

  /** Legado — sin modelo onboarding */
  let branch;
  let applyModulesFromPlan = false;

  if (!usesOnboardingInstallmentsModel(lic)) {
    branch = 'recurring';
    const planPay = await resolvePlanFromApprovedPayment(payment, orgId, lic);
    const expected = priceForPlan(cfg, planPay);
    if (!(expected > 0)) {
      console.warn('[MP] precio de plan no configurado (legado)', orgId, planPay);
      return;
    }
    if (!amountMatchesMercadoPago(txAmount, expected)) {
      console.warn('[MP] monto MP no coincide con plan (legado). Esperado:', expected, 'recibido:', txAmount);
      return;
    }
    applyModulesFromPlan = false;
  } else {
    const onboardingPaid = Math.min(
      Number(lic.onboardingInstallmentsPaid || 0),
      cfg.onboardingInstallmentsTotal
    );

    if (onboardingPaid < cfg.onboardingInstallmentsTotal) {
      branch = 'onboarding';
      if (!amountMatchesMercadoPago(txAmount, cfg.onboardingInstallmentAmountARS)) {
        console.warn(
          '[MP] monto instalación esperado:',
          cfg.onboardingInstallmentAmountARS,
          'recibido:',
          txAmount
        );
        return;
      }
    } else {
      branch = 'recurring';
      const planPay = await resolvePlanFromApprovedPayment(payment, orgId, lic);
      const expected = priceForPlan(cfg, planPay);
      if (!(expected > 0)) {
        console.warn('[MP] precio recurrente no configurado', orgId, planPay);
        return;
      }
      if (!amountMatchesMercadoPago(txAmount, expected)) {
        console.warn('[MP] monto MP no coincide con plan recurrente. Esperado:', expected, 'recibido:', txAmount);
        return;
      }

      /** Sólo al primer cobro después de las cuotas de instalación. */
      const slots = cfg.onboardingInstallmentsTotal;
      applyModulesFromPlan = onboardingPaid === slots && !lic.modulesAppliedForChosenPlanAt;
    }
  }

  const result = await extendLicenseAfterPayment(orgId, paymentId, 'payment_approved', {
    payment,
    cfg,
    branch,
    applyModulesFromPlan
  });

  console.log('[MP] licencia extendida:', orgId, result);
}

function handleWebhook(req, res) {
  const body = req.body || {};
  let paymentId = body.data?.id;

  if (!paymentId && req.query && String(req.query.topic || '') === 'payment') {
    paymentId = req.query.id || req.query['data.id'];
  }
  if (!paymentId && body.type === 'payment' && body.data?.id) {
    paymentId = body.data.id;
  }

  res.status(200).send('OK');

  if (!paymentId) {
    return;
  }

  setImmediate(() => {
    processPaymentNotification(String(paymentId)).catch((e) =>
      console.error('[MP webhook] error:', e.message, e.body || '')
    );
  });
}

async function ensureAuthCompany(req, res) {
  return new Promise((resolve) => {
    authenticateUser(req, res, () => {
      if (!req.user || !req.companyId) {
        res.status(401).json({ success: false, message: 'Iniciá sesión y seleccioná una empresa' });
        return resolve(null);
      }
      resolve(req.companyId);
    });
  });
}

/**
 * Datos del comprador para Checkout Pro.
 * No inventamos apellido «marcador» (p. ej. NexoPOS): en MLA eso puede dejar el flujo de tarjeta
 * con validaciones raras o el botón Pagar inactivo hasta corregir datos. Si no hay nombre real,
 * enviamos solo email y MP pide titular en el checkout.
 */
function buildCheckoutPayer(req) {
  const u = req.user || {};
  const email = String(u.email || '').trim();
  const payer = {};
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    payer.email = email;
  }

  const nombre = String(u.nombre || '').trim();
  const apellido = String(u.apellido || '').trim();
  if (nombre && apellido) {
    payer.name = nombre;
    payer.surname = apellido;
  } else {
    const rawName = String(u.nombre || u.name || '').trim();
    if (rawName) {
      const parts = rawName.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        payer.name = parts[0];
        payer.surname = parts.slice(1).join(' ');
      }
      // Un solo token (ej. solo nombre en Auth): no enviamos name sin surname; MP lo completa en checkout.
    }
  }

  const docRaw = String(u.dni || u.dni_cuit || u.documento || u.cuit || '').replace(/\D/g, '');
  if (docRaw.length === 11) {
    payer.identification = { type: 'CUIT', number: docRaw };
  } else if (docRaw.length >= 7 && docRaw.length <= 8) {
    payer.identification = { type: 'DNI', number: docRaw };
  }

  return Object.keys(payer).length ? payer : undefined;
}

module.exports = async function billingMercadoPagoRoutes(req, res, path) {
  if (path === '/billing/mercadopago/webhook') {
    if (req.method === 'POST' || req.method === 'GET') {
      handleWebhook(req, res);
      return true;
    }
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return true;
  }

  if (path === '/billing/mercadopago/public-config' && req.method === 'GET') {
    try {
      const cfg = await loadBillingConfig();
      const tokenOk = Boolean(getAccessToken());
      res.json({
        success: true,
        data: {
          monthlyPriceARS: cfg.monthlyPriceARS,
          planPrices: cfg.planPrices,
          currencyId: cfg.currencyId,
          /** Access token cargado (secreto o env); no implica precio configurado. */
          mercadoPagoTokenPresent: tokenOk,
          onboardingInstallmentAmountARS: cfg.onboardingInstallmentAmountARS,
          onboardingInstallmentsTotal: cfg.onboardingInstallmentsTotal,
          mercadoPagoConfigured:
            tokenOk && (anyPlanHasPositivePrice(cfg) || onboardingPaymentConfigured(cfg))
        }
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
    return true;
  }

  if (path === '/billing/mercadopago/preference' && req.method === 'POST') {
    const orgId = await ensureAuthCompany(req, res);
    if (!orgId) return true;

    try {
      const cfg = await loadBillingConfig();
      if (!getAccessToken()) {
        return res.status(503).json({
          success: false,
          message: 'Pagos online no configurados. Contactá al administrador.'
        });
      }

      const body = req.body || {};
      const requestedPlan = body.plan != null ? normalizePlan(body.plan) : null;
      const plan = requestedPlan || (await loadCompanyPlanForBilling(orgId));

      const licPre = await loadCompanyLicenseDoc(orgId);
      const slots = cfg.onboardingInstallmentsTotal;
      const useOb = usesOnboardingInstallmentsModel(licPre);
      const onboardingPaid = Math.min(
        Number(licPre.onboardingInstallmentsPaid || 0),
        slots
      );
      const inOnboardingPayments = useOb && onboardingPaid < slots;

      if (inOnboardingPayments && !onboardingPaymentConfigured(cfg)) {
        return res.status(503).json({
          success: false,
          message:
            'Falta monto de cuota de instalación en la plataforma (panel administración → facturación).'
        });
      }

      let unitPrice;
      let preferenceItem;
      /** @type {Record<string,string>} */
      let metadata;

      if (inOnboardingPayments) {
        unitPrice = cfg.onboardingInstallmentAmountARS;
        const nextCuota = onboardingPaid + 1;
        const title = `NexoPOS — Instalación (${nextCuota}/${slots})`;
        preferenceItem = {
          id: `nexopos_onboarding_${nextCuota}`,
          title,
          description: `Cuota instalación equipo — versión completa hasta completar período inicial.`,
          quantity: 1,
          unit_price: Math.round(Number(unitPrice) * 100) / 100,
          currency_id: cfg.currencyId
        };
        metadata = {
          org_id: orgId,
          kind: 'license_onboarding',
          future_plan: String(plan),
          onboarding_quota_index: String(nextCuota),
          onboarding_quota_total: String(slots)
        };
      } else {
        unitPrice = priceForPlan(cfg, plan);
        if (!(unitPrice > 0)) {
          return res.status(503).json({
            success: false,
            message: `Precio no configurado para el plan «${plan}» (panel admin → planPrices o platform/billing).`
          });
        }
        const planLabel = PLAN_LABEL_ES[plan] || plan;
        preferenceItem = {
          id: `nexopos_license_1m_${plan}`,
          title: `NexoPOS — Abono (${planLabel})`,
          description: `Licencia software — ${planLabel} — 30 días.`,
          quantity: 1,
          unit_price: Math.round(Number(unitPrice) * 100) / 100,
          currency_id: cfg.currencyId
        };
        metadata = {
          org_id: orgId,
          kind: 'license_month',
          plan: String(plan)
        };
      }

      const chosenPatch = {
        chosenPlan: plan,
        mercadopagoBillingPlan: plan,
        updatedAt: new Date().toISOString()
      };
      await db.collection('companies').doc(orgId).collection('config').doc('license').set(chosenPatch, {
        merge: true
      });
      await db.collection('licenses').doc(orgId).set(chosenPatch, { merge: true });

      const appUrl = getPublicAppUrl();
      const notificationUrl = getWebhookUrl(req);
      const payerObj = buildCheckoutPayer(req);

      const preferenceBody = {
        items: [preferenceItem],
        external_reference: `org:${orgId}`,
        metadata,
        back_urls: {
          success: `${appUrl}/?mp=approved`,
          failure: `${appUrl}/?mp=failure`,
          pending: `${appUrl}/?mp=pending`
        },
        notification_url: notificationUrl,
        statement_descriptor: 'NEXOPOS'
      };
      if (payerObj) preferenceBody.payer = payerObj;

      const preference = await mpFetch('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify(preferenceBody)
      });

      res.json({
        success: true,
        data: {
          init_point: preference.init_point,
          sandbox_init_point: preference.sandbox_init_point,
          preference_id: preference.id,
          billingPhase: inOnboardingPayments ? 'onboarding' : 'recurring',
          nextAmountARS: preferenceItem.unit_price
        }
      });
    } catch (e) {
      console.error('[MP preference]', e);
      res.status(e.status || 500).json({
        success: false,
        message: e.message,
        detail: e.body || null
      });
    }
    return true;
  }

  if (path === '/billing/mercadopago/preapproval' && req.method === 'POST') {
    const orgId = await ensureAuthCompany(req, res);
    if (!orgId) return true;

    try {
      const cfg = await loadBillingConfig();
      const licEarly = await loadCompanyLicenseDoc(orgId);
      if (
        usesOnboardingInstallmentsModel(licEarly) &&
        Number(licEarly.onboardingInstallmentsPaid || 0) < cfg.onboardingInstallmentsTotal
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Completá primero las cuotas de instalación con el botón «Renovar / Pagar». Después podés usar débito automático mensual.'
        });
      }
      if (!getAccessToken()) {
        return res.status(503).json({
          success: false,
          message: 'Pagos online no configurados.'
        });
      }

      const body = req.body || {};
      const requestedPlan = body.plan != null ? normalizePlan(body.plan) : null;
      const plan = requestedPlan || (await loadCompanyPlanForBilling(orgId));
      const unitPrice = priceForPlan(cfg, plan);
      if (!(unitPrice > 0)) {
        return res.status(503).json({
          success: false,
          message: `Precio no configurado para el plan «${plan}».`
        });
      }

      const appUrl = getPublicAppUrl();
      const notificationUrl = getWebhookUrl(req);
      const payerEmail = req.user.email;
      if (!payerEmail) {
        return res.status(400).json({ success: false, message: 'Tu usuario no tiene email para Mercado Pago' });
      }

      const start = new Date();
      start.setMinutes(start.getMinutes() + 5);
      const end = new Date();
      end.setFullYear(end.getFullYear() + 3);

      const planLabel = PLAN_LABEL_ES[plan] || plan;

      const pre = await mpFetch('/preapproval', {
        method: 'POST',
        body: JSON.stringify({
          reason: `Abono mensual NexoPOS (${planLabel})`,
          external_reference: `org:${orgId}`,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: unitPrice,
            currency_id: cfg.currencyId,
            start_date: start.toISOString(),
            end_date: end.toISOString()
          },
          payer_email: payerEmail,
          back_url: `${appUrl}/?mp=sub_return`,
          status: 'pending',
          ...(notificationUrl ? { notification_url: notificationUrl } : {})
        })
      });

      await db.collection('companies').doc(orgId).collection('config').doc('license').set(
        {
          mercadopagoPreapprovalId: String(pre.id),
          mercadopagoPreapprovalStatus: pre.status || 'pending',
          mercadopagoBillingPlan: plan,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      await db.collection('licenses').doc(orgId).set(
        {
          mercadopagoPreapprovalId: String(pre.id),
          mercadopagoPreapprovalStatus: pre.status || 'pending',
          mercadopagoBillingPlan: plan,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );

      res.json({
        success: true,
        data: {
          init_point: pre.init_point,
          sandbox_init_point: pre.sandbox_init_point,
          id: pre.id
        }
      });
    } catch (e) {
      console.error('[MP preapproval]', e);
      res.status(e.status || 500).json({
        success: false,
        message: e.message,
        detail: e.body || null
      });
    }
    return true;
  }

  return false;
};
