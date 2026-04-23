// src/services/sucursales.service.js
import FirebaseService, { ensureArray as ensureArrayPayload } from './firebase.service';

// Datos de respaldo para sucursales
const SUCURSALES_RESPALDO = [
  {
    id: '1',
    nombre: 'Sucursal Principal',
    direccion: 'Dirección principal',
    telefono: '',
    tipo: 'principal',
    activa: true,
    fechaCreacion: new Date().toISOString()
  },
  {
    id: '2',
    nombre: 'Sucursal Móvil',
    direccion: 'Móvil',
    telefono: '',
    tipo: 'movil',
    activa: true,
    fechaCreacion: new Date().toISOString()
  }
];

const resolveSucursalId = (sucursal = {}) => {
  const rawId = (
    sucursal?.id ||
    sucursal?._id ||
    sucursal?.sucursal_id ||
    null
  );

  return rawId === null || rawId === undefined ? null : String(rawId);
};

const normalizeSucursal = (sucursal = {}) => {
  const normalizedId = resolveSucursalId(sucursal);
  if (!normalizedId) {
    return sucursal;
  }
  return {
    ...sucursal,
    id: normalizedId
  };
};

/**
 * Servicio para gestión de sucursales con Firebase
 */
class SucursalesService extends FirebaseService {
  constructor() {
    super('/sucursales');
  }

  getOrgQuery(params = {}) {
    const hasWindow = typeof window !== 'undefined';
    const storage = hasWindow ? window.localStorage : null;
    const authContext = hasWindow ? window.authContext : null;

    const storedOrgId =
      params?.orgId ||
      storage?.getItem?.('orgId') ||
      storage?.getItem?.('companyId') ||
      null;

    const contextOrgId =
      authContext?.orgId ||
      authContext?.currentUser?.orgId ||
      null;

    const orgId = storedOrgId || contextOrgId || null;
    return orgId ? { ...params, orgId } : params;
  }

  filterByOrgId(items = [], orgId) {
    if (!orgId) return items;
    try {
      const filtered = (items || []).filter((s) => (s?.orgId || s?.companyId) === orgId);
      if (filtered.length !== items.length) {
        console.log(`[SUCURSALES SERVICE] Filtradas por orgId=${orgId}: ${filtered.length}/${items.length}`);
      }
      return filtered;
    } catch {
      return items;
    }
  }

  normalizeSucursales(items = []) {
    return (items || []).map((sucursal) => normalizeSucursal(sucursal));
  }

  /**
   * Obtiene todas las sucursales
   * @returns {Promise<Array>} Lista de sucursales
   */
  async obtenerTodas() {
    try {
      console.log('[SUCURSALES SERVICE] Obteniendo todas las sucursales…');
      const orgQuery = this.getOrgQuery();
      const response = await this.api.get('', orgQuery);

      let sucursalesArray = ensureArrayPayload(response?.data);
      sucursalesArray = this.filterByOrgId(sucursalesArray, orgQuery?.orgId);
      sucursalesArray = this.normalizeSucursales(sucursalesArray);

      if (sucursalesArray.length === 0) {
        console.log('[SUCURSALES SERVICE] No hay sucursales, usando datos de respaldo');
        return SUCURSALES_RESPALDO;
      }

      console.log(`[SUCURSALES SERVICE] Sucursales cargadas: ${sucursalesArray.length}`);
      return sucursalesArray;

    } catch (error) {
      console.error('[SUCURSALES SERVICE] Error al obtener sucursales:', error);
      console.log('[SUCURSALES SERVICE] Usando datos de respaldo');
      return SUCURSALES_RESPALDO;
    }
  }

  /**
   * Obtiene sucursales activas
   * @returns {Promise<Array>} Lista de sucursales activas
   */
  async obtenerActivas() {
    try {
      console.log('[SUCURSALES SERVICE] Obteniendo sucursales activas…');
      const orgQuery = this.getOrgQuery();
      const response = await this.api.get('/activas', orgQuery);
      let sucursalesArray = ensureArrayPayload(response?.data);
      sucursalesArray = this.filterByOrgId(sucursalesArray, orgQuery?.orgId);
      sucursalesArray = this.normalizeSucursales(sucursalesArray);

      if (sucursalesArray.length === 0) {
        const activas = SUCURSALES_RESPALDO.filter(s => s.activa);
        console.log('[SUCURSALES SERVICE] Usando sucursales activas de respaldo');
        return activas;
      }

      console.log(`[SUCURSALES SERVICE] Sucursales activas: ${sucursalesArray.length}`);
      return sucursalesArray;

    } catch (error) {
      console.error('[SUCURSALES SERVICE] Error al obtener sucursales activas:', error);
      const activas = SUCURSALES_RESPALDO.filter(s => s.activa);
      console.log('[SUCURSALES SERVICE] Usando sucursales de respaldo por error');
      return activas;
    }
  }

  /**
   * Obtiene una sucursal por su ID
   * @param {string} id - ID de la sucursal
   * @returns {Promise<Object>} Sucursal
   */
  async obtenerPorId(id) {
    try {
      console.log(`🔄 Obteniendo sucursal ID: ${id}`);
      const sucursal = await this.get(`/${id}`);
      
      const sucursalObj = this.ensureObject(sucursal);
      
      if (!sucursalObj || Object.keys(sucursalObj).length === 0) {
        const sucursalRespaldo = SUCURSALES_RESPALDO.find(s => s.id === id);
        if (sucursalRespaldo) {
          console.log('⚠️ Usando sucursal de respaldo');
          return sucursalRespaldo;
        }
        throw new Error(`Sucursal ${id} no encontrada`);
      }
      
      console.log(`✅ Sucursal obtenida:`, sucursalObj);
      return normalizeSucursal(sucursalObj);
      
    } catch (error) {
      console.error(`❌ Error al obtener sucursal ${id}:`, error);
      
      const sucursalRespaldo = SUCURSALES_RESPALDO.find(s => s.id === id);
      if (sucursalRespaldo) {
        console.log('⚠️ Usando sucursal de respaldo');
        return sucursalRespaldo;
      }
      
      throw error;
    }
  }

  /**
   * Crea una nueva sucursal
   * @param {Object} sucursal - Datos de la sucursal
   * @returns {Promise<Object>} Sucursal creada
   */
  async crear(sucursal) {
    try {
      console.log('🆕 Creando sucursal:', sucursal);
      
      const sucursalFormateada = {
        ...sucursal,
        nombre: sucursal.nombre?.trim() || '',
        direccion: sucursal.direccion?.trim() || '',
        telefono: sucursal.telefono?.trim() || '',
        tipo: sucursal.tipo || 'secundaria',
        activa: sucursal.activa !== false
      };
      
      if (!sucursalFormateada.nombre) {
        throw new Error('El nombre de la sucursal es requerido');
      }
      
      const resultado = await this.post('', sucursalFormateada);
      console.log('✅ Sucursal creada:', resultado);
      
      return resultado;
    } catch (error) {
      console.error('❌ Error al crear sucursal:', error);
      throw error;
    }
  }

  /**
   * Actualiza una sucursal existente
   * @param {string} id - ID de la sucursal
   * @param {Object} sucursal - Nuevos datos
   * @returns {Promise<Object>} Respuesta de la actualización
   */
  async actualizar(id, sucursal) {
    try {
      console.log(`🔄 Actualizando sucursal ${id}:`, sucursal);
      
      const sucursalFormateada = {
        ...sucursal,
        nombre: sucursal.nombre?.trim() || '',
        direccion: sucursal.direccion?.trim() || '',
        telefono: sucursal.telefono?.trim() || ''
      };
      
      if (!sucursalFormateada.nombre) {
        throw new Error('El nombre de la sucursal es requerido');
      }
      
      const resultado = await this.put(`/${id}`, sucursalFormateada);
      console.log('✅ Sucursal actualizada:', resultado);
      
      return resultado;
    } catch (error) {
      console.error(`❌ Error al actualizar sucursal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el stock de productos de una sucursal
   * @param {string} sucursalId - ID de la sucursal
   * @returns {Promise<Array>} Stock de la sucursal
   */
  async obtenerStock(sucursalId) {
    try {
      console.log(`[SUCURSALES SERVICE] Obteniendo stock de la sucursal ${sucursalId}`);
      const response = await this.api.get(`/${sucursalId}/stock`, this.getOrgQuery());

      const stockArray = ensureArrayPayload(response?.data);
      console.log(`[SUCURSALES SERVICE] Stock obtenido: ${stockArray.length} productos`);

      return stockArray;
    } catch (error) {
      console.error(`[SUCURSALES SERVICE] Error al obtener stock de sucursal ${sucursalId}:`, error);
      return [];
    }
  }

  /**
   * Obtiene las sucursales asignadas a un usuario
   * @param {string} usuarioId - ID del usuario
   * @returns {Promise<Array>} Sucursales del usuario
   */
  async obtenerPorUsuario(usuarioId) {
    try {
      console.log(`[SUCURSALES SERVICE] Obteniendo sucursales del usuario ${usuarioId}`);
      const orgQuery = this.getOrgQuery();
      const response = await this.api.get(`/usuario/${usuarioId}`, orgQuery);

      const sucursalesArray = this.filterByOrgId(ensureArrayPayload(response?.data), orgQuery?.orgId);
      const sucursalesNormalizadas = this.normalizeSucursales(sucursalesArray);
      console.log(`[SUCURSALES SERVICE] Sucursales del usuario: ${sucursalesNormalizadas.length}`);

      return sucursalesNormalizadas;
    } catch (error) {
      console.error(`[SUCURSALES SERVICE] Error al obtener sucursales del usuario ${usuarioId}:`, error);
      return [];
    }
  }
}

export default new SucursalesService();