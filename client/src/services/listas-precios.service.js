// src/services/listas-precios.service.js
import FirebaseService from './firebase.service';

/**
 * Servicio para gestión de listas de precios
 */
class ListasPreciosService extends FirebaseService {
  constructor() {
    super('/listas-precios');
  }

  /**
   * Actualiza las listas de precios de un producto
   * @param {string} productoId - ID del producto
   * @param {Object} datos - Datos de precios
   * @returns {Promise<Object>} Respuesta de la actualización
   */
  async actualizarPrecios(productoId, datos) {
    try {
      console.log(`🔄 Actualizando precios del producto ${productoId}`);
      
      const resultado = await this.put(`/producto/${productoId}`, datos);
      
      console.log('✅ Precios actualizados:', resultado);
      return resultado;
      
    } catch (error) {
      console.error(`❌ Error al actualizar precios del producto ${productoId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de precios de un producto
   * @param {string} productoId - ID del producto
   * @returns {Promise<Array>} Historial de cambios
   */
  async obtenerHistorial(productoId) {
    try {
      console.log(`📋 Obteniendo historial de precios del producto ${productoId}`);
      
      const historial = await this.get(`/historial/${productoId}`);
      const historialArray = this.ensureArray(historial);
      
      console.log(`✅ ${historialArray.length} registros de historial obtenidos`);
      return historialArray;
      
    } catch (error) {
      console.error(`❌ Error al obtener historial del producto ${productoId}:`, error);
      return [];
    }
  }

  /**
   * Actualización masiva de precios
   * @param {Object} datos - Configuración de actualización masiva
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async actualizacionMasiva(datos) {
    try {
      console.log('🔄 Ejecutando actualización masiva de precios:', datos);
      
      const resultado = await this.put('/masivo', datos);
      
      console.log('✅ Actualización masiva completada:', resultado);
      return resultado;
      
    } catch (error) {
      console.error('❌ Error en actualización masiva:', error);
      throw error;
    }
  }

  /**
   * Compara las listas de precios de un producto
   * @param {string} productoId - ID del producto
   * @returns {Promise<Object>} Comparación de precios y márgenes
   */
  async compararPrecios(productoId) {
    try {
      console.log(`📊 Comparando precios del producto ${productoId}`);
      
      const comparacion = await this.get(`/comparar/${productoId}`);
      const comparacionObj = this.ensureObject(comparacion);
      
      console.log('✅ Comparación de precios obtenida');
      return comparacionObj;
      
    } catch (error) {
      console.error(`❌ Error al comparar precios del producto ${productoId}:`, error);
      throw error;
    }
  }

  /**
   * Calcula precio con margen
   * @param {number} costo - Precio de costo
   * @param {number} margen - Porcentaje de margen
   * @returns {number} Precio calculado
   */
  calcularPrecioConMargen(costo, margen) {
    return costo * (1 + margen / 100);
  }

  /**
   * Calcula margen desde precio
   * @param {number} costo - Precio de costo
   * @param {number} precio - Precio de venta
   * @returns {number} Porcentaje de margen
   */
  calcularMargenDesdePrecio(costo, precio) {
    if (costo <= 0) return 0;
    return ((precio - costo) / costo) * 100;
  }
}

export default new ListasPreciosService();