/**
 * Proxy UPCitemdb (evita CORS) y catálogo comunitario NexoPOS (GTIN compartido entre empresas).
 * Lectura: otros clientes ya cargaron ese código. Escritura: merge al guardar producto o alta manual.
 * Las ventas siguen usando /productos del tenant.
 */
const admin = require('firebase-admin');

const db = admin.firestore();

const UPC_TRIAL_URL = 'https://api.upcitemdb.com/prod/trial/lookup';

const GLOBAL_COLLECTION = 'catalogo_global_nexopos';

function normalizeGtin(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

async function fetchJsonWithTimeout(url, opts = {}, ms = 10000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: ac.signal,
      headers: {
        Accept: 'application/json',
        ...(opts.headers || {})
      }
    });
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(t);
  }
}

function mapUpcItemDbToProducto(json) {
  const items = Array.isArray(json.items) ? json.items : [];
  const first = items[0];
  if (!first) {
    return { ok: false, motivo: 'not_found' };
  }
  const nombre = String(first.title || first.model || '').trim();
  if (!nombre) {
    return { ok: false, motivo: 'empty_product' };
  }
  const partes = [];
  if (first.brand && String(first.brand).trim()) {
    partes.push(`Marca: ${String(first.brand).trim()}`);
  }
  if (first.category && String(first.category).trim()) {
    partes.push(`Categoría: ${String(first.category).trim()}`);
  }
  if (first.description && String(first.description).trim()) {
    partes.push(String(first.description).trim());
  }
  const descripcion = partes.join('\n').trim();
  return {
    ok: true,
    nombre,
    descripcion,
    marca: (first.brand && String(first.brand).trim()) || '',
    presentacion: '',
    urlProducto: (first.images && first.images[0]) || '',
    fuente: 'upcitemdb'
  };
}

/**
 * @param {import('firebase-functions').Request} req
 * @param {import('firebase-functions').Response} res
 * @param {string} path
 * @returns {Promise<boolean>}
 */
async function barcodeCatalogRoutes(req, res, path) {
  try {
    if (path.match(/^\/barcode-catalog\/gtin-comunidad\/[^/]+$/) && req.method === 'GET') {
      const gtin = normalizeGtin(path.split('/').pop());
      if (!gtin) {
        res.status(400).json({ success: false, message: 'GTIN inválido (8–14 dígitos)' });
        return true;
      }
      const snap = await db.collection(GLOBAL_COLLECTION).doc(gtin).get();
      if (!snap.exists) {
        res.json({ success: true, data: { ok: false, motivo: 'not_found' } });
        return true;
      }
      const d = snap.data() || {};
      const nombre = String(d.nombre || '').trim();
      if (!nombre) {
        res.json({ success: true, data: { ok: false, motivo: 'empty_product' } });
        return true;
      }
      res.json({
        success: true,
        data: {
          ok: true,
          nombre,
          descripcion: String(d.descripcion || '').trim(),
          marca: String(d.marca || '').trim(),
          presentacion: String(d.presentacion || '').trim(),
          urlProducto: String(d.urlProducto || '').trim(),
          fuente: 'nexopos_comunidad'
        }
      });
      return true;
    }

    if (path.match(/^\/barcode-catalog\/upc\/[^/]+$/) && req.method === 'GET') {
      const upc = path.split('/').pop();
      const gtin = normalizeGtin(upc);
      if (!gtin) {
        res.status(400).json({ success: false, message: 'Código GTIN inválido (8–14 dígitos)' });
        return true;
      }

      const url = `${UPC_TRIAL_URL}?upc=${encodeURIComponent(gtin)}`;
      const { ok, status, json } = await fetchJsonWithTimeout(url, { method: 'GET' }, 12000);

      if (!ok || status === 429) {
        res.json({
          success: true,
          data: { ok: false, motivo: status === 429 ? 'rate_limit' : 'http' }
        });
        return true;
      }

      if (json.code && String(json.code).toUpperCase() !== 'OK' && (!json.items || json.items.length === 0)) {
        res.json({ success: true, data: { ok: false, motivo: 'not_found' } });
        return true;
      }

      const mapped = mapUpcItemDbToProducto(json);
      res.json({ success: true, data: mapped });
      return true;
    }

    if (
      (path === '/barcode-catalog/contribuir' || path === '/barcode-catalog/contribuir-manual') &&
      req.method === 'POST'
    ) {
      const companyId = req.companyId || req.user?.companyId || req.query?.orgId || null;
      const body = req.body || {};
      const gtin = normalizeGtin(body.gtin || body.codigo);
      const nombre = String(body.nombre || '').trim().slice(0, 500);
      const descripcion = String(body.descripcion || '').trim().slice(0, 4000);
      const fuenteUltima = String(body.fuente || body.fuenteOrigen || 'empresa')
        .trim()
        .slice(0, 64);

      if (!gtin) {
        res.status(400).json({ success: false, message: 'GTIN inválido' });
        return true;
      }
      if (!nombre) {
        res.status(400).json({ success: false, message: 'Nombre requerido' });
        return true;
      }

      const ref = db.collection(GLOBAL_COLLECTION).doc(gtin);
      await ref.set(
        {
          gtin,
          nombre,
          descripcion,
          fuenteUltima,
          orgIdUltimoContribuyente: companyId || null,
          actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      res.json({ success: true, message: 'Catálogo comunitario NexoPOS actualizado' });
      return true;
    }

    return false;
  } catch (e) {
    console.error('[barcode-catalog]', e);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: e.message || 'Error interno' });
    }
    return true;
  }
}

module.exports = barcodeCatalogRoutes;
module.exports.GLOBAL_COLLECTION = GLOBAL_COLLECTION;
