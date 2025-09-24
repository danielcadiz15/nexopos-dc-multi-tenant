// src/services/control-stock.service.js
import FirebaseService from './firebase.service';

/**
 * Servicio para gestión de controles de stock/inventario físico
 */
class ControlStockService extends FirebaseService {
  constructor() {
    super(''); // Sin módulo para permitir endpoints directos
  }

  /**
   * Crea un nuevo control de inventario
   * @param {Object} datos - Datos del control
   * @returns {Promise<Object>} Control creado
   */
  async crearControl(datos) {
    try {
      console.log('🔄 Creando nuevo control de inventario:', datos);
      
      const control = {
        sucursal_id: datos.sucursal_id,
        usuario_id: datos.usuario_id,
        fecha_creacion: new Date().toISOString(),
        tipo: datos.tipo || 'completo',
        categoria_id: datos.categoria_id || null,
        estado: 'en_proceso',
        observaciones: datos.observaciones || ''
      };
      
      const resultado = await this.post('/control-stock/crear', control);
      console.log('✅ Control creado:', resultado);
      
      // Verificar que la respuesta tenga el ID del control
      if (resultado && resultado.success && resultado.id) {
        console.log('✅ ID del control obtenido:', resultado.id);
        return resultado; // Devolver la respuesta completa que incluye el ID
      }
      
      // Si no hay ID, mostrar error
      console.error('❌ La respuesta no contiene ID del control:', resultado);
      throw new Error('No se pudo obtener el ID del control creado');
      
    } catch (error) {
      console.error('❌ Error al crear control:', error);
      throw error;
    }
  }

  /**
   * Obtiene el control activo de una sucursal
   * @param {string} sucursalId - ID de la sucursal
   * @returns {Promise<Object|null>} Control activo o null
   */
  async obtenerControlActivo(sucursalId) {
    try {
      console.log(`🔄 Buscando control activo para sucursal ${sucursalId}`);
      
      const response = await this.get('/control-stock/activo', {
        sucursal_id: sucursalId
      });
      
      // Agregar logs detallados para debug
      console.log('🔍 [DEBUG] Response completa:', response);
      console.log('🔍 [DEBUG] Response.success:', response?.success);
      console.log('🔍 [DEBUG] Response.data:', response?.data);
      console.log('🔍 [DEBUG] Response.data existe:', !!response?.data);
      console.log('🔍 [DEBUG] Response keys:', Object.keys(response || {}));
      console.log('🔍 [DEBUG] Response type:', typeof response);
      console.log('🔍 [DEBUG] Response es array:', Array.isArray(response));
      console.log('🔍 [DEBUG] Response stringified:', JSON.stringify(response, null, 2));
      
      // El backend devuelve { success: true, data: control } o { success: true, data: null }
      if (response && response.success) {
        if (response.data) {
          console.log('✅ Control activo encontrado:', response.data);
          return response.data;
        } else {
          console.log('ℹ️ No hay control activo (data es null/undefined)');
          return null;
        }
      }
      
      console.log('ℹ️ No hay control activo (response no válida)');
      return null;
      
    } catch (error) {
      console.error('❌ Error al buscar control activo:', error);
      return null;
    }
  }

  /**
   * Obtiene los detalles de un control
   * @param {string} controlId - ID del control
   * @returns {Promise<Array>} Detalles del control
   */
  async obtenerDetallesControl(controlId) {
    try {
      console.log(`🔄 Obteniendo detalles del control ${controlId}`);
      
      const detalles = await this.get(`/control-stock/${controlId}/detalles`);
      const detallesArray = this.ensureArray(detalles);
      
      console.log(`✅ Detalles obtenidos: ${detallesArray.length} productos`);
      return detallesArray;
      
    } catch (error) {
      console.error('❌ Error al obtener detalles:', error);
      return [];
    }
  }

  /**
   * Actualiza el conteo de un producto en el control
   * @param {string} controlId - ID del control
   * @param {string} productoId - ID del producto
   * @param {Object} datos - Datos del conteo
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async actualizarConteo(controlId, productoId, datos) {
    try {
      console.log(`🔄 Actualizando conteo para producto ${productoId}`);
      
      const conteo = {
        stock_fisico: parseFloat(datos.stock_fisico),
        observaciones: datos.observaciones || '',
        fecha_conteo: new Date().toISOString()
      };
      
      const resultado = await this.put(
        `/control-stock/${controlId}/productos/${productoId}`,
        conteo
      );
      
      console.log('✅ Conteo actualizado');
      return resultado;
      
    } catch (error) {
      console.error('❌ Error al actualizar conteo:', error);
      throw error;
    }
  }

  /**
   * Finaliza un control de inventario
   * @param {string} controlId - ID del control
   * @param {Object} datos - Datos de finalización
   * @returns {Promise<Object>} Control finalizado
   */
  async finalizarControl(controlId, datos) {
    try {
      console.log(`🔄 Finalizando control ${controlId}`);
      
      const finalizacion = {
        fecha_fin: new Date().toISOString(),
        estado: 'finalizado',
        productos_conteo: datos.productos_conteo,
        ajustes_aplicados: datos.ajustes_aplicados || false,
        observaciones_finales: datos.observaciones_finales || '',
        solicitud_ajuste_id: datos.solicitud_ajuste_id || null
      };
      
      const resultado = await this.put(`/control-stock/${controlId}/finalizar`, finalizacion);
      
      console.log('✅ Control finalizado');
      return resultado;
      
    } catch (error) {
      console.error('❌ Error al finalizar control:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de controles de una sucursal
   * @param {string} sucursalId - ID de la sucursal
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Array>} Lista de controles
   */
  async obtenerHistorial(sucursalId, filtros = {}) {
    try {
      console.log(`🔄 Obteniendo historial de controles para sucursal ${sucursalId}`);
      
      const params = {
        sucursal_id: sucursalId,
        ...filtros
      };
      
      const controles = await this.get('/control-stock/historial', params);
      const controlesArray = this.ensureArray(controles);
      
      console.log(`✅ Historial obtenido: ${controlesArray.length} controles`);
      return controlesArray;
      
    } catch (error) {
      console.error('❌ Error al obtener historial:', error);
      return [];
    }
  }

  /**
   * Genera un reporte de control
   * @param {string} controlId - ID del control
   * @returns {Promise<Object>} Reporte del control
   */
  async generarReporte(controlId) {
    try {
      console.log(`🔄 Generando reporte para control ${controlId}`);
      
      const reporte = await this.get(`/control-stock/${controlId}/reporte`);
      
      console.log('✅ Reporte generado');
      return reporte;
      
    } catch (error) {
      console.error('❌ Error al generar reporte:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de controles
   * @param {string} sucursalId - ID de la sucursal
   * @param {Object} periodo - Periodo de tiempo
   * @returns {Promise<Object>} Estadísticas
   */
  async obtenerEstadisticas(sucursalId, periodo = {}) {
    try {
      console.log(`🔄 Obteniendo estadísticas de controles`);
      
      const params = {
        sucursal_id: sucursalId,
        ...periodo
      };
      
      const estadisticas = await this.get('/control-stock/estadisticas', params);
      
      console.log('✅ Estadísticas obtenidas');
      return estadisticas;
      
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      return {
        controles_realizados: 0,
        productos_contados: 0,
        ajustes_aplicados: 0,
        valor_ajustes: 0
      };
    }
  }

  /**
   * Exporta un control a Excel
   * @param {string} controlId - ID del control
   * @returns {Promise<Blob>} Archivo Excel
   */
  async exportarExcel(controlId) {
    try {
      console.log(`🔄 Exportando control ${controlId} a Excel`);
      
      const response = await this.get(`/control-stock/${controlId}/exportar`, {
        formato: 'excel'
      });
      
      console.log('✅ Control exportado');
      return response;
      
    } catch (error) {
      console.error('❌ Error al exportar control:', error);
      throw error;
    }
  }

  /**
   * Crea una solicitud de ajuste de inventario
   * @param {Object} datos - Datos de la solicitud
   * @returns {Promise<Object>} Solicitud creada
   */
  async crearSolicitudAjuste(datos) {
    try {
      console.log('🔄 Creando solicitud de ajuste:', datos);
      
      const solicitud = {
        control_id: datos.control_id,
        sucursal_id: datos.sucursal_id,
        usuario_id: datos.usuario_id,
        ajustes: datos.ajustes,
        estado: datos.estado || 'pendiente_autorizacion',
        fecha_solicitud: datos.fecha_solicitud || new Date().toISOString(),
        observaciones: datos.observaciones || '',
        fecha_creacion: new Date().toISOString()
      };
      
      const resultado = await this.post('/solicitudes-ajuste/crear', solicitud);
      console.log('✅ Solicitud de ajuste creada:', resultado);
      
      // Extraer solo los datos de la solicitud si la respuesta tiene estructura data
      if (resultado && resultado.success && resultado.data) {
        return resultado.data;
      }
      
      // Si no hay estructura data, devolver el resultado completo
      return resultado;
    } catch (error) {
      console.error('❌ Error al crear solicitud de ajuste:', error);
      throw error;
    }
  }

  /**
   * Obtiene las solicitudes de ajuste pendientes
   * @param {string} sucursalId - ID de la sucursal (opcional)
   * @returns {Promise<Array>} Lista de solicitudes
   */
  async obtenerSolicitudesPendientes(sucursalId = null) {
    try {
      console.log('🔄 Obteniendo solicitudes de ajuste pendientes');
      
      const params = {
        estado: 'pendiente_autorizacion'
      };
      
      if (sucursalId) {
        params.sucursal_id = sucursalId;
      }
      
      const solicitudes = await this.get('/solicitudes-ajuste', params);
      const solicitudesArray = this.ensureArray(solicitudes);
      
      console.log(`✅ Solicitudes obtenidas: ${solicitudesArray.length}`);
      return solicitudesArray;
      
    } catch (error) {
      console.error('❌ Error al obtener solicitudes:', error);
      return [];
    }
  }

  /**
   * Autoriza una solicitud de ajuste
   * @param {string} solicitudId - ID de la solicitud
   * @param {string} adminId - ID del administrador que autoriza (opcional)
   * @returns {Promise<Object>} Solicitud autorizada
   */
  async autorizarSolicitud(solicitudId, adminId = null) {
    try {
      console.log(`🔄 Autorizando solicitud ${solicitudId}`);
      console.log('🔍 [FRONTEND] Enviando petición de autorización...');
      
      const autorizacion = {
        estado: 'autorizada',
        admin_autoriza_id: adminId,
        fecha_autorizacion: new Date().toISOString()
      };
      
      const resultado = await this.put(`/solicitudes-ajuste/${solicitudId}/autorizar`, autorizacion);
      
      console.log('✅ Solicitud autorizada');
      console.log('🔍 [FRONTEND] Respuesta del backend:', resultado);
      
      // Verificar si la respuesta indica que los ajustes se aplicaron
      if (resultado && resultado.message && resultado.message.includes('ajustes aplicados')) {
        console.log('✅ [FRONTEND] El backend confirmó que los ajustes se aplicaron');
      } else {
        console.log('⚠️ [FRONTEND] El backend no confirmó la aplicación de ajustes');
      }
      
      return resultado;
      
    } catch (error) {
      console.error('❌ Error al autorizar solicitud:', error);
      throw error;
    }
  }

  /**
   * Rechaza una solicitud de ajuste
   * @param {string} solicitudId - ID de la solicitud
   * @param {string} motivo - Motivo del rechazo
   * @param {string} adminId - ID del administrador que rechaza (opcional)
   * @returns {Promise<Object>} Solicitud rechazada
   */
  async rechazarSolicitud(solicitudId, motivo, adminId = null) {
    try {
      console.log(`🔄 Rechazando solicitud ${solicitudId}`);
      
      const rechazo = {
        estado: 'rechazada',
        admin_rechaza_id: adminId,
        fecha_rechazo: new Date().toISOString(),
        motivo_rechazo: motivo
      };
      
      const resultado = await this.put(`/solicitudes-ajuste/${solicitudId}/rechazar`, rechazo);
      
      console.log('✅ Solicitud rechazada');
      return resultado;
      
    } catch (error) {
      console.error('❌ Error al rechazar solicitud:', error);
      throw error;
    }
  }

  /**
   * Método auxiliar para asegurar que el resultado sea un array
   * @param {any} data - Datos a convertir
   * @returns {Array} Array de datos
   */
  ensureArray(data) {
    if (Array.isArray(data)) {
      return data;
    }
    
    if (data && typeof data === 'object' && data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    if (data && typeof data === 'object' && data.success && data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
  }

  /**
   * Crea un registro de auditoría para ajustes de inventario
   */
  async crearRegistroAuditoria(registroAuditoria) {
    try {
      console.log('🔄 Creando registro de auditoría:', registroAuditoria);
      
      const resultado = await this.post('/auditoria-inventario/crear', registroAuditoria);
      
      console.log('✅ Registro de auditoría creado:', resultado);
      return resultado;
      
    } catch (error) {
      console.error('❌ Error al crear registro de auditoría:', error);
      throw error;
    }
  }
}

export default new ControlStockService();