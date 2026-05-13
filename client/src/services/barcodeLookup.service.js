/**
 * Flujo de carga por código de barras (solo pantalla de productos / POS alta):
 * catálogo comunitario NexoPOS (Firebase) → caché navegador → Open Food Facts → UPCitemdb.
 * La verificación de duplicado en la empresa se hace en la UI vía /productos/registrado-por-codigo.
 *
 * @see https://world.openfoodfacts.org/
 * @see https://www.upcitemdb.com/wp/docs/main/development/getting-started/
 */

import ApiService from './api.service';
import { buscarGtinCatalogoComunidad } from './barcodeCatalog.service';

const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v0/product';

const CACHE_PREFIX = 'nexopos_gtin_cache_v1:';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** @typedef {'nexopos_comunidad'|'openfoodfacts'|'upcitemdb'|'cache'} BarcodeFuente */

/**
 * @param {string} codigoRaw
 * @returns {string|null} solo dígitos 8–14 o null
 */
export function normalizarGtin(codigoRaw) {
  const digits = String(codigoRaw || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

function readCache(gtin) {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + gtin);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.ts !== 'number' || !entry.payload) return null;
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      window.localStorage.removeItem(CACHE_PREFIX + gtin);
      return null;
    }
    return entry.payload;
  } catch {
    return null;
  }
}

function writeCache(gtin, payload) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      CACHE_PREFIX + gtin,
      JSON.stringify({ ts: Date.now(), payload })
    );
  } catch {
    /* quota o modo privado */
  }
}

const upcApi = new ApiService('/barcode-catalog');

/**
 * Consulta UPCitemdb a través de Cloud Functions (trial; límites según proveedor).
 * @param {string} gtin
 * @returns {Promise<{ ok: boolean, motivo?: string, nombre?: string, descripcion?: string, marca?: string, presentacion?: string, urlProducto?: string, fuente?: BarcodeFuente }>}
 */
export async function buscarProductoUpcItemDb(gtin) {
  const digits = normalizarGtin(gtin);
  if (!digits) {
    return { ok: false, motivo: 'invalid_length' };
  }
  try {
    const { data, status } = await upcApi.get(`/upc/${encodeURIComponent(digits)}`, {});
    if (typeof status === 'number' && status >= 400) {
      return { ok: false, motivo: 'http' };
    }
    const inner = data?.data ?? data;
    if (!inner || typeof inner.ok !== 'boolean') {
      return { ok: false, motivo: 'http' };
    }
    return inner;
  } catch (e) {
    console.warn('[barcodeLookup] UPCitemdb proxy:', e?.message || e);
    return { ok: false, motivo: 'network' };
  }
}

/**
 * @param {string} codigoRaw
 * @returns {Promise<{
 *   ok: boolean,
 *   motivo?: 'invalid_length'|'not_found'|'http'|'empty_product'|'network',
 *   nombre?: string,
 *   descripcion?: string,
 *   marca?: string,
 *   presentacion?: string,
 *   urlProducto?: string,
 *   fuente?: BarcodeFuente
 * }>}
 */
export async function buscarProductoOpenFoodFacts(codigoRaw) {
  const digits = normalizarGtin(codigoRaw);
  if (!digits) {
    return { ok: false, motivo: 'invalid_length' };
  }

  const url = `${OFF_PRODUCT_URL}/${encodeURIComponent(digits)}.json`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      return { ok: false, motivo: 'http' };
    }

    const data = await res.json();

    if (data.status !== 1 || !data.product) {
      return { ok: false, motivo: 'not_found' };
    }

    const p = data.product;
    const nombre =
      (p.product_name_es && String(p.product_name_es).trim()) ||
      (p.product_name && String(p.product_name).trim()) ||
      (p.product_name_en && String(p.product_name_en).trim()) ||
      (p.generic_name_es && String(p.generic_name_es).trim()) ||
      (p.generic_name && String(p.generic_name).trim()) ||
      '';

    if (!nombre) {
      return { ok: false, motivo: 'empty_product' };
    }

    const partes = [];
    if (p.brands && String(p.brands).trim()) {
      partes.push(`Marca: ${String(p.brands).trim()}`);
    }
    if (p.quantity && String(p.quantity).trim()) {
      partes.push(`Presentación: ${String(p.quantity).trim()}`);
    }
    const gen = (p.generic_name_es || p.generic_name || '').trim();
    if (gen && gen !== nombre) {
      partes.push(gen);
    }

    const descripcion = partes.join('\n').trim();

    return {
      ok: true,
      nombre,
      descripcion,
      marca: (p.brands && String(p.brands).trim()) || '',
      presentacion: (p.quantity && String(p.quantity).trim()) || '',
      urlProducto: `https://world.openfoodfacts.org/product/${digits}`,
      fuente: 'openfoodfacts'
    };
  } catch (e) {
    console.warn('[barcodeLookup] Open Food Facts:', e?.message || e);
    return { ok: false, motivo: 'network' };
  }
}

/**
 * Caché → Open Food Facts → UPCitemdb. No consulta la base del tenant (eso lo hace la UI).
 * @param {string} codigoRaw
 */
export async function buscarCadenaExternaConCache(codigoRaw) {
  const digits = normalizarGtin(codigoRaw);
  if (!digits) {
    return { ok: false, motivo: 'invalid_length' };
  }

  const com = await buscarGtinCatalogoComunidad(digits);
  if (com.ok) {
    const payload = { ...com, fuente: 'nexopos_comunidad' };
    writeCache(digits, {
      ok: true,
      nombre: com.nombre,
      descripcion: com.descripcion,
      marca: com.marca,
      presentacion: com.presentacion,
      urlProducto: com.urlProducto,
      fuente: 'nexopos_comunidad'
    });
    return payload;
  }

  const cached = readCache(digits);
  if (cached && cached.ok) {
    return {
      ...cached,
      fuente: 'cache',
      fuenteReal: cached.fuente || 'cache'
    };
  }

  const off = await buscarProductoOpenFoodFacts(digits);
  if (off.ok) {
    const payload = { ...off, fuente: 'openfoodfacts' };
    writeCache(digits, { ok: true, nombre: off.nombre, descripcion: off.descripcion, marca: off.marca, presentacion: off.presentacion, urlProducto: off.urlProducto, fuente: 'openfoodfacts' });
    return payload;
  }

  const upc = await buscarProductoUpcItemDb(digits);
  if (upc.ok) {
    const payload = { ...upc, fuente: 'upcitemdb' };
    writeCache(digits, {
      ok: true,
      nombre: upc.nombre,
      descripcion: upc.descripcion,
      marca: upc.marca,
      presentacion: upc.presentacion,
      urlProducto: upc.urlProducto,
      fuente: 'upcitemdb'
    });
    return payload;
  }

  return { ok: false, motivo: off.motivo === 'not_found' && upc.motivo === 'not_found' ? 'not_found' : upc.motivo || off.motivo || 'not_found' };
}
