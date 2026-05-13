// src/services/ventas.service.js - CORREGIDO PARA SUCURSALES
import FirebaseService from './firebase.service';
import clientesService from './clientes.service';
import productosService from './productos.service';

// Datos de respaldo para ventas
const VENTAS_RESPALDO = [
  {
    id: '1',
    cliente_id: null,
    cliente_info: { nombre: 'Cliente', apellido: 'General', nombre_completo: 'Cliente General' },
    sucursal_id: '1', // 🆕 AGREGAR SUCURSAL
    fecha: new Date().toISOString(),
    total: 0,
    estado: 'completada',
    metodo_pago: 'efectivo',
    estado_pago: 'pagado',
    total_pagado: 0,
    saldo_pendiente: 0,
    fecha_ultimo_pago: new Date().toISOString(),
    detalles: [],
    activo: true
  }
];

/**
 * Servicio optimizado para gestión de ventas con Firebase y Sistema de Pagos
 * 🆕 ACTUALIZADO PARA MANEJAR SUCURSALES CORRECTAMENTE
 */
class VentasServiceOptimizado extends FirebaseService {
  constructor() {
    super('/ventas'); // Módulo en Firebase Functions
  }

  /**
 * Obtiene todas las ventas con información de cliente enriquecida
 * 🆕 NUEVO: Con filtro opcional por sucursal y límite
 * @param {Object} filtros - Filtros opcionales { sucursal_id: '1', limit: 100 }
 * @returns {Promise<Array>} Lista de ventas con datos de cliente
 */
	async obtenerTodas(filtros = {}) {
	  try {
		console.log('🔄 Obteniendo ventas con filtros:', filtros);
		
		// Agregar límite por defecto si no se especifica
		const parametros = {
		  ...filtros,
		  limit: filtros.limit || 100  // Por defecto 100 ventas
		};
		
		const ventas = await this.get('', parametros);
		
		const ventasArray = this.ensureArray(ventas);
		
		if (ventasArray.length === 0) {
		  console.log('⚠️ No hay ventas, usando datos de respaldo');
		  return VENTAS_RESPALDO;
		}
		
		// Enriquecer ventas con información de cliente
		const ventasEnriquecidas = await this.enriquecerConClientes(ventasArray);
		
		console.log(`✅ Ventas cargadas y enriquecidas: ${ventasEnriquecidas.length}`);
		return ventasEnriquecidas;
		
	  } catch (error) {
		console.error('❌ Error al obtener ventas:', error);
		console.log('🔄 Usando datos de respaldo');
		return VENTAS_RESPALDO;
	  }
	}


  /**
   * 🆕 NUEVO: Obtiene ventas de una sucursal específica
   * @param {string} sucursalId - ID de la sucursal
   * @returns {Promise<Array>} Ventas de la sucursal
   */
	async obtenerPorSucursal(sucursalId, limit = 100) {
	  try {
		console.log(`🏪 Obteniendo ventas de sucursal: ${sucursalId}`);
		
		// CORRECCIÓN: Usar query parameters en lugar de path parameter
		const ventas = await this.get('', { 
		  sucursal_id: sucursalId,
		  limit: limit  // Agregar límite
		});
		const ventasArray = this.ensureArray(ventas);
		
		// Enriquecer con información de clientes
		const ventasEnriquecidas = await this.enriquecerConClientes(ventasArray);
		
		console.log(`✅ Ventas de sucursal: ${ventasEnriquecidas.length}`);
		return ventasEnriquecidas;
		
	  } catch (error) {
		console.error(`❌ Error al obtener ventas de sucursal ${sucursalId}:`, error);
		return [];
	  }
	}

  /**
   * Crea una nueva venta con validaciones y enriquecimiento automático
   * 🆕 ACTUALIZADO: Asegurar que siempre incluya sucursal_id
   * @param {Object} venta - Datos principales de la venta
   * @param {Array} detalles - Detalles de productos
   * @param {string} sucursalId - ID de la sucursal (OBLIGATORIO)
   * @returns {Promise<Object>} Venta creada
   */
  async crear(venta, detalles, sucursalId = null) {
    try {
      console.log('🆕 Creando venta optimizada:', { venta, detalles, sucursalId });
      
      // 🆕 VALIDACIÓN CRÍTICA: Sucursal obligatoria
      const sucursalFinal = sucursalId || venta.sucursal_id;
      if (!sucursalFinal) {
        throw new Error('La sucursal es obligatoria para registrar una venta');
      }
      
      // CAMBIO IMPORTANTE: Asegurar que tenemos cliente_info completo
      let cliente_info = null;
      if (venta.cliente_id) {
        try {
          // Cargar datos del cliente
          const cliente = await clientesService.obtenerPorId(venta.cliente_id);
          if (cliente) {
            cliente_info = {
              id: cliente.id,
              nombre: cliente.nombre || '',
              apellido: cliente.apellido || '',
              nombre_completo: `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || 'Cliente sin nombre'
            };
          }
        } catch (err) {
          console.error('Error al cargar info del cliente:', err);
        }
      }

      // CAMBIO IMPORTANTE: Enriquecer detalles con información completa de productos
      const detallesEnriquecidos = await Promise.all(detalles.map(async (detalle) => {
        try {
          const producto = await productosService.obtenerPorId(detalle.producto_id);
          return {
            ...detalle,
            // Incluir información de producto que necesitamos para mostrar en detalles
            producto_info: producto ? {
              id: producto.id,
              codigo: producto.codigo || '',
              nombre: producto.nombre || 'Producto sin nombre',
              descripcion: producto.descripcion || ''
            } : null
          };
        } catch (err) {
          console.warn(`No se pudo cargar información para producto ${detalle.producto_id}`, err);
          return detalle;
        }
      }));

      // 🆕 CALCULAR VALORES DE PAGO
      const total = parseFloat(venta.total || 0);
      const montoPagado = parseFloat(venta.monto_pagado || 0);
      const saldoPendiente = total - montoPagado;
      
      let estado_pago = 'pendiente';
      if (montoPagado >= total) {
        estado_pago = 'pagado';
      } else if (montoPagado > 0) {
        estado_pago = 'parcial';
      }
      
      // 🆕 ESTRUCTURA OPTIMIZADA CON SUCURSAL GARANTIZADA
      const ventaCompleta = {
        venta: {
          ...venta,
          sucursal_id: sucursalFinal, // 🆕 GARANTIZAR SUCURSAL
          cliente_info: cliente_info || {
            nombre: '',
            apellido: '',
            nombre_completo: venta.cliente_nombre || 'Cliente General'
          },
          // CAMPOS DE PAGO
          estado_pago,
          total_pagado: montoPagado,
          saldo_pendiente: saldoPendiente,
          monto_pagado: montoPagado // Para compatibilidad con backend
        },
        detalles: detallesEnriquecidos
      };
      
      console.log('📦 Enviando datos completos de venta con sucursal:', {
        sucursal_id: ventaCompleta.venta.sucursal_id,
        cliente_info: ventaCompleta.venta.cliente_info,
        total: ventaCompleta.venta.total,
        detalles_count: ventaCompleta.detalles.length
      });
      
      const resultado = await this.post('', ventaCompleta);
      // Validar respuesta: esperar data.id
      const idCreado = resultado?.data?.id || resultado?.id;
      if (!idCreado) {
        const mensaje = resultado?.data?.message || 'La API no devolvió un ID de venta';
        throw new Error(`No se pudo crear la venta. ${mensaje}`);
      }
      
      console.log('✅ Venta creada exitosamente:', resultado);
      return resultado;
      
    } catch (error) {
      console.error('❌ Error detallado al crear venta:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE PAGOS (sin cambios) ====================

  /**
   * Registra un pago para una venta
   * @param {string} ventaId - ID de la venta
   * @param {Object} pago - Datos del pago
   * @returns {Promise<Object>} Respuesta del pago registrado
   */
  async registrarPago(ventaId, pago) {
    try {
      console.log(`💰 Registrando pago para venta ${ventaId}:`, pago);
      
      const pagoDatos = {
        monto: parseFloat(pago.monto),
        // Enviar ambos por compatibilidad, backend usa medio_pago
        medio_pago: pago.medio_pago || pago.metodo_pago || 'efectivo',
        metodo_pago: pago.metodo_pago || pago.medio_pago || 'efectivo',
        concepto: pago.concepto || 'Pago de venta',
        referencia: pago.referencia || '',
        observaciones: pago.observaciones || ''
      };
      
      const resultado = await this.post(`/${ventaId}/pagos`, pagoDatos);
      
      console.log('✅ Pago registrado exitosamente:', resultado);
      return resultado;
      
    } catch (error) {
      console.error(`❌ Error al registrar pago para venta ${ventaId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de pagos de una venta
   * @param {string} ventaId - ID de la venta
   * @returns {Promise<Array>} Historial de pagos
   */
  async obtenerPagos(ventaId) {
    try {
      console.log(`🔄 Obteniendo pagos de venta ${ventaId}`);
      
      const pagos = await this.get(`/${ventaId}/pagos`);
      const pagosArray = this.ensureArray(pagos);
      
      console.log(`✅ Pagos obtenidos: ${pagosArray.length}`);
      return pagosArray;
      
    } catch (error) {
      console.error(`❌ Error al obtener pagos de venta ${ventaId}:`, error);
      return [];
    }
  }

  /**
   * Obtiene ventas con saldo pendiente
   * @param {string} sucursalId - ID de la sucursal (opcional)
   * @returns {Promise<Array>} Ventas con saldo pendiente
   */
  async obtenerVentasConSaldoPendiente(sucursalId = null) {
    try {
      console.log('🔄 Obteniendo ventas con saldo pendiente...');
      
      const endpoint = sucursalId ? `/saldo-pendiente?sucursal_id=${sucursalId}` : '/saldo-pendiente';
      const ventas = await this.get(endpoint);
      const ventasArray = this.ensureArray(ventas);
      
      // Enriquecer con información de clientes
      const ventasEnriquecidas = await this.enriquecerConClientes(ventasArray);
      
      console.log(`✅ Ventas con saldo pendiente: ${ventasEnriquecidas.length}`);
      return ventasEnriquecidas;
      
    } catch (error) {
      console.error('❌ Error al obtener ventas con saldo pendiente:', error);
      return [];
    }
  }

  /**
   * 🆕 NUEVO: Obtiene estadísticas de una sucursal específica
   * @param {string} sucursalId - ID de la sucursal
   * @returns {Promise<Object>} Estadísticas de la sucursal
   */
  async obtenerEstadisticasDia(sucursalId = null) {
	  try {
		console.log('📊 Obteniendo estadísticas del día...');
		
		// CORRECCIÓN: Usar query parameters
		const params = sucursalId ? { sucursal_id: sucursalId } : {};
		const estadisticas = await this.get('/estadisticas/dia', params);
		const statsObj = this.ensureObject(estadisticas);
		
		if (!statsObj || Object.keys(statsObj).length === 0) {
		  const estadisticasRespaldo = {
			ventasHoy: 0,
			totalVentasHoy: 0,
			gananciasHoy: 0,
			promedioVenta: 0,
			productosVendidos: 0,
			clientesAtendidos: 0,
			ventasPorHora: Array(24).fill(0),
			metodoPagoMasUsado: 'efectivo',
			totalPagadoHoy: 0,
			saldoPendienteTotal: 0,
			ventasConSaldoPendiente: 0
		  };
		  
		  console.log('⚠️ Usando estadísticas de respaldo');
		  return estadisticasRespaldo;
		}
		
		console.log('✅ Estadísticas del día obtenidas:', statsObj);
		return statsObj;
		
	  } catch (error) {
		console.error('❌ Error al obtener estadísticas del día:', error);
		return {
		  ventasHoy: 0,
		  totalVentasHoy: 0,
		  gananciasHoy: 0,
		  promedioVenta: 0,
		  productosVendidos: 0,
		  clientesAtendidos: 0,
		  ventasPorHora: Array(24).fill(0),
		  metodoPagoMasUsado: 'efectivo',
		  totalPagadoHoy: 0,
		  saldoPendienteTotal: 0,
		  ventasConSaldoPendiente: 0
		};
	  }
	}

  // ==================== MÉTODOS EXISTENTES (actualizados para sucursales) ====================

  /**
   * Busca ventas por término
   * @param {string} termino - Término de búsqueda
   * @param {string} sucursalId - ID de la sucursal (opcional)
   * @returns {Promise<Array>} Ventas encontradas
   */
	async buscar(termino, sucursalId = null) {
	  try {
		console.log('🔍 Buscando ventas:', { termino, sucursalId });
		
		// Si no hay término y sí sucursal, obtener todas las ventas de esa sucursal
		if ((!termino || !termino.trim()) && sucursalId) {
		  return await this.obtenerPorSucursal(sucursalId);
		}
		
		// Si no hay término ni sucursal, obtener todas
		if (!termino || !termino.trim()) {
		  return await this.obtenerTodas();
		}
		
		// Construir parámetros de búsqueda
		const params = { termino: termino.trim() };
		if (sucursalId) {
		  params.sucursal_id = sucursalId;
		}
		
		// Llamar a la ruta de búsqueda
		const ventas = await this.get('/buscar', params);
		const ventasArray = this.ensureArray(ventas);
		
		// Enriquecer resultados con clientes
		const ventasEnriquecidas = await this.enriquecerConClientes(ventasArray);
		
		console.log(`✅ Ventas encontradas: ${ventasEnriquecidas.length}`);
		return ventasEnriquecidas;
		
	  } catch (error) {
		console.error('❌ Error al buscar ventas:', error);
		return [];
	  }
	}
	/**
 * Busca una venta específica por número
 * @param {string} numeroVenta - Número de la venta (ej: "1000", "V-001000")
 * @returns {Promise<Object>} Venta encontrada
 */
async buscarPorNumero(numeroVenta) {
  try {
    console.log(`🔍 Buscando venta número: ${numeroVenta}`);
    
    const venta = await this.get(`/buscar-numero/${numeroVenta}`);
    
    if (venta) {
      // Enriquecer con información del cliente
      const ventasEnriquecidas = await this.enriquecerConClientes([venta]);
      return ventasEnriquecidas[0];
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error al buscar venta ${numeroVenta}:`, error);
    return null;
  }
}

/**
 * Obtiene ventas con paginación del servidor
 * @param {Object} opciones - { pagina: 1, limite: 50, sucursal_id: null, orden: 'desc' }
 * @returns {Promise<Object>} { ventas: [], total: 0, paginas: 0 }
 */
	async obtenerPaginadas(opciones = {}) {
	  try {
		const params = {
		  pagina: opciones.pagina || 1,
		  limite: opciones.limite || 50,
		  orden: opciones.orden || 'desc'
		};
		
		if (opciones.sucursal_id) {
		  params.sucursal_id = opciones.sucursal_id;
		}
		
		console.log('📄 Obteniendo ventas paginadas:', params);
		
		const resultado = await this.get('/paginadas', params);
		
		// Enriquecer las ventas con clientes
		if (resultado.ventas && resultado.ventas.length > 0) {
		  resultado.ventas = await this.enriquecerConClientes(resultado.ventas);
		}
		
		return resultado;
	  } catch (error) {
		console.error('❌ Error al obtener ventas paginadas:', error);
		return { ventas: [], total: 0, paginas: 0 };
	  }
	}

  // ==================== MÉTODOS PRIVADOS (sin cambios) ====================

  /**
   * Enriquece un array de ventas con información de clientes
   * @param {Array} ventas - Array de ventas
   * @returns {Promise<Array>} Ventas enriquecidas
   */
  async enriquecerConClientes(ventas) {
    if (!Array.isArray(ventas) || ventas.length === 0) {
      return ventas;
    }

    try {
      // Obtener IDs únicos de clientes
      const clientesIds = [...new Set(
        ventas
          .map(venta => venta.cliente_id)
          .filter(id => id) // Filtrar IDs nulos
      )];

      console.log(`🔄 Cargando datos de ${clientesIds.length} clientes únicos...`);

      // Obtener datos de clientes en paralelo con mejor manejo de errores
      const clientesPromises = clientesIds.map(async (clienteId) => {
        try {
          const cliente = await clientesService.obtenerPorId(clienteId);
          return { id: clienteId, data: cliente, success: true };
        } catch (error) {
          // Log más silencioso para clientes no encontrados
          console.debug(`🔍 Cliente ${clienteId} no encontrado, usando datos por defecto`);
          // Retornar datos por defecto en lugar de null
          return { 
            id: clienteId, 
            data: {
              id: clienteId,
              nombre: 'Cliente',
              apellido: 'No encontrado',
              telefono: '',
              email: '',
              direccion: '',
              dni_cuit: '',
              categoria: 'CONDINEA',
              localidad: '',
              zona: '',
              notas: 'Cliente no encontrado en la base de datos',
              activo: false
            }, 
            success: false 
          };
        }
      });

      const clientesResults = await Promise.all(clientesPromises);
      
      // Crear mapa de clientes para acceso rápido
      const clientesMap = new Map();
      let clientesEncontrados = 0;
      let clientesFaltantes = 0;
      
      clientesResults.forEach(result => {
        clientesMap.set(result.id, result.data);
        if (result.success) {
          clientesEncontrados++;
        } else {
          clientesFaltantes++;
        }
      });

      console.log(`✅ Clientes encontrados: ${clientesEncontrados}/${clientesIds.length}`);
      if (clientesFaltantes > 0) {
        console.warn(`⚠️ Clientes faltantes: ${clientesFaltantes} (se usarán datos por defecto)`);
      }

      // Enriquecer ventas con datos de cliente
      const ventasEnriquecidas = ventas.map(venta => {
        let cliente_info;
        
        if (venta.cliente_id && clientesMap.has(venta.cliente_id)) {
          // Cliente encontrado
          const cliente = clientesMap.get(venta.cliente_id);
          cliente_info = {
            id: cliente.id,
            nombre: cliente.nombre || '',
            apellido: cliente.apellido || '',
            nombre_completo: `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || 'Cliente sin nombre',
            telefono: cliente.telefono || '',
            email: cliente.email || ''
          };
        } else if (venta.cliente_info) {
          // Usar cliente_info existente si ya lo tiene
          cliente_info = venta.cliente_info;
        } else if (venta.cliente_id) {
          // Cliente con ID pero no encontrado
          cliente_info = {
            id: venta.cliente_id,
            nombre: 'Cliente',
            apellido: 'No encontrado',
            nombre_completo: `Cliente No encontrado (ID: ${venta.cliente_id})`,
            telefono: '',
            email: ''
          };
        } else {
          // Sin cliente
          cliente_info = {
            id: null,
            nombre: '',
            apellido: '',
            nombre_completo: 'Cliente General',
            telefono: '',
            email: ''
          };
        }
        
        return {
          ...venta,
          cliente_info
        };
      });

      return ventasEnriquecidas;

    } catch (error) {
      console.error('❌ Error al enriquecer ventas con clientes:', error);
      
      // En caso de error, devolver ventas con cliente_info básico
      return ventas.map(venta => ({
        ...venta,
        cliente_info: {
          id: venta.cliente_id || null,
          nombre: venta.cliente_id ? 'Error' : '',
          apellido: venta.cliente_id ? 'al cargar' : '',
          nombre_completo: venta.cliente_id ? `Error al cargar cliente (ID: ${venta.cliente_id})` : 'Cliente General',
          telefono: '',
          email: ''
        }
      }));
    }
  }

  // ==================== MÉTODOS EXISTENTES (sin cambios significativos) ====================
  
  async obtenerPorId(id) {
    try {
      console.log(`🔄 Obteniendo venta ID: ${id}`);
      const venta = await this.get(`/${id}`);
      
      const ventaObj = this.ensureObject(venta);
      
      if (!ventaObj || Object.keys(ventaObj).length === 0) {
        const ventaRespaldo = VENTAS_RESPALDO.find(v => v.id === id);
        if (ventaRespaldo) {
          console.log('⚠️ Usando venta de respaldo');
          return ventaRespaldo;
        }
        throw new Error(`Venta ${id} no encontrada`);
      }
      
      // Enriquecer venta individual con cliente
      const ventasEnriquecidas = await this.enriquecerConClientes([ventaObj]);
      const ventaEnriquecida = ventasEnriquecidas[0];
      
      console.log(`✅ Venta obtenida y enriquecida:`, ventaEnriquecida);
      return ventaEnriquecida;
      
    } catch (error) {
      console.error(`❌ Error al obtener venta ${id}:`, error);
      throw error;
    }
  }

  async devolverProductos(id, productos, motivo) {
    try {
      console.log(`🔄 Procesando devolución de venta ${id}:`, { productos, motivo });
      
      const resultado = await this.post(`/${id}/devolver-productos`, { 
        productos, 
        motivo 
      });
      
      console.log('✅ Devolución procesada:', resultado);
      return resultado;
      
    } catch (error) {
      console.error(`❌ Error al procesar devolución de venta ${id}:`, error);
      throw error;
    }
  }

  async cambiarEstado(id, estado, motivo = '', conTransporte = false) {
    try {
      console.log(`🔄 NUEVO CÓDIGO - Cambiando estado de venta ${id} a: ${estado}`);
      
      const datos = { 
        estado, 
        motivo,
        fecha_actualizacion: new Date().toISOString()
      };
      if (estado === 'completada' && conTransporte) {
        datos.con_transporte = true;
      }
      
      // Intentar diferentes endpoints para actualizar el estado
      let resultado;
      
      // Opción 1: Endpoint específico para estado (PUT)
      try {
        console.log(`🔄 Intentando PUT /${id}/estado con datos:`, datos);
        resultado = await this.put(`/${id}/estado`, datos);
        
        console.log('✅ Estado actualizado correctamente con PUT:', resultado);
        return resultado;
      } catch (error) {
        console.log('⚠️ PUT /estado falló:', error.message);
      }
      
      // Opción 2: Actualización general de la venta
      try {
        resultado = await this.put(`/${id}`, { estado: datos.estado });
        
        if (resultado && resultado.success) {
          console.log('✅ Estado actualizado con PUT');
          return resultado;
        }
      } catch (error) {
        console.log('⚠️ PUT falló:', error.message);
      }
      
      // Opción 3: POST con datos de actualización
      try {
        resultado = await this.post(`/${id}/actualizar-estado`, datos);
        
        if (resultado && resultado.success) {
          console.log('✅ Estado actualizado con POST');
          return resultado;
        }
      } catch (error) {
        console.log('⚠️ POST falló:', error.message);
      }
      
      // Si todas fallan, devolver el resultado del primer intento
      console.warn('⚠️ Ningún método funcionó');
      return resultado;
      
    } catch (error) {
      console.error(`❌ Error al cambiar estado de venta ${id}:`, error);
      console.error(`📋 Detalles del error:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Elimina una venta completamente (solo para usuarios autorizados)
   * @param {string} id - ID de la venta
   * @param {string} motivo - Motivo de la eliminación
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async eliminarVenta(id, motivo = '') {
    try {
      console.log(`🗑️ Eliminando venta ${id} con motivo: ${motivo}`);
      
      const resultado = await this.delete(`/${id}`, { motivo });
      // Normalizar respuesta
      const status = resultado?.status ?? 200;
      const success = resultado?.data?.success ?? resultado?.success ?? (status < 400);
      if (!success) {
        const msg = resultado?.data?.message || resultado?.message || `Error al eliminar venta (status ${status})`;
        throw new Error(msg);
      }
      console.log('✅ Venta eliminada correctamente:', resultado?.data || resultado);
      return resultado?.data || resultado;
      
    } catch (error) {
      console.error(`❌ Error al eliminar venta ${id}:`, error);
      console.error(`📋 Detalles del error:`, error.response?.data || error.message);
      throw error;
    }
  }

  async obtenerPorCliente(clienteId) {
    try {
      console.log(`🔄 Obteniendo ventas del cliente: ${clienteId}`);
      
      const ventas = await this.get(`/cliente/${clienteId}`);
      const ventasArray = this.ensureArray(ventas);
      
      // Enriquecer con datos de cliente
      const ventasEnriquecidas = await this.enriquecerConClientes(ventasArray);
      
      console.log(`✅ Ventas del cliente: ${ventasEnriquecidas.length}`);
      return ventasEnriquecidas;
      
    } catch (error) {
      console.error(`❌ Error al obtener ventas del cliente ${clienteId}:`, error);
      return [];
    }
  }

  /**
   * Busca ventas por nombre de cliente
   * @param {string} nombreCliente - Nombre del cliente a buscar
   * @returns {Promise<Array>} Array de ventas encontradas
   */
  async buscarPorCliente(nombreCliente) {
    try {
      console.log(`🔍 Buscando ventas por cliente: "${nombreCliente}"`);
      
      const ventas = await this.get(`/buscar-cliente?nombre=${encodeURIComponent(nombreCliente)}`);
      const ventasArray = this.ensureArray(ventas);
      
      // Enriquecer con datos de cliente
      const ventasEnriquecidas = await this.enriquecerConClientes(ventasArray);
      
      console.log(`✅ Ventas encontradas para "${nombreCliente}": ${ventasEnriquecidas.length}`);
      return ventasEnriquecidas;
      
    } catch (error) {
      console.error(`❌ Error al buscar ventas por cliente "${nombreCliente}":`, error);
      return [];
    }
  }
  /**
 * Procesa una devolución parcial de productos
 * @param {string} ventaId - ID de la venta
 * @param {Array} productosDevolver - Array de productos con cantidades a devolver
 * @param {string} motivo - Motivo de la devolución
 * @returns {Promise<Object>} Resultado de la devolución
 */
	async procesarDevolucionParcial(ventaId, productosDevolver, motivo) {
	  try {
		console.log(`🔄 Procesando devolución parcial para venta ${ventaId}:`, { productosDevolver, motivo });
		
		const resultado = await this.post(`/${ventaId}/devolucion-parcial`, {
		  productos: productosDevolver,
		  motivo: motivo || 'Devolución parcial de productos'
		});
		
		console.log('✅ Devolución parcial procesada:', resultado);
		return resultado;
		
	  } catch (error) {
		console.error(`❌ Error al procesar devolución parcial:`, error);
		throw error;
	  }
	}
	/**
   * Actualiza las notas de una venta
   * @param {string} ventaId - ID de la venta
   * @param {string} notas - Notas a guardar
   */
  async actualizarNotas(ventaId, notas) {
    try {
      console.log(`📝 Actualizando notas de venta ${ventaId}`);
      
      const resultado = await this.put(`/${ventaId}/notas`, { notas });
      
      console.log('✅ Notas actualizadas correctamente');
      return resultado;
      
    } catch (error) {
      console.error(`❌ Error al actualizar notas de venta ${ventaId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el historial completo de pagos de una venta
   * @param {string} ventaId - ID de la venta
   * @returns {Promise<Array>} Historial de pagos
   */
  async obtenerHistorialPagos(ventaId) {
    try {
      console.log(`🔄 Obteniendo historial de pagos de venta ${ventaId}`);
      
      const pagos = await this.get(`/${ventaId}/pagos`);
      const pagosArray = this.ensureArray(pagos);
      
      console.log(`✅ Historial de pagos obtenido: ${pagosArray.length} pagos`);
      return pagosArray;
      
    } catch (error) {
      console.error(`❌ Error al obtener historial de pagos:`, error);
      return [];
    }
  }

  /**
   * Obtiene todas las ventas con saldo pendiente (cuentas por cobrar)
   * @param {Object} filtros - Filtros opcionales { cliente_id, sucursal_id, desde, hasta }
   * @returns {Promise<Object>} Resumen de cuentas por cobrar
   */
  async obtenerCuentasPorCobrar(filtros = {}) {
    try {
      console.log('🔄 Obteniendo cuentas por cobrar...');
      
      const params = new URLSearchParams();
      if (filtros.cliente_id) params.append('cliente_id', filtros.cliente_id);
      if (filtros.sucursal_id) params.append('sucursal_id', filtros.sucursal_id);
      if (filtros.desde) params.append('desde', filtros.desde);
      if (filtros.hasta) params.append('hasta', filtros.hasta);
      
      const queryString = params.toString();
      const endpoint = `/cuentas-por-cobrar${queryString ? `?${queryString}` : ''}`;
      
      const resultado = await this.get(endpoint);
      
      console.log('✅ Cuentas por cobrar obtenidas');
      return resultado;
      
    } catch (error) {
      console.error('❌ Error al obtener cuentas por cobrar:', error);
      return {
        ventas: [],
        total_pendiente: 0,
        cantidad_ventas: 0,
        clientes_con_deuda: 0
      };
    }
  }

  /**
   * Envía recordatorio de pago
   * @param {string} ventaId - ID de la venta
   * @param {Object} datos - Datos del recordatorio { medio: 'email'|'sms', mensaje }
   */
  async enviarRecordatorioPago(ventaId, datos) {
    try {
      console.log(`📧 Enviando recordatorio para venta ${ventaId}`);
      
      const resultado = await this.post(`/${ventaId}/recordatorio`, datos);
      
      console.log('✅ Recordatorio enviado correctamente');
      return resultado;
      
    } catch (error) {
      console.error(`❌ Error al enviar recordatorio:`, error);
      throw error;
    }
  }

  /**
   * Calcula intereses por mora
   * @param {string} ventaId - ID de la venta
   * @returns {Promise<Object>} Cálculo de intereses
   */
  async calcularInteresesMora(ventaId) {
    try {
      console.log(`💰 Calculando intereses de mora para venta ${ventaId}`);
      
      const resultado = await this.get(`/${ventaId}/intereses-mora`);
      
      console.log('✅ Intereses calculados:', resultado);
      return resultado;
      
    } catch (error) {
      console.error(`❌ Error al calcular intereses:`, error);
      return {
        dias_mora: 0,
        interes_diario: 0,
        interes_total: 0
      };
    }
  }
  async obtenerResumenPagos(fechaInicio, fechaFin) {
    try {
      console.log(`📊 Obteniendo resumen de pagos del ${fechaInicio} al ${fechaFin}`);
      
      const resumen = await this.get('/pagos/resumen', { 
        fecha_inicio: fechaInicio, 
        fecha_fin: fechaFin 
      });
      
      const resumenObj = this.ensureObject(resumen);
      
      console.log('✅ Resumen de pagos obtenido:', resumenObj);
      return resumenObj;
      
    } catch (error) {
      console.error('❌ Error al obtener resumen de pagos:', error);
      return {
        total_pagos: 0,
        total_monto: 0,
        pagos_por_metodo: {},
        pagos_por_dia: []
      };
    }
  }

  /**
   * 🆕 NUEVO: Actualiza una venta existente con validación de stock
   * @param {string} ventaId - ID de la venta a actualizar
   * @param {Object} ventaActualizada - Datos actualizados de la venta
   * @returns {Promise<Object>} Venta actualizada
   */
  async actualizarVenta(ventaId, ventaActualizada) {
    try {
      console.log('🔄 Actualizando venta:', ventaId, ventaActualizada);
      
      // Obtener la venta original para validar estado. El ajuste de stock se hace
      // en el backend dentro de la misma transacción que actualiza la venta.
      const ventaOriginal = await this.obtenerPorId(ventaId);
      if (!ventaOriginal) {
        throw new Error('Venta no encontrada');
      }
      
      if (ventaOriginal.estado === 'cancelada' || ventaOriginal.estado === 'entregada') {
        throw new Error('No se puede editar una venta cancelada o entregada');
      }
      
      const response = await this.put(`/${ventaId}`, ventaActualizada);
      
      console.log('✅ Venta actualizada correctamente:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Error al actualizar venta:', error);
      throw error;
    }
  }

  /**
   * 🆕 CORREGIDO: Calcula los cambios en stock entre la venta original y la actualizada
   * @param {Array} detallesOriginales - Detalles originales de la venta
   * @param {Array} detallesActualizados - Detalles actualizados de la venta
   * @returns {Array} Cambios en stock a aplicar
   */
  calcularCambiosStock(detallesOriginales, detallesActualizados) {
    const cambios = [];
    
    // Crear mapas para facilitar la comparación
    const originalesMap = new Map(detallesOriginales.map(d => [d.producto_id, d]));
    const actualizadosMap = new Map(detallesActualizados.map(d => [d.producto_id, d]));
    
    // Procesar productos modificados o eliminados
    for (const [productoId, detalleOriginal] of originalesMap) {
      const detalleActualizado = actualizadosMap.get(productoId);
      
      if (!detalleActualizado) {
        // Producto eliminado - devolver stock
        cambios.push({
          producto_id: productoId,
          sucursal_id: detalleOriginal.sucursal_id,
          cantidad_cambio: detalleOriginal.cantidad, // Stock a devolver
          tipo_cambio: 'devolucion'
        });
      } else if (detalleActualizado.cantidad !== detalleOriginal.cantidad) {
        // Cantidad modificada - solo procesar si hay diferencia real
        const diferencia = detalleActualizado.cantidad - detalleOriginal.cantidad;
        if (diferencia !== 0) {
          cambios.push({
            producto_id: productoId,
            sucursal_id: detalleOriginal.sucursal_id,
            cantidad_cambio: Math.abs(diferencia),
            tipo_cambio: diferencia > 0 ? 'reduccion' : 'devolucion'
          });
        }
      }
    }
    
    // Procesar productos nuevos
    for (const [productoId, detalleActualizado] of actualizadosMap) {
      if (!originalesMap.has(productoId)) {
        // Producto nuevo - reducir stock
        cambios.push({
          producto_id: productoId,
          sucursal_id: detalleActualizado.sucursal_id,
          cantidad_cambio: detalleActualizado.cantidad,
          tipo_cambio: 'reduccion'
        });
      }
    }
    
    console.log('📊 Cambios en stock calculados:', cambios);
    return cambios;
  }

  /**
   * 🆕 CORREGIDO: Valida que haya stock suficiente para los cambios
   * @param {Array} cambiosStock - Cambios en stock a aplicar
   * @param {string} sucursalId - ID de la sucursal
   * @param {Object} ventaOriginal - Venta original para validación contextual
   */
  async validarStockDisponible(cambiosStock, sucursalId, ventaOriginal = null) {
    console.log('🔍 Validando stock para cambios:', cambiosStock);
    
    for (const cambio of cambiosStock) {
      if (cambio.tipo_cambio === 'reduccion') {
        // Verificar stock disponible para reducir
        const stockDisponible = await this.obtenerStockProducto(cambio.producto_id, sucursalId);
        
        // 🆕 CORREGIDO: Si es una edición de venta, considerar el stock ya "reservado" en la venta original
        let stockRealmenteDisponible = stockDisponible;
        if (ventaOriginal && ventaOriginal.detalles) {
          const productoEnVentaOriginal = ventaOriginal.detalles.find(d => d.producto_id === cambio.producto_id);
          if (productoEnVentaOriginal) {
            // El producto ya está en la venta, sumar su cantidad al stock disponible
            stockRealmenteDisponible += productoEnVentaOriginal.cantidad;
            console.log(`📦 Producto ${cambio.producto_id} ya en venta. Stock base: ${stockDisponible}, + en venta: ${productoEnVentaOriginal.cantidad}, Total disponible: ${stockRealmenteDisponible}`);
          }
        }
        
        if (stockRealmenteDisponible < cambio.cantidad_cambio) {
          throw new Error(`Stock insuficiente para el producto ${cambio.producto_id}. Disponible: ${stockRealmenteDisponible}, Requerido: ${cambio.cantidad_cambio}`);
        }
        
        console.log(`✅ Stock válido para producto ${cambio.producto_id}: ${stockRealmenteDisponible} >= ${cambio.cantidad_cambio}`);
      }
    }
  }

  /**
   * 🆕 NUEVO: Obtiene el stock actual de un producto en una sucursal
   * @param {string} productoId - ID del producto
   * @param {string} sucursalId - ID de la sucursal
   * @returns {number} Stock disponible
   */
  async obtenerStockProducto(productoId, sucursalId) {
    try {
      const response = await this.get(`/productos/${productoId}/stock/${sucursalId}`);
      return response?.stock_actual || 0;
    } catch (error) {
      console.error('Error al obtener stock del producto:', error);
      return 0;
    }
  }

  /**
   * 🆕 NUEVO: Actualiza el stock de los productos según los cambios
   * @param {Array} cambiosStock - Cambios en stock a aplicar
   * @param {string} sucursalId - ID de la sucursal
   */
  async actualizarStockProductos(cambiosStock, sucursalId) {
    for (const cambio of cambiosStock) {
      try {
        const stockActual = await this.obtenerStockProducto(cambio.producto_id, sucursalId);
        let nuevoStock = stockActual;
        
        if (cambio.tipo_cambio === 'devolucion') {
          // Devolver stock al inventario
          nuevoStock = stockActual + cambio.cantidad_cambio;
        } else if (cambio.tipo_cambio === 'reduccion') {
          // Reducir stock del inventario
          nuevoStock = stockActual - cambio.cantidad_cambio;
        }
        
        // Actualizar stock en la base de datos
        await this.put(`/productos/${cambio.producto_id}/stock/${sucursalId}`, {
          stock_actual: nuevoStock,
          ultima_actualizacion: new Date().toISOString()
        });
        
        console.log(`✅ Stock actualizado para producto ${cambio.producto_id}: ${stockActual} → ${nuevoStock}`);
        
      } catch (error) {
        console.error(`❌ Error al actualizar stock del producto ${cambio.producto_id}:`, error);
        throw new Error(`Error al actualizar stock del producto ${cambio.producto_id}`);
      }
    }
  }

  /**
   * 🆕 NUEVO: Registra el historial de cambios en la venta
   * @param {string} ventaId - ID de la venta
   * @param {Object} ventaOriginal - Venta original
   * @param {Object} ventaActualizada - Venta actualizada
   */
  async registrarHistorialCambios(ventaId, ventaOriginal, ventaActualizada) {
    try {
      const cambio = {
        fecha: new Date().toISOString(),
        usuario_id: this.getCurrentUserId(),
        tipo: 'edicion',
        cambios: {
          total_anterior: ventaOriginal.total,
          total_nuevo: ventaActualizada.total,
          productos_anterior: ventaOriginal.detalles.length,
          productos_nuevo: ventaActualizada.detalles.length,
          detalles_cambios: this.calcularCambiosStock(ventaOriginal.detalles, ventaActualizada.detalles)
        }
      };
      
      // Agregar el cambio al historial de la venta
      await this.put(`/${ventaId}/historial`, cambio);
      
      console.log('✅ Historial de cambios registrado');
      
    } catch (error) {
      console.error('❌ Error al registrar historial de cambios:', error);
      // No lanzar error para no interrumpir la actualización principal
    }
  }

  /**
   * Obtiene las ventas eliminadas
   * @returns {Promise<Array>} Lista de ventas eliminadas
   */
  async obtenerVentasEliminadas() {
    try {
      console.log('🗑️ Obteniendo ventas eliminadas...');
      
      const ventasEliminadas = await this.get('/eliminadas');
      console.log('📥 Respuesta del servidor:', ventasEliminadas);
      
      const ventasArray = this.ensureArray(ventasEliminadas);
      console.log('📊 Array procesado:', ventasArray);
      
      console.log(`✅ Ventas eliminadas obtenidas: ${ventasArray.length}`);
      return ventasArray;
      
    } catch (error) {
      console.error('❌ Error al obtener ventas eliminadas:', error);
      return [];
    }
  }

  /**
   * 🆕 NUEVO: Limpia ventas que tienen clientes eliminados
   * @param {Array} ventas - Lista de ventas a limpiar
   * @returns {Array} Ventas limpias
   */
  async limpiarVentasConClientesEliminados(ventas) {
    try {
      console.log('🧹 Limpiando ventas con clientes eliminados...');
      
      const ventasLimpias = [];
      let ventasConClientesEliminados = 0;
      
      for (const venta of ventas) {
        if (venta.cliente_id) {
          try {
            // Intentar obtener el cliente
            await clientesService.obtenerPorId(venta.cliente_id);
            ventasLimpias.push(venta);
          } catch (error) {
            // Si el cliente no existe, marcar la venta como sin cliente
            console.warn(`⚠️ Venta ${venta.id} tiene cliente eliminado: ${venta.cliente_id}`);
            ventasConClientesEliminados++;
            
            // Crear nueva venta sin cliente_id
            const ventaLimpia = {
              ...venta,
              cliente_id: null,
              cliente_info: {
                id: null,
                nombre: '',
                apellido: '',
                nombre_completo: 'Cliente General',
                telefono: '',
                email: ''
              }
            };
            ventasLimpias.push(ventaLimpia);
          }
        } else {
          ventasLimpias.push(venta);
        }
      }
      
      if (ventasConClientesEliminados > 0) {
        console.log(`✅ Limpieza completada: ${ventasConClientesEliminados} ventas con clientes eliminados`);
      }
      
      return ventasLimpias;
      
    } catch (error) {
      console.error('❌ Error al limpiar ventas:', error);
      return ventas; // Devolver ventas originales en caso de error
    }
  }
}

const ventasService = new VentasServiceOptimizado();

export default ventasService;