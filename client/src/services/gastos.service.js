import FirebaseService from './firebase.service';

class GastosService extends FirebaseService {
  constructor() {
    super('/gastos');
  }

  async obtenerTodos(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
      if (filtros.categoria) params.append('categoria', filtros.categoria);
      if (filtros.origen_fondos) params.append('origen_fondos', filtros.origen_fondos);
      if (typeof filtros.incluir_en_costos === 'boolean') {
        params.append('incluir_en_costos', String(filtros.incluir_en_costos));
      }
      const query = params.toString();
      const result = await this.get(query ? `?${query}` : '');
      return this.ensureArray(result);
    } catch (error) {
      console.error('Error obteniendo gastos:', error);
      return [];
    }
  }

  async crear(payload) {
    return this.post('', payload);
  }

  async eliminar(id) {
    return this.delete(`/${id}`);
  }

  async obtenerReporte(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
      const query = params.toString();
      const result = await this.get(`/reporte${query ? `?${query}` : ''}`);
      return this.ensureObject(result);
    } catch (error) {
      console.error('Error obteniendo reporte de gastos:', error);
      return {
        resumen: {
          total: 0,
          total_caja: 0,
          total_externo: 0,
          total_incluir_costos: 0
        },
        por_categoria: [],
        por_dia: []
      };
    }
  }
}

export default new GastosService();
