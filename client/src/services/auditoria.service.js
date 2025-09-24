// src/services/auditoria.service.js
import FirebaseService from './firebase.service';

/**
 * Servicio para registro de auditoría
 */
class AuditoriaService extends FirebaseService {
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
      // Obtener usuario actual del localStorage
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const sucursalId = localStorage.getItem('sucursalSeleccionada');
      
      const registro = {
        accion,
        modulo,
        usuario_id: currentUser.id || 'sistema',
        usuario_nombre: currentUser.nombre || 'Sistema',
        usuario_email: currentUser.email || '',
        sucursal_id: sucursalId,
        fecha: new Date().toISOString(),
        ip: 'web', // En producción podrías obtener la IP real
        detalles: {
          ...detalles,
          user_agent: navigator.userAgent
        }
      };

      // Enviar al backend
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
      const params = new URLSearchParams();
      
      if (filtros.usuario_id) params.append('usuario_id', filtros.usuario_id);
      if (filtros.modulo) params.append('modulo', filtros.modulo);
      if (filtros.accion) params.append('accion', filtros.accion);
      if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
      if (filtros.sucursal_id) params.append('sucursal_id', filtros.sucursal_id);
      
      const queryString = params.toString();
      const actividades = await this.get(queryString ? `?${queryString}` : '');
      
      return this.ensureArray(actividades);
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return [];
    }
  }
}

export default new AuditoriaService();