/**
 * Servicio para gestión de stock
 * 
 * Proporciona métodos para consultar y ajustar el inventario.
 * 
 * @module services/stock.service
 * @requires ./api.service
 * @related_files ../pages/stock/*
 */

import ApiService from './api.service';

/**
 * Servicio para operaciones con stock
 * @extends ApiService
 */
class StockService extends ApiService {
  /**
   * Constructor
   */
  constructor() {
    super('/api/stock');
  }
  
  /**
   * Obtiene productos con stock bajo
   * @returns {Promise<Array>} Lista de productos con stock bajo
   */
  async obtenerStockBajo() {
    const response = await this.get('/bajo');
    return response.data;
  }
  
  /**
   * Ajusta el stock de un producto
   * @param {number} id - ID del producto
   * @param {number} cantidad - Nueva cantidad
   * @param {string} motivo - Motivo del ajuste
   * @returns {Promise<Object>} Respuesta de la API
   */
  async ajustarStock(id, cantidad, motivo) {
    const response = await this.patch(`/${id}`, { cantidad, motivo });
    return response;
  }
  
  /**
   * Obtiene el historial de movimientos de un producto
   * @param {number} id - ID del producto
   * @returns {Promise<Array>} Historial de movimientos
   */
  async obtenerHistorialMovimientos(id) {
    const response = await this.get(`/${id}/movimientos`);
    return response.data;
  }
}

export default new StockService();