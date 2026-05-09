/**
 * Facturación de licencias con Mercado Pago (Argentina / ARS).
 * - Preferencia Checkout: un pago → +1 mes (metadata / external_reference = orgId)
 * - Preapproval: débito recurrente mensual; cada cobro aprobado dispara webhook
 * - Webhook: confirma pago vía GET /payments/:id y extiende paidUntil (idempotente)
 */

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const db = admin.firestore();
const { authenticateUser } = require('../utils/auth');
const { PLAN_TIERS, normalizePlan } = require('../utils/planTiers');

const MP_API = 'https://api.mercadopago.com';

const PLAN_LABEL_ES = {
  basic: 'Básica',
  intermediate: 'Intermedia',
  premium: 'Premium'
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
  return { basic: 0, intermediate: 0, premium: 0 };
}

async function loadBillingConfig() {
  let legacyMonthly = Number(process.env.LICENSE_MONTHLY_PRICE_ARS || 0);
  const planPrices = emptyPlanPrices();
  try {
    const snap = await db.collection('platform').doc('billing').get();
    if (snap.exists) {
      const d = snap.data() || {};
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
  return { monthlyPriceARS, planPrices, currencyId: 'ARS' };
}

function priceForPlan(cfg, planId) {
  const id = normalizePlan(planId);
  const n = cfg.planPrices[id];
  return typeof n === 'number' && !Number.isNaN(n) ? n : 0;
}

function anyPlanHasPositivePrice(cfg) {
  return PLAN_TIERS.some((k) => priceForPlan(cfg, k) > 0);
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

async function resolvePlanFromApprovedPayment(payment, orgId) {
  const meta = payment.metadata || {};
  const fromMeta = meta.plan || meta.plan_id;
  if (fromMeta) return normalizePlan(fromMeta);

  const id = String(orgId || '').trim();
  if (!id) return null;
  try {
    const snap = await db.collection('companies').doc(id).collection('config').doc('license').get();
    const lic = snap.exists ? snap.data() || {} : {};
    const fromLic = lic.mercadopagoBillingPlan || lic.plan;
    return normalizePlan(fromLic);
  } catch {
    return 'basic';
  }
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

async function extendLicenseByOneMonth(orgId, paymentId, sourceLabel, planToApply = null) {
  const id = String(orgId).trim();
  if (!id) return { skipped: true, reason: 'no_org' };

  const txnId = `pay_${paymentId}`;
  const txnRef = db.collection('billingMercadoPago').doc(txnId);

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

    const now = Date.now();
    let currentEnd = lic.paidUntil ? new Date(lic.paidUntil).getTime() : now;
    if (Number.isNaN(currentEnd)) currentEnd = now;
    const baseMs = Math.max(now, currentEnd);
    const newDate = new Date(baseMs);
    newDate.setMonth(newDate.getMonth() + 1);
    const paidUntil = newDate.toISOString();

    const payload = {
      ...lic,
      paidUntil,
      blocked: false,
      lastMercadoPagoPaymentId: String(paymentId),
      lastMercadoPagoAt: new Date().toISOString(),
      lastMercadoPagoSource: sourceLabel || 'webhook',
      updatedAt: new Date().toISOString()
    };

    if (planToApply != null && String(planToApply).trim() !== '') {
      payload.plan = normalizePlan(planToApply);
    }

    payload.unpaidGraceStartedAt = admin.firestore.FieldValue.delete();

    t.set(txnRef, {
      orgId: id,
      paymentId: String(paymentId),
      source: sourceLabel || 'webhook',
      paidUntil,
      plan: payload.plan || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    t.set(licRefCompany, payload, { merge: true });
    t.set(licRefRoot, payload, { merge: true });

    return { alreadyApplied: false, paidUntil, plan: payload.plan || null };
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

  const planToApply = await resolvePlanFromApprovedPayment(payment, orgId);
  const result = await extendLicenseByOneMonth(orgId, paymentId, 'payment_approved', planToApply);
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
          /** Al menos un plan con precio mensual mayor a cero. */
          mercadoPagoConfigured: tokenOk && anyPlanHasPositivePrice(cfg)
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
      const unitPrice = priceForPlan(cfg, plan);
      if (!(unitPrice > 0)) {
        return res.status(503).json({
          success: false,
          message: `Precio no configurado para el plan «${plan}» (panel admin → planPrices o platform/billing).`
        });
      }

      const appUrl = getPublicAppUrl();
      const notificationUrl = getWebhookUrl(req);
      const planLabel = PLAN_LABEL_ES[plan] || plan;
      const unitPriceRounded = Math.round(Number(unitPrice) * 100) / 100;
      const payerObj = buildCheckoutPayer(req);

      const preferenceBody = {
        items: [
          {
            id: `nexopos_license_1m_${plan}`,
            title: `NexoPOS — Licencia 1 mes (${planLabel})`,
            description: `Licencia software — plan ${planLabel}`,
            quantity: 1,
            unit_price: unitPriceRounded,
            currency_id: cfg.currencyId
          }
        ],
        external_reference: `org:${orgId}`,
        metadata: {
          org_id: orgId,
          kind: 'license_month',
          plan: String(plan)
        },
        back_urls: {
          success: `${appUrl}/configuracion/empresa?mp=approved`,
          failure: `${appUrl}/configuracion/empresa?mp=failure`,
          pending: `${appUrl}/configuracion/empresa?mp=pending`
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
          preference_id: preference.id
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
          back_url: `${appUrl}/configuracion/empresa?mp=sub_return`,
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
