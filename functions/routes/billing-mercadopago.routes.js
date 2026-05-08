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

const MP_API = 'https://api.mercadopago.com';

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

async function loadBillingConfig() {
  let monthlyPriceARS = Number(process.env.LICENSE_MONTHLY_PRICE_ARS || 0);
  try {
    const snap = await db.collection('platform').doc('billing').get();
    if (snap.exists) {
      const d = snap.data() || {};
      if (d.monthlyPriceARS != null && !Number.isNaN(Number(d.monthlyPriceARS))) {
        monthlyPriceARS = Number(d.monthlyPriceARS);
      }
    }
  } catch (e) {
    console.warn('[billing] loadBillingConfig:', e.message);
  }
  return { monthlyPriceARS, currencyId: 'ARS' };
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

async function extendLicenseByOneMonth(orgId, paymentId, sourceLabel) {
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

    t.set(txnRef, {
      orgId: id,
      paymentId: String(paymentId),
      source: sourceLabel || 'webhook',
      paidUntil,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    t.set(licRefCompany, payload, { merge: true });
    t.set(licRefRoot, payload, { merge: true });

    return { alreadyApplied: false, paidUntil };
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

  const result = await extendLicenseByOneMonth(orgId, paymentId, 'payment_approved');
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
          currencyId: cfg.currencyId,
          mercadoPagoConfigured: tokenOk && cfg.monthlyPriceARS > 0
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
      if (!(cfg.monthlyPriceARS > 0)) {
        return res.status(503).json({
          success: false,
          message: 'Precio de licencia no configurado (platform/billing o LICENSE_MONTHLY_PRICE_ARS).'
        });
      }

      const appUrl = getPublicAppUrl();
      const notificationUrl = getWebhookUrl(req);
      const payerEmail = req.user.email || '';

      const preference = await mpFetch('/checkout/preferences', {
        method: 'POST',
        body: JSON.stringify({
          items: [
            {
              id: 'nexopos_license_1m',
              title: 'NexoPOS — Licencia 1 mes',
              description: `Organización ${orgId}`,
              quantity: 1,
              unit_price: cfg.monthlyPriceARS,
              currency_id: cfg.currencyId
            }
          ],
          payer: payerEmail ? { email: payerEmail } : undefined,
          external_reference: `org:${orgId}`,
          metadata: {
            org_id: orgId,
            kind: 'license_month'
          },
          back_urls: {
            success: `${appUrl}/configuracion/empresa?mp=approved`,
            failure: `${appUrl}/configuracion/empresa?mp=failure`,
            pending: `${appUrl}/configuracion/empresa?mp=pending`
          },
          auto_return: 'approved',
          notification_url: notificationUrl,
          statement_descriptor: 'NEXOPOS LIC'
        })
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
      if (!(cfg.monthlyPriceARS > 0)) {
        return res.status(503).json({
          success: false,
          message: 'Precio de licencia no configurado.'
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

      const pre = await mpFetch('/preapproval', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Abono mensual NexoPOS',
          external_reference: `org:${orgId}`,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: cfg.monthlyPriceARS,
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
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      await db.collection('licenses').doc(orgId).set(
        {
          mercadopagoPreapprovalId: String(pre.id),
          mercadopagoPreapprovalStatus: pre.status || 'pending',
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
