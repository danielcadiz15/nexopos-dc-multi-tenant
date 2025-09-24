// src/services/reparto.service.js - Servicio para organizar y ejecutar repartos
import FirebaseService from './firebase.service';

class RepartoService extends FirebaseService {
  constructor() {
    super('/reparto');
  }

  // Crea una sesión de reparto a partir de una lista de ventas ordenadas
  async crearSesion({ sucursal_id, ventas_ids = [], orden = [], notas = '', fecha_reparto = null }) {
    const payload = { sucursal_id, ventas_ids, orden, notas, fecha_reparto };
    return await this.post('/sessions', payload);
  }

  async obtenerSesion(sesionId) {
    return await this.get(`/sessions/${sesionId}`);
  }

  // Guarda el orden de entrega definido manualmente
  async actualizarOrden(sesionId, orden) {
    return await this.put(`/sessions/${sesionId}/orden`, { orden });
  }

  // Marca una entrega como realizada y opcionalmente registra el pago
  async marcarEntregada({ sesion_id, venta_id, pago }) {
    return await this.post(`/sessions/${sesion_id}/entregar`, { venta_id, pago });
  }

  // Obtiene ventas pendientes para reparto (por fecha/estado)
  async obtenerVentasParaReparto({ sucursal_id, fecha, estado = 'entregado_pendiente' }) {
    const params = {};
    if (sucursal_id) params.sucursal_id = sucursal_id;
    if (fecha) params.fecha = fecha;
    if (estado) params.estado = estado;
    return await this.get('/ventas-pendientes', params);
  }
}

export default new RepartoService();


