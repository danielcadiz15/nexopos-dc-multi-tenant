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
    } catch {}
    this.baseURL = root;
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
    if (!params || Object.keys(params).length === 0) return url;
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
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

  async post(endpoint = '', data = {}) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(this.buildUrl(endpoint), {
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

  async put(endpoint = '', data = {}) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(this.buildUrl(endpoint), {
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

  async delete(endpoint = '', data = {}) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(this.buildUrl(endpoint), {
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