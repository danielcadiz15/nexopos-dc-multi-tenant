// src/services/api.service.js - REEMPLAZAR COMPLETO
import { auth } from '../firebase/config';
import { getCloudApiBaseUrl } from '../config/cloudApi';
import { ensureDeviceId, ensureSessionId, getSessionStartedAtMs } from '../utils/sessionControl';

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

function emitSessionBlocked(body) {
  const msg = body?.message || 'Sesión restringida';
  const detail = body && typeof body === 'object' ? body : { message: msg };
  try {
    window.dispatchEvent(new CustomEvent('auth:force-logout', { detail: { ...detail, message: msg } }));
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
    const deviceId = ensureDeviceId();
    const sessionId = ensureSessionId();
    const sessionStartedAtMs = getSessionStartedAtMs();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(deviceId && { 'x-nexo-device-id': deviceId }),
      ...(sessionId && { 'x-nexo-session-id': sessionId }),
      ...(sessionStartedAtMs && { 'x-nexo-session-started-at': String(sessionStartedAtMs) })
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
    if ([401, 409, 429].includes(response.status) && String(data?.code || '').startsWith('SESSION_')) {
      emitSessionBlocked(data);
    }
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
    if ([401, 409, 429].includes(response.status) && String(responseData?.code || '').startsWith('SESSION_')) {
      emitSessionBlocked(responseData);
    }
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
    if ([401, 409, 429].includes(response.status) && String(responseData?.code || '').startsWith('SESSION_')) {
      emitSessionBlocked(responseData);
    }
    if (response.status === 402) {
      emitLicense402(responseData);
    } else {
      try { window.dispatchEvent(new CustomEvent('license:ok')); } catch {}
    }
    return { data: responseData, status: response.status };
  }

  async patch(endpoint = '', data = {}, params = {}) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(this.buildUrl(endpoint, params), {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    const responseData = await response.json().catch(() => ({}));
    if ([401, 409, 429].includes(response.status) && String(responseData?.code || '').startsWith('SESSION_')) {
      emitSessionBlocked(responseData);
    }
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
    if ([401, 409, 429].includes(response.status) && String(responseData?.code || '').startsWith('SESSION_')) {
      emitSessionBlocked(responseData);
    }
    if (response.status === 402) {
      emitLicense402(responseData);
    } else {
      try { window.dispatchEvent(new CustomEvent('license:ok')); } catch {}
    }
    return { data: responseData, status: response.status };
  }
}

export default ApiService;