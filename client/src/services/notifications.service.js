// src/services/notifications.service.js - VERSIÓN CON DATOS REALES
import FirebaseService from './firebase.service';
import transferenciasService from './transferencias.service';

/**
 * Servicio para gestión de notificaciones reales
 */
class NotificationsService extends FirebaseService {
  constructor() {
    super('/notificaciones');
  }

  /**
   * Obtiene todas las notificaciones del usuario actual desde la base de datos
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Lista de notificaciones
   */
  async obtenerNotificaciones(userId) {
    try {
      console.log(`🔔 [NOTIFICATIONS] Obteniendo notificaciones para usuario ${userId}`);
      
      const notificaciones = await this.get('', { usuario_id: userId });
      const notificacionesArray = this.ensureArray(notificaciones);
      
      console.log(`✅ [NOTIFICATIONS] ${notificacionesArray.length} notificaciones obtenidas`);
      return notificacionesArray;
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error al obtener notificaciones:', error);
      return [];
    }
  }

  /**
   * Obtiene el conteo de transferencias pendientes para administradores
   * @returns {Promise<Object>} Conteo y detalles de notificaciones
   */
  async obtenerNotificacionesTransferencias() {
    try {
      console.log('🔔 [NOTIFICATIONS] Obteniendo notificaciones de transferencias...');
      
      // Obtener transferencias pendientes
      const transferencias = await transferenciasService.obtenerPendientes();
      
      // Crear notificaciones basadas en transferencias
      const notificaciones = transferencias.map(transferencia => ({
        id: `transferencia-${transferencia.id}`,
        tipo: 'transferencia_pendiente',
        titulo: 'Transferencia Pendiente',
        mensaje: `Transferencia de ${transferencia.sucursal_origen?.nombre || 'Sucursal'} a ${transferencia.sucursal_destino?.nombre || 'Sucursal'} requiere aprobación`,
        fecha: transferencia.fecha_solicitud,
        leida: false,
        prioridad: 'alta',
        datos: {
          transferencia_id: transferencia.id,
          sucursal_origen: transferencia.sucursal_origen?.nombre,
          sucursal_destino: transferencia.sucursal_destino?.nombre,
          productos_count: transferencia.productos?.length || 0,
          usuario_solicita: transferencia.usuario_solicita_nombre || 'Usuario'
        },
        acciones: [
          {
            texto: 'Ver Transferencia',
            tipo: 'primary',
            ruta: `/stock/transferencias`
          },
          {
            texto: 'Aprobar',
            tipo: 'success',
            accion: 'aprobar_transferencia'
          },
          {
            texto: 'Rechazar',
            tipo: 'danger',
            accion: 'rechazar_transferencia'
          }
        ]
      }));
      
      console.log(`✅ [NOTIFICATIONS] ${notificaciones.length} notificaciones de transferencias`);
      
      return {
        transferencias: notificaciones,
        total: notificaciones.length
      };
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error al obtener notificaciones de transferencias:', error);
      return {
        transferencias: [],
        total: 0
      };
    }
  }

  /**
   * Obtiene todas las notificaciones para administradores (COMBINA REALES + TRANSFERENCIAS)
   * @param {string} userId - ID del usuario administrador
   * @returns {Promise<Object>} Todas las notificaciones
   */
  async obtenerNotificacionesAdmin(userId) {
    try {
      console.log('🔔 [NOTIFICATIONS] Obteniendo notificaciones para admin...');
      
      // 1. Obtener notificaciones reales del usuario desde la BD
      const notificacionesReales = await this.obtenerNotificaciones(userId);
      
      // 2. Obtener notificaciones de transferencias pendientes (solo para admin)
      const transferenciasNotif = await this.obtenerNotificacionesTransferencias();
      
      // 3. Combinar todas las notificaciones
      const todasNotificaciones = [
        ...notificacionesReales,
        ...transferenciasNotif.transferencias
      ];
      
      // 4. Ordenar por fecha/prioridad
      todasNotificaciones.sort((a, b) => {
        // Primero por prioridad
        const prioridadOrder = { 'alta': 3, 'media': 2, 'baja': 1 };
        const prioridadDiff = (prioridadOrder[b.prioridad] || 1) - (prioridadOrder[a.prioridad] || 1);
        
        if (prioridadDiff !== 0) return prioridadDiff;
        
        // Luego por fecha
        return new Date(b.fecha) - new Date(a.fecha);
      });
      
      console.log(`✅ [NOTIFICATIONS] ${todasNotificaciones.length} notificaciones totales`);
      
      return {
        notificaciones: todasNotificaciones,
        total: todasNotificaciones.length,
        por_tipo: {
          reales: notificacionesReales.length,
          transferencias: transferenciasNotif.total
        }
      };
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error al obtener notificaciones admin:', error);
      return {
        notificaciones: [],
        total: 0,
        por_tipo: {}
      };
    }
  }

  /**
   * Marca una notificación como leída en la base de datos
   * @param {string} notificationId - ID de la notificación
   * @returns {Promise<boolean>} Éxito de la operación
   */
  async marcarComoLeida(notificationId) {
    try {
      console.log(`🔔 [NOTIFICATIONS] Marcando notificación ${notificationId} como leída`);
      
      // Solo marcar si es una notificación real (no de transferencias pendientes)
      if (notificationId.startsWith('transferencia-')) {
        console.log('🔔 [NOTIFICATIONS] Notificación de transferencia - no se marca como leída');
        return true;
      }
      
      await this.put(`/${notificationId}/leida`, {});
      console.log(`✅ [NOTIFICATIONS] Notificación ${notificationId} marcada como leída`);
      return true;
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error al marcar como leída:', error);
      return false;
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   * @param {string} userId - ID del usuario
   * @returns {Promise<boolean>} Éxito de la operación
   */
  async marcarTodasComoLeidas(userId) {
    try {
      console.log(`🔔 [NOTIFICATIONS] Marcando todas las notificaciones como leídas para ${userId}`);
      
      await this.put('/marcar-todas-leidas', { usuario_id: userId });
      console.log(`✅ [NOTIFICATIONS] Todas las notificaciones marcadas como leídas`);
      return true;
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error al marcar todas como leídas:', error);
      return false;
    }
  }

  /**
   * Obtiene el conteo total de notificaciones no leídas
   * @param {string} userId - ID del usuario
   * @returns {Promise<number>} Número de notificaciones no leídas
   */
  async contarNoLeidas(userId) {
    try {
      console.log(`🔔 [NOTIFICATIONS] Contando notificaciones no leídas para ${userId}`);
      
      // Obtener conteo de notificaciones reales
      const conteoReal = await this.get('/count', { usuario_id: userId });
      const conteoRealNum = conteoReal?.count || 0;
      
      // Para administradores, agregar transferencias pendientes
      let conteoTransferencias = 0;
      try {
        const transferenciasNotif = await this.obtenerNotificacionesTransferencias();
        conteoTransferencias = transferenciasNotif.total;
      } catch (error) {
        console.warn('⚠️ [NOTIFICATIONS] Error al contar transferencias:', error);
      }
      
      const total = conteoRealNum + conteoTransferencias;
      console.log(`✅ [NOTIFICATIONS] Total no leídas: ${total} (reales: ${conteoRealNum}, transferencias: ${conteoTransferencias})`);
      
      return total;
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error al contar no leídas:', error);
      return 0;
    }
  }

  /**
   * Crea una nueva notificación para un usuario
   * @param {Object} datos - Datos de la notificación
   * @returns {Promise<string|null>} ID de la notificación creada
   */
  async crearNotificacion(datos) {
    try {
      console.log(`🔔 [NOTIFICATIONS] Creando notificación para ${datos.usuario_id}`);
      
      const notificacion = await this.post('', datos);
      console.log(`✅ [NOTIFICATIONS] Notificación creada: ${notificacion.id}`);
      
      return notificacion.id;
      
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error al crear notificación:', error);
      return null;
    }
  }
}

// Crear instancia del servicio
const notificationsService = new NotificationsService();

export default notificationsService;