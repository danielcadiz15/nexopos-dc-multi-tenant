// src/services/stock-sucursal.service.js
import FirebaseService from './firebase.service';

/**
 * Servicio para gestión de stock por sucursal
 */
class StockSucursalService extends FirebaseService {
  constructor() {
    super('/stock-sucursal');
  }

  /**
   * Obtiene el stock de una sucursal específica
   * @param {string} sucursalId - ID de la sucursal
   * @returns {Promise<Array>} Lista de productos con stock
   */
  async obtenerStockPorSucursal(sucursalId) {
    try {
      console.log(`📦 Obteniendo stock de sucursal ${sucursalId}`);
      const stock = await this.get(`/sucursal/${sucursalId}`);
      
      const stockArray = this.ensureArray(stock);
      console.log(`✅ Stock obtenido: ${stockArray.length} productos`);
      
      return stockArray;
    } catch (error) {
      console.error(`❌ Error al obtener stock de sucursal ${sucursalId}:`, error);
      return [];
    }
  }

  /**
   * Obtiene el stock de un producto en todas las sucursales
   * @param {string} productoId - ID del producto
   * @returns {Promise<Array>} Stock del producto por sucursal
   */
  async obtenerStockPorProducto(productoId) {
    try {
      console.log(`📦 Obteniendo stock del producto ${productoId} en todas las sucursales`);
      const stock = await this.get(`/producto/${productoId}`);
      
      const stockArray = this.ensureArray(stock);
      console.log(`✅ Stock del producto en ${stockArray.length} sucursales`);
      
      return stockArray;
    } catch (error) {
      console.error(`❌ Error al obtener stock del producto ${productoId}:`, error);
      return [];
    }
  }

  /**
   * Actualiza el stock de un producto en una sucursal
   * @param {string} sucursalId - ID de la sucursal
   * @param {string} productoId - ID del producto
   * @param {number} cantidad - Nueva cantidad
   * @returns {Promise<Object>} Respuesta de la actualización
   */
  async actualizarStock(sucursalId, productoId, cantidad) {
    try {
      console.log(`🔄 Actualizando stock: Sucursal ${sucursalId}, Producto ${productoId}, Cantidad: ${cantidad}`);
      
      const resultado = await this.put(`/${sucursalId}/${productoId}`, { cantidad });
      
      console.log('✅ Stock actualizado correctamente');
      return resultado;
    } catch (error) {
      console.error('❌ Error al actualizar stock:', error);
      throw error;
    }
  }

  /**
   * Ajusta el stock de un producto (suma o resta)
   * @param {string} sucursalId - ID de la sucursal
   * @param {string} productoId - ID del producto
   * @param {number} ajuste - Cantidad a ajustar (positivo suma, negativo resta)
   * @param {string} motivo - Motivo del ajuste
   * @returns {Promise<Object>} Respuesta del ajuste
   */
  async ajustarStock(sucursalId, productoId, ajuste, motivo) {
    try {
      console.log(`📊 Ajustando stock: Sucursal ${sucursalId}, Producto ${productoId}, Ajuste: ${ajuste}`);
      
      const resultado = await this.post('/ajustar', {
        sucursal_id: sucursalId,
        producto_id: productoId,
        ajuste,
        motivo
      });
      
      console.log('✅ Stock ajustado correctamente');
      return resultado;
    } catch (error) {
      console.error('❌ Error al ajustar stock:', error);
      throw error;
    }
  }

  /**
   * Transfiere stock entre sucursales
   * @param {Object} transferencia - Datos de la transferencia
   * @returns {Promise<Object>} Respuesta de la transferencia
   */
  async transferirStock(transferencia) {
    try {
      console.log('🚛 Creando transferencia de stock:', transferencia);
      
      const resultado = await this.post('/transferir', transferencia);
      
      console.log('✅ Transferencia creada correctamente');
      return resultado;
    } catch (error) {
      console.error('❌ Error al crear transferencia:', error);
      throw error;
    }
  }

  /**
   * Obtiene productos con stock bajo en una sucursal
   * @param {string} sucursalId - ID de la sucursal
   * @returns {Promise<Array>} Productos con stock bajo
   */
  async obtenerStockBajo(sucursalId) {
    try {
      console.log(`⚠️ Obteniendo productos con stock bajo en sucursal ${sucursalId}`);
      
      const productos = await this.get(`/sucursal/${sucursalId}/stock-bajo`);
      
      const productosArray = this.ensureArray(productos);
      console.log(`✅ Productos con stock bajo: ${productosArray.length}`);
      
      return productosArray;
    } catch (error) {
      console.error(`❌ Error al obtener stock bajo:`, error);
      return [];
    }
  }

  /**
   * Inicializa el stock de todos los productos en una sucursal
   * @param {string} sucursalId - ID de la sucursal
   * @param {Array} productos - Array de {producto_id, cantidad, stock_minimo}
   * @returns {Promise<Object>} Respuesta de la inicialización
   */
  async inicializarStock(sucursalId, productos) {
    try {
      console.log(`🆕 Inicializando stock para sucursal ${sucursalId} con ${productos.length} productos`);
      
      const resultado = await this.post('/inicializar', {
        sucursal_id: sucursalId,
        productos
      });
      
      console.log('✅ Stock inicializado correctamente');
      return resultado;
    } catch (error) {
      console.error('❌ Error al inicializar stock:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de movimientos de una sucursal
   * @param {string} sucursalId - ID de la sucursal
   * @param {Object} filtros - Filtros opcionales (fecha_inicio, fecha_fin, tipo)
   * @returns {Promise<Array>} Historial de movimientos
   */
  async obtenerMovimientos(sucursalId, filtros = {}) {
    try {
      console.log(`📋 Obteniendo movimientos de sucursal ${sucursalId}`);
      
      const movimientos = await this.get(`/sucursal/${sucursalId}/movimientos`, filtros);
      
      const movimientosArray = this.ensureArray(movimientos);
      console.log(`✅ Movimientos obtenidos: ${movimientosArray.length}`);
      
      return movimientosArray;
    } catch (error) {
      console.error(`❌ Error al obtener movimientos:`, error);
      return [];
    }
  }

  /**
   * Obtiene el historial de movimientos de un producto en todas las sucursales
   * @param {string} productoId
   * @returns {Promise<{movimientos: Array, producto: Object}>}
   */
  async obtenerMovimientosPorProducto(productoId) {
    try {
      console.log(`📋 Obteniendo movimientos del producto ${productoId} en todas las sucursales`);
      const movimientos = await this.get(`/producto/${productoId}/movimientos`);
      
      const movimientosArray = this.ensureArray(movimientos);
      console.log(`✅ Movimientos del producto en ${movimientosArray.length} sucursales`);
      
      return movimientosArray;
    } catch (error) {
      console.error(`❌ Error al obtener movimientos del producto ${productoId}:`, error);
      return { movimientos: [], producto: {} };
    }
  }
}

export default new StockSucursalService();