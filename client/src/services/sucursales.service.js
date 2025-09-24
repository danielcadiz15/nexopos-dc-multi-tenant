// src/services/sucursales.service.js
import FirebaseService from './firebase.service';

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

/**
 * Servicio para gestión de sucursales con Firebase
 */
class SucursalesService extends FirebaseService {
  constructor() {
    super('/sucursales');
  }

  /**
   * Obtiene todas las sucursales
   * @returns {Promise<Array>} Lista de sucursales
   */
  async obtenerTodas() {
    try {
      console.log('🔄 Obteniendo todas las sucursales...');
      const sucursales = await this.get('');
      
      const sucursalesArray = this.ensureArray(sucursales);
      
      if (sucursalesArray.length === 0) {
        console.log('⚠️ No hay sucursales, usando datos de respaldo');
        return SUCURSALES_RESPALDO;
      }
      
      console.log(`✅ Sucursales cargadas: ${sucursalesArray.length}`);
      return sucursalesArray;
      
    } catch (error) {
      console.error('❌ Error al obtener sucursales:', error);
      console.log('🔄 Usando datos de respaldo');
      return SUCURSALES_RESPALDO;
    }
  }

  /**
   * Obtiene sucursales activas
   * @returns {Promise<Array>} Lista de sucursales activas
   */
  async obtenerActivas() {
    try {
      console.log('🔄 [SUCURSALES SERVICE] Obteniendo sucursales activas...');
      const sucursales = await this.get('/activas');
      console.log('🔄 [SUCURSALES SERVICE] Respuesta de API:', sucursales);
      
      const sucursalesArray = this.ensureArray(sucursales);
      console.log('🔄 [SUCURSALES SERVICE] Sucursales procesadas:', sucursalesArray.length, sucursalesArray);
      
      if (sucursalesArray.length === 0) {
        const activas = SUCURSALES_RESPALDO.filter(s => s.activa);
        console.log('⚠️ [SUCURSALES SERVICE] Usando sucursales activas de respaldo:', activas);
        return activas;
      }
      
      console.log(`✅ [SUCURSALES SERVICE] Sucursales activas: ${sucursalesArray.length}`);
      return sucursalesArray;
      
    } catch (error) {
      console.error('❌ [SUCURSALES SERVICE] Error al obtener sucursales activas:', error);
      const activas = SUCURSALES_RESPALDO.filter(s => s.activa);
      console.log('🔄 [SUCURSALES SERVICE] Usando sucursales de respaldo por error:', activas);
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
      return sucursalObj;
      
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
      console.log(`📦 Obteniendo stock de sucursal ${sucursalId}`);
      const stock = await this.get(`/${sucursalId}/stock`);
      
      const stockArray = this.ensureArray(stock);
      console.log(`✅ Stock obtenido: ${stockArray.length} productos`);
      
      return stockArray;
    } catch (error) {
      console.error(`❌ Error al obtener stock de sucursal ${sucursalId}:`, error);
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
      console.log(`👤 Obteniendo sucursales del usuario ${usuarioId}`);
      const sucursales = await this.get(`/usuario/${usuarioId}`);
      
      const sucursalesArray = this.ensureArray(sucursales);
      console.log(`✅ Sucursales del usuario: ${sucursalesArray.length}`);
      
      return sucursalesArray;
    } catch (error) {
      console.error(`❌ Error al obtener sucursales del usuario ${usuarioId}:`, error);
      return [];
    }
  }
}

export default new SucursalesService();