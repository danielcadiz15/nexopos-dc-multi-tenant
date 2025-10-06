// services/firebase.service.js - helpers multi-tenant + clase base
import { httpsCallable } from 'firebase/functions';
import { collection, doc } from 'firebase/firestore';
import { auth, db, functions } from '../firebase/config';
import ApiService from './api.service';

const API_ENVELOPE_META_KEYS = new Set([
  'success',
  'message',
  'error',
  'errors',
  'total',
  'status',
  'code',
  'timestamp'
]);

const API_COLLECTION_KEYS = [
  'data',
  'items',
  'results',
  'records',
  'rows',
  'list'
];

const API_OBJECT_KEYS = [
  'data',
  'item',
  'result',
  'record',
  'payload'
];

const isPlainObject = (value) => (
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value)
);

const unwrapApiPayload = (input) => {
  if (input === undefined || input === null) {
    return input;
  }

  let current = input;

  if (isPlainObject(current) && 'data' in current && 'status' in current && Object.keys(current).length <= 2) {
    current = current.data;
  }

  let safety = 0;
  while (safety < 5 && isPlainObject(current)) {
    safety += 1;

    if ('data' in current) {
      const inner = current.data;
      if (inner !== undefined) {
        current = inner;
        continue;
      }
    }

    let collectionKey;
    for (const key of API_COLLECTION_KEYS) {
      if (Array.isArray(current[key])) {
        collectionKey = key;
        break;
      }
    }
    if (collectionKey) {
      current = current[collectionKey];
      break;
    }

    let objectKey;
    for (const key of API_OBJECT_KEYS) {
      if (isPlainObject(current[key])) {
        objectKey = key;
        break;
      }
    }
    if (objectKey) {
      current = current[objectKey];
      continue;
    }

    if (Object.keys(current).length === 0) {
      return current;
    }

    if (Object.keys(current).every((key) => API_ENVELOPE_META_KEYS.has(key))) {
      return undefined;
    }

    break;
  }

  return current;
};

const ensureArrayResponse = (value) => {
  const normalized = unwrapApiPayload(value);

  if (Array.isArray(normalized)) {
    return normalized;
  }

  if (isPlainObject(normalized)) {
    for (const key of API_COLLECTION_KEYS) {
      if (Array.isArray(normalized[key])) {
        return normalized[key];
      }
    }

    if (Object.keys(normalized).every((key) => API_ENVELOPE_META_KEYS.has(key))) {
      return [];
    }
  }

  if (normalized === undefined || normalized === null) {
    return [];
  }

  return [normalized];
};

const ensureObjectResponse = (value) => {
  const normalized = unwrapApiPayload(value);

  if (isPlainObject(normalized)) {
    if (Object.keys(normalized).every((key) => API_ENVELOPE_META_KEYS.has(key))) {
      return {};
    }

    return normalized;
  }

  return {};
};

// Clase base compatible: usa Cloud Functions REST (ApiService)
class FirebaseService {
  constructor(basePath = '') {
    this.api = new ApiService(basePath);
  }

  normalizeResponse(response) {
    return unwrapApiPayload(response);
  }

  async get(endpoint = '', params = {}) {
    const response = await this.api.get(endpoint, params);
    const { data, status } = response || {};
    if (typeof status === 'number' && status >= 400) {
      const message = (data && (data.message || data.error)) || 'Error en la solicitud GET';
      const error = new Error(message);
      error.response = { status, data };
      throw error;
    }
    return unwrapApiPayload({ data, status });
  }

  async post(endpoint = '', data = {}) {
    const response = await this.api.post(endpoint, data);
    const { data: respData, status } = response || {};
    if (typeof status === 'number' && status >= 400) {
      const message = (respData && (respData.message || respData.error)) || 'Error en la solicitud POST';
      const error = new Error(message);
      error.response = { status, data: respData };
      throw error;
    }
    return unwrapApiPayload({ data: respData, status });
  }

  async put(endpoint = '', data = {}) {
    const response = await this.api.put(endpoint, data);
    const { data: respData, status } = response || {};
    if (typeof status === 'number' && status >= 400) {
      const message = (respData && (respData.message || respData.error)) || 'Error en la solicitud PUT';
      const error = new Error(message);
      error.response = { status, data: respData };
      throw error;
    }
    return unwrapApiPayload({ data: respData, status });
  }

  async delete(endpoint = '', data = {}) {
    const response = await this.api.delete(endpoint, data);
    const { data: respData, status } = response || {};
    if (typeof status === 'number' && status >= 400) {
      const message = (respData && (respData.message || respData.error)) || 'Error en la solicitud DELETE';
      const error = new Error(message);
      error.response = { status, data: respData };
      throw error;
    }
    return unwrapApiPayload({ data: respData, status });
  }

  ensureArray(value) {
    return ensureArrayResponse(value);
  }

  ensureObject(value) {
    return ensureObjectResponse(value);
  }
}

export function tenantCol(orgId, path) {
  return collection(db, `tenants/${orgId}/${path}`);
}

export function tenantDoc(orgId, path, id) {
  return doc(db, `tenants/${orgId}/${path}/${id}`);
}

export async function createTenant(nombre, slug) {
  const callable = httpsCallable(functions, 'createTenant');
  const res = await callable({ nombre, slug });
  return res.data;
}

export async function joinTenant(joinCode) {
  const callable = httpsCallable(functions, 'joinTenant');
  const res = await callable({ joinCode });
  return res.data;
}

export async function setActiveTenant(orgId) {
  const callable = httpsCallable(functions, 'setActiveTenant');
  const res = await callable({ orgId });
  return res.data;
}

export function getCurrentUser() { return auth.currentUser; }

export { ensureArrayResponse as ensureArray, ensureObjectResponse as ensureObject, unwrapApiPayload as normalizePayload };

export default FirebaseService;