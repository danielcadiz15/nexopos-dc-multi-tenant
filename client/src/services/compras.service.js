// src/services/compras.service.js - REEMPLAZAR COMPLETO
import FirebaseService from './firebase.service';

// Datos de respaldo para compras
const COMPRAS_RESPALDO = [];

/**
 * Servicio para gestión de compras con Firebase
 */
class ComprasService extends FirebaseService {
  constructor() {
    super('/compras');
  }

  /**
   * Obtiene todas las compras
   * @returns {Promise<Array>} Lista de compras
   */
  async obtenerTodas() {
    try {
      console.log('🔄 Obteniendo todas las compras...');
      const compras = await this.get('');
      
      const comprasArray = this.ensureArray(compras);
      
      if (comprasArray.length === 0) {
        console.log('⚠️ No hay compras, usando datos de respaldo');
        return COMPRAS_RESPALDO;
      }
      
      console.log(`✅ Compras cargadas: ${comprasArray.length}`);
      return comprasArray;
      
    } catch (error) {
      console.error('❌ Error al obtener compras:', error);
      console.log('🔄 Usando datos de respaldo');
      return COMPRAS_RESPALDO;
    }
  }

  /**
   * Obtiene una compra por su ID
   * @param {string} id - ID de la compra
   * @returns {Promise<Object>} Datos de la compra
   */
  async obtenerPorId(id) {
    try {
      console.log(`🔄 Obteniendo compra ID: ${id}`);
      const compra = await this.get(`/${id}`);
      
      const compraObj = this.ensureObject(compra);
      
      if (!compraObj || Object.keys(compraObj).length === 0) {
        throw new Error(`Compra ${id} no encontrada`);
      }
      
      console.log(`✅ Compra obtenida:`, compraObj);
      return compraObj;
      
    } catch (error) {
      console.error(`❌ Error al obtener compra ${id}:`, error);
      throw error;
    }
  }

  /**
   * Crea una nueva compra
   * @param {Object} compra - Datos de la compra
   * @param {Array} detalles - Detalles de productos
   * @returns {Promise<Object>} Compra creada
   */
  async crear(compra, detalles) {
    try {
      console.log('🆕 Creando compra:', { compra, detalles });
      
      // Validación básica
      if (!compra.proveedor_id) {
        throw new Error('El proveedor es requerido');
      }
      
      if (!detalles || detalles.length === 0) {
        throw new Error('Debe agregar al menos un producto');
      }
      
      // Estructura para enviar
      const compraCompleta = {
        ...compra,
        detalles: detalles,
        fecha: compra.fecha || new Date().toISOString(),
        estado: compra.estado || 'pendiente',
        total: detalles.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0)
      };
      
      const resultado = await this.post('', compraCompleta);
      console.log('✅ Compra creada:', resultado);
      
      return resultado;
    } catch (error) {
      console.error('❌ Error al crear compra:', error);
      throw error;
    }
  }

  /**
   * Recibe una compra (cambia estado a 'recibida')
   * @param {string} id - ID de la compra
   * @param {Object} datos - Datos adicionales para la recepción
   * @returns {Promise<Object>} Respuesta de la API
   */
  async recibirCompra(id, datos = {}) {
    try {
      console.log(`📦 Recibiendo compra ${id}`);
      
      const resultado = await this.put(`/${id}`, {
        estado: 'completada',
        fecha_recepcion: new Date().toISOString(),
        ...datos
      });
      
      console.log('✅ Compra recibida:', resultado);
      return resultado;
    } catch (error) {
      console.error(`❌ Error al recibir compra ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cancela una compra pendiente
   * @param {string} id - ID de la compra
   * @returns {Promise<Object>} Respuesta de la API
   */
  async cancelarCompra(id) {
    try {
      console.log(`❌ Cancelando compra ${id}`);
      
      const resultado = await this.put(`/${id}`, {
        estado: 'cancelada',
        fecha_cancelacion: new Date().toISOString()
      });
      
      console.log('✅ Compra cancelada:', resultado);
      return resultado;
    } catch (error) {
      console.error(`❌ Error al cancelar compra ${id}:`, error);
      throw error;
    }
  }

  /**
   * Devuelve una compra recibida
   * @param {string} id - ID de la compra
   * @returns {Promise<Object>} Respuesta de la API
   */
  async devolverCompra(id) {
    try {
      console.log(`🔄 Devolviendo compra ${id}`);
      
      const resultado = await this.put(`/${id}`, {
        estado: 'devuelta',
        fecha_devolucion: new Date().toISOString()
      });
      
      console.log('✅ Compra devuelta:', resultado);
      return resultado;
    } catch (error) {
      console.error(`❌ Error al devolver compra ${id}:`, error);
      throw error;
    }
  }
	async obtenerPorFiltros(filtros) {
	  try {
		console.log('🔄 Obteniendo compras con filtros:', filtros);
		
		const params = new URLSearchParams();
		if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
		if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
		if (filtros.estado) params.append('estado', filtros.estado);
		if (filtros.proveedor_id) params.append('proveedor_id', filtros.proveedor_id);
		
		const compras = await this.get(`?${params.toString()}`);
		const comprasArray = this.ensureArray(compras);
		
		console.log(`✅ Compras filtradas: ${comprasArray.length}`);
		return comprasArray;
		
	  } catch (error) {
		console.error('❌ Error al obtener compras filtradas:', error);
		return [];
	  }
	}
	// En src/services/compras.service.js, agregar estos métodos:

/**
 * Obtiene resumen de compras para reportes
 */
async obtenerResumenReporte(filtros) {
  try {
    console.log('📊 Obteniendo resumen de compras:', filtros);
    
    // Por ahora, calcular el resumen desde las compras filtradas
    const compras = await this.obtenerPorFiltros(filtros);
    
    let total = 0;
    let pendientePago = 0;
    let comprasPendientes = 0;
    const proveedoresSet = new Set();
    const productosSet = new Set();
    let unidadesCompradas = 0;
    
    compras.forEach(compra => {
      total += parseFloat(compra.total || 0);
      
      if (compra.estado === 'pendiente') {
        comprasPendientes++;
        pendientePago += parseFloat(compra.total || 0);
      }
      
      if (compra.proveedor_id) {
        proveedoresSet.add(compra.proveedor_id);
      }
      
      if (compra.detalles && Array.isArray(compra.detalles)) {
        compra.detalles.forEach(detalle => {
          unidadesCompradas += parseFloat(detalle.cantidad || 0);
          if (detalle.producto_id) {
            productosSet.add(detalle.producto_id);
          }
        });
      }
    });
    
    return {
      total: total,
      cantidad_compras: compras.length,
      proveedores_unicos: proveedoresSet.size,
      productos_unicos: productosSet.size,
      unidades_compradas: unidadesCompradas,
      compras_pendientes: comprasPendientes,
      pendiente_pago: pendientePago
    };
    
  } catch (error) {
    console.error('❌ Error al obtener resumen:', error);
    return {
      total: 0,
      cantidad_compras: 0,
      proveedores_unicos: 0,
      productos_unicos: 0,
      unidades_compradas: 0,
      compras_pendientes: 0,
      pendiente_pago: 0
    };
  }
}

/**
 * Agrupa compras por día
 */
async obtenerComprasPorDia(filtros) {
  try {
    const compras = await this.obtenerPorFiltros(filtros);
    const comprasPorDia = {};
    
    compras.forEach(compra => {
      const fecha = new Date(compra.fecha).toISOString().split('T')[0];
      
      if (!comprasPorDia[fecha]) {
        comprasPorDia[fecha] = {
          fecha: fecha,
          total: 0,
          cantidad: 0
        };
      }
      
      comprasPorDia[fecha].total += parseFloat(compra.total || 0);
      comprasPorDia[fecha].cantidad++;
    });
    
    return Object.values(comprasPorDia).sort((a, b) => a.fecha.localeCompare(b.fecha));
    
  } catch (error) {
    console.error('❌ Error al agrupar por día:', error);
    return [];
  }
}

/**
 * Agrupa compras por proveedor
 */
async obtenerComprasPorProveedor(filtros) {
  try {
    const compras = await this.obtenerPorFiltros(filtros);
    const comprasPorProveedor = {};
    let totalGeneral = 0;
    
    compras.forEach(compra => {
      const proveedorId = compra.proveedor_id || 'sin_proveedor';
      const nombre = compra.proveedor || 'Proveedor desconocido';
      
      if (!comprasPorProveedor[proveedorId]) {
        comprasPorProveedor[proveedorId] = {
          proveedor_id: proveedorId,
          nombre: nombre,
          total: 0,
          cantidad: 0,
          porcentaje: 0
        };
      }
      
      comprasPorProveedor[proveedorId].total += parseFloat(compra.total || 0);
      comprasPorProveedor[proveedorId].cantidad++;
      totalGeneral += parseFloat(compra.total || 0);
    });
    
    // Calcular porcentajes
    Object.values(comprasPorProveedor).forEach(proveedor => {
      proveedor.porcentaje = totalGeneral > 0 ? (proveedor.total / totalGeneral) * 100 : 0;
    });
    
    return Object.values(comprasPorProveedor).sort((a, b) => b.total - a.total);
    
  } catch (error) {
    console.error('❌ Error al agrupar por proveedor:', error);
    return [];
  }
}

	/**
	 * Obtiene productos más comprados
	 */
	async obtenerProductosMasComprados(filtros) {
	  try {
		const compras = await this.obtenerPorFiltros(filtros);
		const productosComprados = {};
		
		compras.forEach(compra => {
		  if (compra.detalles && Array.isArray(compra.detalles)) {
			compra.detalles.forEach(detalle => {
			  if (detalle.producto_id) {
				const id = detalle.producto_id;
				
				if (!productosComprados[id]) {
				  productosComprados[id] = {
					id: parseFloat(id),
					nombre: detalle.producto_nombre || 'Producto sin nombre',
					codigo: detalle.producto_codigo || 'N/A',
					cantidad: 0,
					total: 0,
					proveedor: compra.proveedor || 'Sin proveedor'
				  };
				}
				
				productosComprados[id].cantidad += parseFloat(detalle.cantidad || 0);
				productosComprados[id].total += parseFloat(detalle.cantidad || 0) * parseFloat(detalle.precio_unitario || 0);
			  }
			});
		  }
		});
		
		return Object.values(productosComprados)
		  .sort((a, b) => b.cantidad - a.cantidad)
		  .slice(0, 20);
		
	  } catch (error) {
		console.error('❌ Error al obtener productos más comprados:', error);
		return [];
	  }
	}
  /**
   * Obtiene compras por proveedor
   * @param {string} proveedorId - ID del proveedor
   * @returns {Promise<Array>} Lista de compras del proveedor
   */
  async obtenerPorProveedor(proveedorId) {
    try {
      console.log(`🔄 Obteniendo compras del proveedor ${proveedorId}`);
      
      const compras = await this.get(`/proveedor/${proveedorId}`);
      const comprasArray = this.ensureArray(compras);
      
      console.log(`✅ Compras del proveedor: ${comprasArray.length}`);
      return comprasArray;
    } catch (error) {
      console.error(`❌ Error al obtener compras del proveedor:`, error);
      return [];
    }
  }
}

export default new ComprasService();