/**
 * Catálogo comunitario NexoPOS (GTIN): datos aportados por empresas para reutilizar en altas.
 */
import ApiService from './api.service';

const api = new ApiService('/barcode-catalog');

/**
 * Datos que otras empresas ya guardaron para este GTIN (Firestore `catalogo_global_nexopos`).
 * @param {string} gtin
 * @returns {Promise<{ ok: boolean, motivo?: string, nombre?: string, descripcion?: string, marca?: string, presentacion?: string, urlProducto?: string, fuente?: string }>}
 */
export async function buscarGtinCatalogoComunidad(gtin) {
  const digits = String(gtin || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) {
    return { ok: false, motivo: 'invalid_length' };
  }
  try {
    const { data, status } = await api.get(`/gtin-comunidad/${encodeURIComponent(digits)}`, {});
    if (typeof status === 'number' && status >= 400) {
      return { ok: false, motivo: 'http' };
    }
    const inner = data?.data ?? data;
    if (!inner || typeof inner.ok !== 'boolean') {
      return { ok: false, motivo: 'http' };
    }
    return inner;
  } catch (e) {
    console.warn('[barcodeCatalog] comunidad:', e?.message || e);
    return { ok: false, motivo: 'network' };
  }
}

/**
 * @param {{ gtin: string, nombre: string, descripcion?: string, fuente?: string }} params
 */
export async function contribuirCatalogoComunidad({ gtin, nombre, descripcion = '', fuente = 'empresa' }) {
  const { data, status } = await api.post(
    '/contribuir',
    { gtin, nombre, descripcion: descripcion || '', fuente },
    {}
  );
  if (typeof status === 'number' && status >= 400) {
    throw new Error(data?.message || 'No se pudo actualizar el catálogo comunitario');
  }
  return data;
}

/** @deprecated usar contribuirCatalogoComunidad */
export async function contribuirCatalogoGlobalManual(params) {
  return contribuirCatalogoComunidad({ ...params, fuente: params.fuente || 'manual_empresa' });
}
