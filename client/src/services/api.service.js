// src/services/api.service.js - REEMPLAZAR COMPLETO
import { auth } from '../firebase/config';

class ApiService {
  constructor(basePath = '') {
    // Forzar el uso del proyecto correcto en minúsculas
    const projectId = 'nexopos-dc';
    const rootEnv = process.env.REACT_APP_FIREBASE_FUNCTIONS_URL || process.env.REACT_APP_API_URL;
    // Preferir URL 2ª gen (Cloud Run) desplegada
    const defaultRoot = 'https://api-5q2i5764zq-uc.a.run.app';
    let root = defaultRoot;
    try {
      if (rootEnv && typeof rootEnv === 'string') {
        root = rootEnv;
      }
      // Cortafuego: nunca permitir endpoints antiguos
      if (/gestionsimple|cloudfunctions\.net/i.test(root)) {
        root = defaultRoot;
      }
      // Si el frontend corre en un dominio publico (tunel/hosting) no puede consumir localhost.
      // En ese caso, hacemos fallback al endpoint publico para evitar pantallas sin datos en Android.
      const isLocalApi = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(root);
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      const isLocalFrontend = /^(localhost|127\.0\.0\.1)$/i.test(currentHost);
      if (isLocalApi && !isLocalFrontend) {
        root = defaultRoot;
      }
    } catch {}
    // Asegurar prefijo /api para Cloud Run (Functions v2)
    const needsApiPrefix = !/\/api(\/|$)/i.test(root);
    this.baseURL = needsApiPrefix ? `${root}/api` : root;
    try { console.log('🌐 [API] baseURL:', this.baseURL); } catch {}
    this.basePath = basePath; // ej: '/productos'
  }

  async getAuthHeaders() {
    const token = await auth.currentUser?.getIdToken?.();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  buildUrl(endpoint = '', params) {
    const url = `${this.baseURL}${this.basePath}${endpoint}`;
    // Inyectar orgId automáticamente si está disponible y no viene en params
    let finalParams = params || {};
    try {
      const alreadyHasOrg = finalParams && Object.prototype.hasOwnProperty.call(finalParams, 'orgId');
      if (!alreadyHasOrg) {
        let orgId;
        try { orgId = window?.authContext?.orgId || window?.authContext?.state?.orgId; } catch {}
        if (!orgId) {
          try { orgId = localStorage.getItem('orgId'); } catch {}
        }
        if (orgId) {
          finalParams = { ...finalParams, orgId };
        }
      }
    } catch {}

    if (!finalParams || Object.keys(finalParams).length === 0) return url;
    const qs = new URLSearchParams();
    Object.entries(finalParams).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      qs.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    });
    return `${url}?${qs.toString()}`;
  }

  async get(endpoint = '', params = {}) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(this.buildUrl(endpoint, params), { method: 'GET', headers });
    const data = await response.json().catch(() => ({}));
    if (response.status === 402) {
      try { window.dispatchEvent(new CustomEvent('license:blocked', { detail: data?.message || 'Licencia inválida' })); } catch {}
    } else {
      try { window.dispatchEvent(new CustomEvent('license:ok')); } catch {}
    }
    return { data, status: response.status };
  }

  async post(endpoint = '', data = {}, params = {}) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(this.buildUrl(endpoint, params), {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    const responseData = await response.json().catch(() => ({}));
    if (response.status === 402) {
      try { window.dispatchEvent(new CustomEvent('license:blocked', { detail: responseData?.message || 'Licencia inválida' })); } catch {}
    } else {
      try { window.dispatchEvent(new CustomEvent('license:ok')); } catch {}
    }
    return { data: responseData, status: response.status };
  }

  async put(endpoint = '', data = {}, params = {}) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(this.buildUrl(endpoint, params), {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    const responseData = await response.json().catch(() => ({}));
    if (response.status === 402) {
      try { window.dispatchEvent(new CustomEvent('license:blocked', { detail: responseData?.message || 'Licencia inválida' })); } catch {}
    } else {
      try { window.dispatchEvent(new CustomEvent('license:ok')); } catch {}
    }
    return { data: responseData, status: response.status };
  }

  async delete(endpoint = '', data = {}, params = {}) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(this.buildUrl(endpoint, params), {
      method: 'DELETE',
      headers,
      body: Object.keys(data || {}).length ? JSON.stringify(data) : undefined
    });
    const responseData = await response.json().catch(() => ({}));
    if (response.status === 402) {
      try { window.dispatchEvent(new CustomEvent('license:blocked', { detail: responseData?.message || 'Licencia inválida' })); } catch {}
    } else {
      try { window.dispatchEvent(new CustomEvent('license:ok')); } catch {}
    }
    return { data: responseData, status: response.status };
  }
}

export default ApiService;