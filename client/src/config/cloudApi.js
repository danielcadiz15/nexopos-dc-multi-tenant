/**
 * Base URL del backend en Cloud Run, con prefijo /api (misma regla que ApiService).
 * Centralizado para no usar localhost en builds de producción en otros servicios.
 */
export function getCloudApiBaseUrl() {
  const rootEnv = process.env.REACT_APP_FIREBASE_FUNCTIONS_URL || process.env.REACT_APP_API_URL;
  const defaultRoot = 'https://api-5q2i5764zq-uc.a.run.app';
  let root = defaultRoot;
  if (rootEnv && typeof rootEnv === 'string' && rootEnv.trim()) {
    root = rootEnv.trim().replace(/\/$/, '');
  }
  if (/gestionsimple|cloudfunctions\.net/i.test(root)) {
    root = defaultRoot;
  }
  const needsApiPrefix = !/\/api(\/|$)/i.test(root);
  return needsApiPrefix ? `${root}/api` : root;
}
