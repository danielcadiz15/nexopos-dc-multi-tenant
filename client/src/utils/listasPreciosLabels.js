/** Claves internas en productos/listas_precios — la UI puede mostrar otras etiquetas (p. ej. Lista 1). */
export const LISTA_PRECIO_KEYS = ['mayorista', 'interior', 'posadas'];

const FALLBACK_LABELS = {
  mayorista: 'Mayorista',
  interior: 'Interior',
  posadas: 'Posadas'
};

export function etiquetaLista(empresaConfig, key) {
  const raw = empresaConfig?.listas_precios_etiquetas?.[key];
  if (raw != null && String(raw).trim() !== '') return String(raw).trim();
  return FALLBACK_LABELS[key] || key;
}

/** Valida lista por defecto en PV (solo claves conocidas). */
export function listaPuntoVentaDefaultValida(key) {
  const k = String(key || '').trim();
  return LISTA_PRECIO_KEYS.includes(k) ? k : null;
}
