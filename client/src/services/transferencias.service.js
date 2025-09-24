// src/services/transferencias.service.js - CORREGIDO
import FirebaseService from './firebase.service';

/**
 * Servicio para gestión de transferencias entre sucursales - CORREGIDO
 */
class TransferenciasService extends FirebaseService {
  constructor() {
    super('/transferencias');
  }

  /**
   * Obtiene todas las transferencias
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Array>} Lista de transferencias
   */
  async obtenerTodas(filtros = {}) {
    try {
      console.log('🔄 [TRANSFERENCIAS SERVICE] Obteniendo transferencias...', filtros);
      
      const transferencias = await this.get('', filtros);
      const transferenciasArray = this.ensureArray(transferencias);
      
      console.log(`✅ [TRANSFERENCIAS SERVICE] ${transferenciasArray.length} transferencias obtenidas`);
      return transferenciasArray;
      
    } catch (error) {
      console.error('❌ [TRANSFERENCIAS SERVICE] Error al obtener transferencias:', error);
      return [];
    }
  }

  /**
   * Obtiene transferencias de una sucursal específica
   * @param {string} sucursalId - ID de la sucursal
   * @returns {Promise<Array>} Transferencias de la sucursal
   */
  async obtenerPorSucursal(sucursalId) {
    try {
      console.log(`🔄 [TRANSFERENCIAS SERVICE] Obteniendo transferencias de sucursal ${sucursalId}`);
      
      const transferencias = await this.get(`/sucursal/${sucursalId}`);
      const transferenciasArray = this.ensureArray(transferencias);
      
      console.log(`✅ [TRANSFERENCIAS SERVICE] ${transferenciasArray.length} transferencias de sucursal obtenidas`);
      return transferenciasArray;
      
    } catch (error) {
      console.error(`❌ [TRANSFERENCIAS SERVICE] Error al obtener transferencias de sucursal:`, error);
      return [];
    }
  }

  /**
   * Obtiene una transferencia por ID
   * @param {string} id - ID de la transferencia
   * @returns {Promise<Object>} Transferencia
   */
  async obtenerPorId(id) {
    try {
      console.log(`🔄 [TRANSFERENCIAS SERVICE] Obteniendo transferencia ${id}`);
      
      const transferencia = await this.get(`/${id}`);
      const transferenciaObj = this.ensureObject(transferencia);
      
      console.log(`✅ [TRANSFERENCIAS SERVICE] Transferencia obtenida`);
      return transferenciaObj;
      
    } catch (error) {
      console.error(`❌ [TRANSFERENCIAS SERVICE] Error al obtener transferencia ${id}:`, error);
      throw error;
    }
  }

  /**
   * Crea una nueva transferencia - CORREGIDO
   * @param {Object} transferencia - Datos de la transferencia
   * @returns {Promise<Object>} Transferencia creada
   */
  async crear(transferencia) {
    try {
      console.log('🆕 [TRANSFERENCIAS SERVICE] Creando transferencia:', {
        origen: transferencia.sucursal_origen_id,
        destino: transferencia.sucursal_destino_id,
        productos: transferencia.productos?.length
      });
      
      // CORRECCIÓN: Usar la ruta de stock-sucursal para crear la transferencia
      const firebaseService = new FirebaseService('/stock-sucursal');
      const resultado = await firebaseService.post('/transferir', transferencia);
      
      console.log('✅ [TRANSFERENCIAS SERVICE] Transferencia creada correctamente');
      return resultado;
      
    } catch (error) {
      console.error('❌ [TRANSFERENCIAS SERVICE] Error al crear transferencia:', error);
      throw error;
    }
  }

  /**
   * Aprueba o rechaza una transferencia
   * @param {string} id - ID de la transferencia
   * @param {string} estado - 'aprobada' o 'rechazada'
   * @param {Object} datos - Datos adicionales (motivo_rechazo, usuario_aprueba_id)
   * @returns {Promise<Object>} Respuesta de la actualización
   */
  async cambiarEstado(id, estado, datos = {}) {
    try {
      console.log(`🔄 [TRANSFERENCIAS SERVICE] Cambiando estado de transferencia ${id} a ${estado}`);
      
      const resultado = await this.put(`/${id}/estado`, {
        estado,
        ...datos
      });
      
      console.log('✅ [TRANSFERENCIAS SERVICE] Estado de transferencia actualizado');
      return resultado;
      
    } catch (error) {
      console.error(`❌ [TRANSFERENCIAS SERVICE] Error al cambiar estado de transferencia:`, error);
      throw error;
    }
  }

  /**
   * Obtiene transferencias pendientes - NUEVO
   * @returns {Promise<Array>} Transferencias pendientes
   */
  async obtenerPendientes() {
    try {
      console.log('🔔 [TRANSFERENCIAS SERVICE] Obteniendo transferencias pendientes...');
      
      const transferencias = await this.get('/pendientes');
      const transferenciasArray = this.ensureArray(transferencias);
      
      console.log(`✅ [TRANSFERENCIAS SERVICE] ${transferenciasArray.length} transferencias pendientes`);
      return transferenciasArray;
      
    } catch (error) {
      console.error('❌ [TRANSFERENCIAS SERVICE] Error al obtener transferencias pendientes:', error);
      return [];
    }
  }

  /**
   * Obtiene el conteo de transferencias pendientes - NUEVO
   * @returns {Promise<number>} Número de transferencias pendientes
   */
  async contarPendientes() {
    try {
      const pendientes = await this.obtenerPendientes();
      return pendientes.length;
    } catch (error) {
      console.error('❌ [TRANSFERENCIAS SERVICE] Error al contar pendientes:', error);
      return 0;
    }
  }

  /**
   * Registra la devolución de productos en una transferencia
   * @param {string} transferenciaId
   * @param {Array} devoluciones - [{ producto_id, cantidad }]
   * @returns {Promise<Object>} Respuesta del backend
   */
  async devolverProductos(transferenciaId, devoluciones) {
    try {
      const response = await this.post(`/${transferenciaId}/devolver`, { devoluciones });
      return response;
    } catch (error) {
      console.error('❌ Error al registrar devolución:', error);
      throw error;
    }
  }

  /**
   * Cancela una transferencia aprobada y devuelve el stock
   * @param {string} transferenciaId
   * @param {string} motivo
   * @param {string} usuario_id
   * @returns {Promise<Object>} Respuesta del backend
   */
  async cancelarTransferencia(transferenciaId, motivo, usuario_id) {
    try {
      const response = await this.post(`/${transferenciaId}/cancelar`, { motivo, usuario_id });
      return response;
    } catch (error) {
      console.error('❌ Error al cancelar transferencia:', error);
      throw error;
    }
  }
}

// Crear instancia del servicio
const transferenciasService = new TransferenciasService();

export default transferenciasService;