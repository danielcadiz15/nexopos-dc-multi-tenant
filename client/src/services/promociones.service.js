// src/services/promociones.service.js
import FirebaseService from './firebase.service';

/**
 * Servicio para gestión de promociones
 */
class PromocionesService extends FirebaseService {
  constructor() {
    super('/promociones');
  }
  
  /**
   * Obtiene todas las promociones
   * @returns {Promise<Array>} Lista de promociones
   */
  async obtenerTodas() {
    try {
      const data = await this.get('');
     return data;
    } catch (error) {
      console.error('Error al obtener promociones:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene las promociones activas
   * @returns {Promise<Array>} Lista de promociones activas
   */
  async obtenerActivas() {
    try {
      const data = await this.get('/activas');
      return data;
    } catch (error) {
      console.error('Error al obtener promociones activas:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene una promoción por ID
   * @param {string} id - ID de la promoción
   * @returns {Promise<Object>} Promoción
   */
  async obtenerPorId(id) {
    try {
      const data = await this.get(`/${id}`);
      return this.ensureObject(data);
    } catch (error) {
      console.error('Error al obtener promoción:', error);
      throw error;
    }
  }
  
  /**
   * Crea una nueva promoción
   * @param {Object} promocion - Datos de la promoción
   * @returns {Promise<Object>} Promoción creada
   */
  async crear(promocion) {
    try {
      const data = await this.post('', promocion);
      return this.ensureObject(data);
    } catch (error) {
      console.error('Error al crear promoción:', error);
      throw error;
    }
  }
  
  /**
   * Actualiza una promoción
   * @param {string} id - ID de la promoción
   * @param {Object} promocion - Datos actualizados
   * @returns {Promise<Object>} Promoción actualizada
   */
  async actualizar(id, promocion) {
    try {
      const data = await this.put(`/${id}`, promocion);
      return this.ensureObject(data);
    } catch (error) {
      console.error('Error al actualizar promoción:', error);
      throw error;
    }
  }
  
  /**
   * Cambia el estado de una promoción
   * @param {string} id - ID de la promoción
   * @param {boolean} activo - Nuevo estado
   * @returns {Promise<Object>} Resultado
   */
  async cambiarEstado(id, activo) {
    try {
      const data = await this.put(`/${id}/estado`, { activo });
      return this.ensureObject(data);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      throw error;
    }
  }
  
  /**
   * Elimina una promoción
   * @param {string} id - ID de la promoción
   * @returns {Promise<Object>} Resultado
   */
  async eliminar(id) {
    try {
      const data = await this.delete(`/${id}`);
      return this.ensureObject(data);
    } catch (error) {
      console.error('Error al eliminar promoción:', error);
      throw error;
    }
  }
  
  /**
   * Aplica promociones a items del carrito
   * @param {Array} items - Items del carrito
   * @returns {Promise<Array>} Items con promociones aplicadas
   */
  async aplicarPromociones(items) {
	  try {
		console.log('📤 [PROMOCIONES SERVICE] Aplicando promociones a items:', items);
		console.log('📤 [PROMOCIONES SERVICE] Número de items:', items.length);
		
		// Hacer la llamada directa para obtener la respuesta completa
		const headers = await this.getAuthHeaders();
		const url = this.buildURL('/aplicar');
		
		const response = await fetch(url, {
		  method: 'POST',
		  headers,
		  body: JSON.stringify({ items })
		});
		
		if (!response.ok) {
		  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		
		const fullResponse = await response.json();
		console.log('📥 Promociones aplicadas:', fullResponse);
		
		// Devolver el objeto completo para que PuntoVenta.js pueda acceder a .data
		return fullResponse;
	  } catch (error) {
		console.error('Error al aplicar promociones:', error);
		throw error;
	  }
	}
}

export default new PromocionesService();