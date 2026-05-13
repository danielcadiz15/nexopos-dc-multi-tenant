import ApiService from './api.service';

/**
 * Servicio para registro de auditoría
 */
class AuditoriaService extends ApiService {
  constructor() {
    super('/auditoria');
  }

  /**
   * Registra una actividad en el sistema
   * @param {string} accion - Tipo de acción (crear, editar, eliminar, etc)
   * @param {string} modulo - Módulo donde ocurrió (productos, ventas, etc)
   * @param {Object} detalles - Detalles de la acción
   */
  async registrarActividad(accion, modulo, detalles = {}) {
    try {
      const registro = {
        accion,
        modulo,
        sucursal_id: detalles.sucursal_id || detalles.sucursalId || null,
        severidad: detalles.severidad || detalles.severity || 'info',
        titulo: detalles.titulo || `${accion} en ${modulo}`,
        descripcion: detalles.descripcion || '',
        detalles: {
          ...detalles,
          user_agent: navigator.userAgent
        }
      };

      await this.post('', registro);
      
      console.log('📝 Actividad registrada:', accion, modulo);
    } catch (error) {
      // No interrumpir la operación principal si falla el log
      console.error('Error al registrar actividad:', error);
    }
  }

  /**
   * Obtiene el historial de actividades con filtros
   * @param {Object} filtros - Filtros de búsqueda
   */
  async obtenerHistorial(filtros = {}) {
    try {
      const { data, status } = await this.get('', filtros);
      if (status !== 200 || !data?.success) {
        return { eventos: [], resumen: null };
      }
      return {
        eventos: Array.isArray(data.data) ? data.data : [],
        resumen: data.resumen || null
      };
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return { eventos: [], resumen: null };
    }
  }
}

const auditoriaService = new AuditoriaService();

export default auditoriaService;