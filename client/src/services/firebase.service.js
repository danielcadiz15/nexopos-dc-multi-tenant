// services/firebase.service.js - helpers multi-tenant + clase base
import { httpsCallable } from 'firebase/functions';
import { collection, doc } from 'firebase/firestore';
import { auth, db, functions } from '../firebase/config';
import ApiService from './api.service';

// Clase base compatible: usa Cloud Functions REST (ApiService)
class FirebaseService {
  constructor(basePath = '') {
    this.api = new ApiService(basePath);
  }
  async get(endpoint = '', params = {}) { return (await this.api.get(endpoint, params)).data; }
  async post(endpoint = '', data = {}) { return (await this.api.post(endpoint, data)).data; }
  async put(endpoint = '', data = {}) { return (await this.api.put(endpoint, data)).data; }
  async delete(endpoint = '', data = {}) { return (await this.api.delete(endpoint, data)).data; }
  ensureArray(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
  ensureObject(v) { return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }
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

export default FirebaseService;