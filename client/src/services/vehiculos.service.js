// src/services/vehiculos.service.js
import FirebaseService from './firebase.service';

/**
 * Servicio para gestión de vehículos con Firebase
 */
class VehiculosService extends FirebaseService {
  constructor() {
    super('/vehiculos');
  }

  /**
   * Obtiene todos los vehículos
   * @returns {Promise<Array>} Lista de vehículos con alertas
   */
  async obtenerTodos() {
    try {
      console.log('🚗 Obteniendo todos los vehículos...');
      const vehiculos = await this.get('');
      
      const vehiculosArray = this.ensureArray(vehiculos);
      console.log(`✅ Vehículos cargados: ${vehiculosArray.length}`);
      
      return vehiculosArray;
    } catch (error) {
      console.error('❌ Error al obtener vehículos:', error);
      throw error;
    }
  }

  /**
   * Obtiene un vehículo por ID con historial completo
   * @param {string} id - ID del vehículo
   * @returns {Promise<Object>} Vehículo con historial
   */
  async obtenerPorId(id) {
    try {
      console.log(`🚗 Obteniendo vehículo ID: ${id}`);
      const vehiculo = await this.get(`/${id}`);
      
      const vehiculoObj = this.ensureObject(vehiculo);
      console.log(`✅ Vehículo obtenido:`, vehiculoObj);
      
      return vehiculoObj;
    } catch (error) {
      console.error(`❌ Error al obtener vehículo ${id}:`, error);
      throw error;
    }
  }

  /**
   * Crea un nuevo vehículo
   * @param {Object} vehiculo - Datos del vehículo
   * @returns {Promise<Object>} Vehículo creado
   */
  async crear(vehiculo) {
    try {
      console.log('🆕 Creando vehículo:', vehiculo);
      
      // Validación básica
      if (!vehiculo.patente || !vehiculo.marca || !vehiculo.modelo) {
        throw new Error('Patente, marca y modelo son requeridos');
      }
      
      const resultado = await this.post('', vehiculo);
      console.log('✅ Vehículo creado:', resultado);
      
      return resultado;
    } catch (error) {
      console.error('❌ Error al crear vehículo:', error);
      throw error;
    }
  }

  /**
   * Actualiza un vehículo
   * @param {string} id - ID del vehículo
   * @param {Object} datos - Datos a actualizar
   * @returns {Promise<Object>} Respuesta de la actualización
   */
  async actualizar(id, datos) {
    try {
      console.log(`🔄 Actualizando vehículo ${id}:`, datos);
      
      const resultado = await this.put(`/${id}`, datos);
      console.log('✅ Vehículo actualizado:', resultado);
      
      return resultado;
    } catch (error) {
      console.error(`❌ Error al actualizar vehículo ${id}:`, error);
      throw error;
    }
  }

  /**
   * Desactiva un vehículo (soft delete)
   * @param {string} id - ID del vehículo
   * @returns {Promise<Object>} Respuesta de la desactivación
   */
  async eliminar(id) {
    try {
      console.log(`🗑️ Desactivando vehículo ${id}`);
      const resultado = await this.delete(`/${id}`);
      console.log('✅ Vehículo desactivado:', resultado);
      
      return resultado;
    } catch (error) {
      console.error(`❌ Error al desactivar vehículo ${id}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas generales de la flota
   * @returns {Promise<Object>} Estadísticas de la flota
   */
  async obtenerEstadisticas() {
    try {
      console.log('📊 Obteniendo estadísticas de la flota...');
      const stats = await this.get('/estadisticas/resumen');
      
      const statsObj = this.ensureObject(stats);
      console.log('✅ Estadísticas obtenidas:', statsObj);
      
      return statsObj;
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      return {
        total_vehiculos: 0,
        total_km_flota: 0,
        gastos_mes_actual: {
          combustible: 0,
          servicios: 0,
          varios: 0,
          total: 0
        },
        alertas_seguro: []
      };
    }
  }

  // === COMBUSTIBLE ===
  
  /**
   * Registra una carga de combustible
   * @param {Object} carga - Datos de la carga
   * @returns {Promise<Object>} Carga registrada
   */
  async registrarCombustible(carga) {
    try {
      console.log('⛽ Registrando carga de combustible:', carga);
      
      // Cambiar a la ruta de combustible
      const combustibleService = new FirebaseService('/combustible');
      const resultado = await combustibleService.post('', carga);
      
      console.log('✅ Carga registrada:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ Error al registrar combustible:', error);
      throw error;
    }
  }

  /**
   * Obtiene historial de combustible
   * @param {Object} filtros - Filtros de búsqueda
   * @returns {Promise<Array>} Lista de cargas
   */
  async obtenerCombustible(filtros = {}) {
    try {
      console.log('⛽ Obteniendo historial de combustible:', filtros);
      
      const combustibleService = new FirebaseService('/combustible');
      const cargas = await combustibleService.get('', filtros);
      
      const cargasArray = this.ensureArray(cargas);
      console.log(`✅ Cargas obtenidas: ${cargasArray.length}`);
      
      return cargasArray;
    } catch (error) {
      console.error('❌ Error al obtener combustible:', error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de combustible por vehículo
   * @param {string} vehiculoId - ID del vehículo
   * @returns {Promise<Object>} Estadísticas de combustible
   */
  async obtenerEstadisticasCombustible(vehiculoId) {
    try {
      console.log(`📊 Obteniendo estadísticas de combustible para ${vehiculoId}`);
      
      const combustibleService = new FirebaseService('/combustible');
      const stats = await combustibleService.get(`/estadisticas/${vehiculoId}`);
      
      const statsObj = this.ensureObject(stats);
      console.log('✅ Estadísticas de combustible:', statsObj);
      
      return statsObj;
    } catch (error) {
      console.error('❌ Error al obtener estadísticas de combustible:', error);
      return {
        total_cargas: 0,
        total_litros: 0,
        total_gastado: 0,
        consumo_promedio: 0,
        precio_promedio_litro: 0,
        km_recorridos: 0
      };
    }
  }

  // === SERVICIOS ===
  
  /**
   * Registra un servicio/mantenimiento
   * @param {Object} servicio - Datos del servicio
   * @returns {Promise<Object>} Servicio registrado
   */
  async registrarServicio(servicio) {
    try {
      console.log('🔧 Registrando servicio:', servicio);
      
      const serviciosService = new FirebaseService('/servicios-vehiculos');
      const resultado = await serviciosService.post('', servicio);
      
      console.log('✅ Servicio registrado:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ Error al registrar servicio:', error);
      throw error;
    }
  }

  /**
   * Obtiene historial de servicios
   * @param {Object} filtros - Filtros de búsqueda
   * @returns {Promise<Array>} Lista de servicios
   */
  async obtenerServicios(filtros = {}) {
    try {
      console.log('🔧 Obteniendo historial de servicios:', filtros);
      
      const serviciosService = new FirebaseService('/servicios-vehiculos');
      const servicios = await serviciosService.get('', filtros);
      
      const serviciosArray = this.ensureArray(servicios);
      console.log(`✅ Servicios obtenidos: ${serviciosArray.length}`);
      
      return serviciosArray;
    } catch (error) {
      console.error('❌ Error al obtener servicios:', error);
      return [];
    }
  }

  /**
   * Actualiza un servicio
   * @param {string} id - ID del servicio
   * @param {Object} datos - Datos a actualizar
   * @returns {Promise<Object>} Respuesta de la actualización
   */
  async actualizarServicio(id, datos) {
    try {
      console.log(`🔧 Actualizando servicio ${id}:`, datos);
      
      const serviciosService = new FirebaseService('/servicios-vehiculos');
      const resultado = await serviciosService.put(`/${id}`, datos);
      
      console.log('✅ Servicio actualizado:', resultado);
      return resultado;
    } catch (error) {
      console.error(`❌ Error al actualizar servicio ${id}:`, error);
      throw error;
    }
  }

  // === GASTOS ===
  
  /**
   * Registra un gasto del vehículo
   * @param {Object} gasto - Datos del gasto
   * @returns {Promise<Object>} Gasto registrado
   */
  async registrarGasto(gasto) {
    try {
      console.log('💰 Registrando gasto:', gasto);
      
      const gastosService = new FirebaseService('/gastos-vehiculos');
      const resultado = await gastosService.post('', gasto);
      
      console.log('✅ Gasto registrado:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ Error al registrar gasto:', error);
      throw error;
    }
  }

  /**
   * Obtiene historial de gastos
   * @param {Object} filtros - Filtros de búsqueda
   * @returns {Promise<Array>} Lista de gastos
   */
  async obtenerGastos(filtros = {}) {
    try {
      console.log('💰 Obteniendo historial de gastos:', filtros);
      
      const gastosService = new FirebaseService('/gastos-vehiculos');
      const gastos = await gastosService.get('', filtros);
      
      const gastosArray = this.ensureArray(gastos);
      console.log(`✅ Gastos obtenidos: ${gastosArray.length}`);
      
      return gastosArray;
    } catch (error) {
      console.error('❌ Error al obtener gastos:', error);
      return [];
    }
  }

  /**
   * Elimina un gasto
   * @param {string} id - ID del gasto
   * @returns {Promise<Object>} Respuesta de la eliminación
   */
  async eliminarGasto(id) {
    try {
      console.log(`🗑️ Eliminando gasto ${id}`);
      
      const gastosService = new FirebaseService('/gastos-vehiculos');
      const resultado = await gastosService.delete(`/${id}`);
      
      console.log('✅ Gasto eliminado:', resultado);
      return resultado;
    } catch (error) {
      console.error(`❌ Error al eliminar gasto ${id}:`, error);
      throw error;
    }
  }
}

export default new VehiculosService();