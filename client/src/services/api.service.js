// src/services/api.service.js - REEMPLAZAR COMPLETO
import { auth } from '../firebase/config';
import { getCloudApiBaseUrl } from '../config/cloudApi';

function emitLicense402(body) {
  const msg = body?.message || 'Licencia inválida';
  const detail =
    body && typeof body === 'object'
      ? {
          message: msg,
          code: body.code,
          graceEndsAt: body.graceEndsAt,
          pagoBilleteraUrl: body.pagoBilleteraUrl
        }
      : { message: msg };
  try {
    window.dispatchEvent(new CustomEvent('license:blocked', { detail }));
  } catch {}
}

class ApiService {
  constructor(basePath = '') {
    this.baseURL = getCloudApiBaseUrl();
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
      emitLicense402(data);
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
      emitLicense402(responseData);
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
      emitLicense402(responseData);
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
      emitLicense402(responseData);
    } else {
      try { window.dispatchEvent(new CustomEvent('license:ok')); } catch {}
    }
    return { data: responseData, status: response.status };
  }
}

export default ApiService;