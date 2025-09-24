// src/services/produccion.service.js - SERVICIO FRONTEND PARA PRODUCCIÓN
import FirebaseService from './firebase.service';

/**
 * Servicio para gestión de órdenes de producción
 * Integrado con materias primas, recetas y productos
 */
class ProduccionService extends FirebaseService {
  constructor() {
    super('/produccion');
  }

  /**
   * Obtener todas las órdenes de producción
   * @param {Object} filtros - Filtros opcionales (estado, fecha_desde, fecha_hasta)
   * @returns {Promise<Array>} Lista de órdenes de producción
   */
  async obtenerOrdenes(filtros = {}) {
    try {
      console.log('🏭 [PRODUCCIÓN SERVICE] Obteniendo órdenes de producción', filtros);
      const data = await this.get('', filtros);
      console.log(`✅ [PRODUCCIÓN SERVICE] ${data?.length || 0} órdenes obtenidas`);
      return this.ensureArray(data);
    } catch (error) {
      console.error('❌ [PRODUCCIÓN SERVICE] Error al obtener órdenes:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las órdenes (alias para compatibilidad)
   * @param {Object} filtros - Filtros opcionales
   * @returns {Promise<Array>} Lista de órdenes de producción
   */
  async obtenerTodas(filtros = {}) {
    return this.obtenerOrdenes(filtros);
  }

  /**
   * Obtener órdenes pendientes
   * @returns {Promise<Array>} Lista de órdenes pendientes
   */
  async obtenerPendientes() {
    try {
      console.log('🏭 [PRODUCCIÓN SERVICE] Obteniendo órdenes pendientes');
      const data = await this.get('/pendientes');
      console.log(`✅ [PRODUCCIÓN SERVICE] ${data?.length || 0} órdenes pendientes`);
      return this.ensureArray(data);
    } catch (error) {
      console.error('❌ [PRODUCCIÓN SERVICE] Error al obtener órdenes pendientes:', error);
      throw error;
    }
  }

  /**
   * Obtener orden de producción por ID con detalles completos
   * @param {string} id - ID de la orden
   * @returns {Promise<Object>} Datos completos de la orden (orden, receta, ingredientes, producto)
   */
  async obtenerPorId(id) {
    try {
      if (!id) {
        throw new Error('El ID de la orden es requerido');
      }

      console.log(`🏭 [PRODUCCIÓN SERVICE] Obteniendo orden: ${id}`);
      const data = await this.get(`/${id}`);
      console.log(`✅ [PRODUCCIÓN SERVICE] Orden obtenida: ${data?.orden?.numero || 'Sin número'}`);
      return this.ensureObject(data);
    } catch (error) {
      console.error('❌ [PRODUCCIÓN SERVICE] Error al obtener orden:', error);
      throw error;
    }
  }

  /**
   * Crear nueva orden de producción
   * @param {Object} orden - Datos de la orden
   * @returns {Promise<Object>} Orden creada
   */
  async crear(orden) {
	  try {
		// Validaciones frontend
		this.validarOrden(orden);

		console.log('🏭 [PRODUCCIÓN SERVICE] Creando nueva orden de producción');
		
		const response = await this.post('', orden);
		console.log('✅ [PRODUCCIÓN SERVICE] Respuesta del servidor:', response);
		
		// Si la respuesta viene envuelta, desenvolverla
		if (response && response.data) {
		  console.log(`✅ [PRODUCCIÓN SERVICE] Orden creada con ID: ${response.data.id || response.id}`);
		  return response.data;
		}
		
		console.log(`✅ [PRODUCCIÓN SERVICE] Orden creada: ${response?.numero || 'Sin número'}`);
		return response;
	  } catch (error) {
		console.error('❌ [PRODUCCIÓN SERVICE] Error al crear orden:', error);
		throw error;
	  }
	}

  /**
   * Cambiar estado de una orden de producción
   * @param {string} id - ID de la orden
   * @param {string} estado - Nuevo estado (pendiente, en_proceso, completada, cancelada)
   * @param {Object} datos - Datos adicionales (usuario_id, usuario_nombre)
   * @returns {Promise<Object>} Resultado de la operación
   */
  async cambiarEstado(id, estado, datos = {}) {
    try {
      if (!id) {
        throw new Error('El ID de la orden es requerido');
      }

      if (!estado) {
        throw new Error('El estado es requerido');
      }

      const estadosPermitidos = ['pendiente', 'en_proceso', 'completada', 'cancelada'];
      if (!estadosPermitidos.includes(estado)) {
        throw new Error('Estado inválido');
      }

      console.log(`🏭 [PRODUCCIÓN SERVICE] Cambiando estado de orden ${id} a: ${estado}`);
      
      const payload = {
        estado,
        ...datos
      };

      const data = await this.patch(`/${id}/estado`, payload);
      console.log(`✅ [PRODUCCIÓN SERVICE] Estado cambiado a: ${estado}`);
      return this.ensureObject(data);
    } catch (error) {
      console.error('❌ [PRODUCCIÓN SERVICE] Error al cambiar estado:', error);
      throw error;
    }
  }

  /**
   * Iniciar producción (cambiar a en_proceso)
   * @param {string} id - ID de la orden
   * @param {Object} usuario - Datos del usuario
   * @returns {Promise<Object>} Resultado de la operación
   */
  async iniciar(id, usuario = {}) {
    try {
      console.log(`🏭 [PRODUCCIÓN SERVICE] Iniciando producción: ${id}`);
      return await this.cambiarEstado(id, 'en_proceso', {
        usuario_id: usuario.id,
        usuario_nombre: usuario.nombre
      });
    } catch (error) {
      console.error('❌ [PRODUCCIÓN SERVICE] Error al iniciar producción:', error);
      throw error;
    }
  }

  /**
   * Completar producción
   * @param {string} id - ID de la orden
   * @param {Object} usuario - Datos del usuario
   * @returns {Promise<Object>} Resultado de la operación
   */
  async completar(id, usuario = {}) {
    try {
      console.log(`🏭 [PRODUCCIÓN SERVICE] Completando producción: ${id}`);
      return await this.cambiarEstado(id, 'completada', {
        usuario_id: usuario.id,
        usuario_nombre: usuario.nombre
      });
    } catch (error) {
      console.error('❌ [PRODUCCIÓN SERVICE] Error al completar producción:', error);
      throw error;
    }
  }

  /**
   * Cancelar orden de producción
   * @param {string} id - ID de la orden
   * @param {Object} usuario - Datos del usuario
   * @returns {Promise<Object>} Resultado de la operación
   */
  async cancelar(id, usuario = {}) {
    try {
      console.log(`🏭 [PRODUCCIÓN SERVICE] Cancelando orden: ${id}`);
      return await this.cambiarEstado(id, 'cancelada', {
        usuario_id: usuario.id,
        usuario_nombre: usuario.nombre
      });
    } catch (error) {
      console.error('❌ [PRODUCCIÓN SERVICE] Error al cancelar orden:', error);
      throw error;
    }
  }

  /**
   * Verificar stock disponible para una receta antes de crear orden
   * @param {string} recetaId - ID de la receta
   * @param {number} cantidad - Cantidad a producir
   * @returns {Promise<Object>} Resultado de verificación de stock
   */
  async verificarStock(recetaId, cantidad = 1) {
    try {
      if (!recetaId) {
        throw new Error('El ID de la receta es requerido');
      }

      console.log(`🏭 [PRODUCCIÓN SERVICE] Verificando stock para receta ${recetaId}, cantidad: ${cantidad}`);

      // Importar recetasService para usar su verificación de stock
      const { default: recetasService } = await import('./recetas.service');
      const verificacion = await recetasService.verificarStock(recetaId, cantidad);
      
      console.log(`✅ [PRODUCCIÓN SERVICE] Verificación completada - Stock suficiente: ${verificacion.stock_suficiente}`);
      return verificacion;
    } catch (error) {
      console.error('❌ [PRODUCCIÓN SERVICE] Error al verificar stock:', error);
      throw error;
    }
  }

  /**
   * Calcular costos de producción para una receta y cantidad
   * @param {string} recetaId - ID de la receta
   * @param {number} cantidad - Cantidad a producir
   * @returns {Promise<Object>} Información de costos
   */
  async calcularCostos(recetaId, cantidad = 1) {
    try {
      if (!recetaId) {
        throw new Error('El ID de la receta es requerido');
      }

      console.log(`🏭 [PRODUCCIÓN SERVICE] Calculando costos para receta ${recetaId}, cantidad: ${cantidad}`);

      // Importar recetasService para obtener costos
      const { default: recetasService } = await import('./recetas.service');
      const costosReceta = await recetasService.calcularCosto(recetaId);
      const receta = await recetasService.obtenerPorId(recetaId);
      
      // Calcular costos según la cantidad solicitada
      const rendimiento = parseInt(receta.rendimiento || 1);
      const factor = cantidad / rendimiento;
      
      const costos = {
        costo_materias_primas: parseFloat(costosReceta.costo_materias_primas) * factor,
        costo_mano_obra: parseFloat(costosReceta.costo_mano_obra) * factor,
        costo_adicional: parseFloat(costosReceta.costo_adicional) * factor,
        costo_total: parseFloat(costosReceta.costo_total) * factor,
        costo_unitario: parseFloat(costosReceta.costo_total) * factor / cantidad,
        cantidad: cantidad,
        rendimiento: rendimiento,
        fecha_calculo: new Date().toISOString()
      };
      
      console.log(`✅ [PRODUCCIÓN SERVICE] Costos calculados - Total: $${costos.costo_total.toFixed(2)}`);
      return costos;
    } catch (error) {
      console.error('❌ [PRODUCCIÓN SERVICE] Error al calcular costos:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de producción
   * @param {Object} filtros - Filtros de fecha, etc.
   * @returns {Promise<Object>} Estadísticas de producción
   */
  async obtenerEstadisticas(filtros = {}) {
    try {
      console.log('🏭 [PRODUCCIÓN SERVICE] Obteniendo estadísticas de producción');
      
      const ordenes = await this.obtenerOrdenes(filtros);
      
      const estadisticas = {
        total_ordenes: ordenes.length,
        ordenes_pendientes: ordenes.filter(o => o.estado === 'pendiente').length,
        ordenes_en_proceso: ordenes.filter(o => o.estado === 'en_proceso').length,
        ordenes_completadas: ordenes.filter(o => o.estado === 'completada').length,
        ordenes_canceladas: ordenes.filter(o => o.estado === 'cancelada').length,
        unidades_producidas: ordenes
          .filter(o => o.estado === 'completada')
          .reduce((total, orden) => total + parseInt(orden.cantidad || 0), 0),
        costo_total_produccion: ordenes
          .filter(o => o.estado === 'completada')
          .reduce((total, orden) => total + parseFloat(orden.costo_total || 0), 0),
        productos_mas_producidos: this.calcularProductosMasProducidos(ordenes)
      };
      
      console.log(`✅ [PRODUCCIÓN SERVICE] Estadísticas calculadas`);
      return estadisticas;
    } catch (error) {
      console.error('❌ [PRODUCCIÓN SERVICE] Error al obtener estadísticas:', error);
      throw error;
    }
  }

  /**
   * Calcular productos más producidos (helper para estadísticas)
   * @param {Array} ordenes - Lista de órdenes
   * @returns {Array} Lista de productos con cantidades
   */
  calcularProductosMasProducidos(ordenes) {
    const productosMap = new Map();
    
    ordenes
      .filter(orden => orden.estado === 'completada')
      .forEach(orden => {
        const productoId = orden.producto_id;
        const cantidad = parseInt(orden.cantidad || 0);
        
        if (productosMap.has(productoId)) {
          productosMap.set(productoId, {
            ...productosMap.get(productoId),
            cantidad_total: productosMap.get(productoId).cantidad_total + cantidad,
            ordenes_count: productosMap.get(productoId).ordenes_count + 1
          });
        } else {
          productosMap.set(productoId, {
            producto_id: productoId,
            producto_nombre: orden.producto_nombre || 'Producto sin nombre',
            cantidad_total: cantidad,
            ordenes_count: 1
          });
        }
      });
    
    return Array.from(productosMap.values())
      .sort((a, b) => b.cantidad_total - a.cantidad_total)
      .slice(0, 10); // Top 10
  }

  /**
   * Validar datos de orden de producción
   * @param {Object} orden - Datos a validar
   */
  validarOrden(orden) {
    if (!orden.receta_id) {
      throw new Error('La receta es obligatoria');
    }

    if (!orden.cantidad || parseInt(orden.cantidad) < 1) {
      throw new Error('La cantidad debe ser al menos 1');
    }

    if (orden.cantidad !== undefined && parseInt(orden.cantidad) > 10000) {
      throw new Error('La cantidad no puede exceder 10,000 unidades');
    }
  }

  /**
   * Formatear estado para mostrar en UI
   * @param {string} estado - Estado a formatear
   * @returns {Object} Estado formateado con texto y color
   */
  formatearEstado(estado) {
    const estados = {
      'pendiente': {
        texto: 'Pendiente',
        color: 'warning',
        icono: 'clock'
      },
      'en_proceso': {
        texto: 'En Proceso',
        color: 'info',
        icono: 'play'
      },
      'completada': {
        texto: 'Completada',
        color: 'success',
        icono: 'check'
      },
      'cancelada': {
        texto: 'Cancelada',
        color: 'danger',
        icono: 'times'
      }
    };

    return estados[estado] || {
      texto: estado,
      color: 'secondary',
      icono: 'question'
    };
  }

  /**
   * Obtener órdenes por estado específico
   * @param {string} estado - Estado a filtrar
   * @returns {Promise<Array>} Lista de órdenes del estado
   */
  async obtenerPorEstado(estado) {
    try {
      console.log(`🏭 [PRODUCCIÓN SERVICE] Obteniendo órdenes por estado: ${estado}`);
      return await this.obtenerOrdenes({ estado });
    } catch (error) {
      console.error('❌ [PRODUCCIÓN SERVICE] Error al obtener órdenes por estado:', error);
      throw error;
    }
  }

  /**
   * Buscar órdenes por número de orden
   * @param {string} termino - Término de búsqueda
   * @returns {Promise<Array>} Lista de órdenes encontradas
   */
  async buscar(termino) {
    try {
      if (!termino || termino.length < 2) {
        throw new Error('El término de búsqueda debe tener al menos 2 caracteres');
      }

      console.log(`🔍 [PRODUCCIÓN SERVICE] Buscando órdenes: "${termino}"`);
      
      const todasLasOrdenes = await this.obtenerOrdenes();
      const ordenesEncontradas = todasLasOrdenes.filter(orden => 
        orden.numero?.toLowerCase().includes(termino.toLowerCase()) ||
        orden.producto_nombre?.toLowerCase().includes(termino.toLowerCase()) ||
        orden.receta_nombre?.toLowerCase().includes(termino.toLowerCase())
      );
      
      console.log(`✅ [PRODUCCIÓN SERVICE] ${ordenesEncontradas.length} órdenes encontradas`);
      return ordenesEncontradas;
    } catch (error) {
      console.error('❌ [PRODUCCIÓN SERVICE] Error en búsqueda:', error);
      throw error;
    }
  }
}

// Crear instancia del servicio
const produccionService = new ProduccionService();
export default produccionService;