// src/services/reportes.service.js - VERSIÓN CORREGIDA
import FirebaseService from './firebase.service';

/**
 * Servicio para reportes financieros - VERSIÓN CORREGIDA
 * ✅ RUTAS DEL DASHBOARD ARREGLADAS
 * 
 * Proporciona métodos para obtener reportes de ventas, compras y ganancias.
 * 
 * @module services/reportes.service
 */
class ReportesService extends FirebaseService {
  /**
   * Constructor
   */
  constructor() {
    super('/reportes');
  }
  
  /**
   * ✅ CORREGIDO: Obtiene datos para el dashboard
   * @param {string} sucursal_id - ID de sucursal (opcional)
   * @returns {Promise<Object>} Datos para el dashboard
   */
  async obtenerDatosDashboard(sucursal_id = null) {
    try {
      const params = {};
      if (sucursal_id) {
        params.sucursal_id = sucursal_id;
      }
      
      console.log('📊 [REPORTES SERVICE] Obteniendo dashboard con params:', params);
      
      // ✅ CORRECCIÓN: Usar ruta correcta que coincide con dashboard.routes.js
      const response = await this.get('/dashboard', params);
      
      // ✅ CORRECCIÓN: Manejar tanto respuesta directa como wrapper
      let dashboardData;
      if (response && response.data) {
        dashboardData = response.data;
      } else if (response && typeof response === 'object') {
        dashboardData = response;
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
      
      console.log('✅ [REPORTES SERVICE] Dashboard data recibido:', dashboardData);
      
      // ✅ CORRECCIÓN: Estructura de respuesta consistente
      return {
        ventasHoy: parseFloat(dashboardData.totalVentasHoy || dashboardData.ventasHoy || 0),
        cantidadVentasHoy: parseInt(dashboardData.ventasHoy || dashboardData.cantidadVentasHoy || 0),
        gananciasHoy: parseFloat(dashboardData.gananciasHoy || 0),
        productosDestacados: Array.isArray(dashboardData.productosDestacados) 
          ? dashboardData.productosDestacados 
          : [],
        clientesDestacados: Array.isArray(dashboardData.clientesDestacados) 
          ? dashboardData.clientesDestacados 
          : [],
        // Campos adicionales para compatibilidad
        totalProductos: parseInt(dashboardData.totalProductos || 0),
        stockBajo: parseInt(dashboardData.productosStockBajo || dashboardData.stockBajo || 0),
        totalClientes: parseInt(dashboardData.totalClientes || 0),
        ticketPromedio: parseFloat(dashboardData.ticketPromedio || 0)
      };
      
    } catch (error) {
      console.error('❌ [REPORTES SERVICE] Error en dashboard:', error);
      
      // ✅ RESPUESTA DE RESPALDO: Evitar que el dashboard se rompa
      console.log('🔄 [REPORTES SERVICE] Usando datos de respaldo para dashboard');
      return {
        ventasHoy: 0,
        cantidadVentasHoy: 0,
        gananciasHoy: 0,
        productosDestacados: [],
        clientesDestacados: [],
        totalProductos: 0,
        stockBajo: 0,
        totalClientes: 0,
        ticketPromedio: 0
      };
    }
  }
  
  /**
   * ✅ CORREGIDO: Obtiene reporte de ventas en un período
   * @param {Object} params - Parámetros de la consulta
   * @param {string} params.fechaInicio - Fecha inicio (YYYY-MM-DD)
   * @param {string} params.fechaFin - Fecha fin (YYYY-MM-DD)
   * @param {string} params.sucursal_id - ID sucursal (opcional)
   * @param {string} params.agrupacion - Tipo agrupación (opcional)
   * @returns {Promise<Object>} Reporte de ventas
   */
  async obtenerReporteVentas(params) {
    try {
      // ✅ CORRECCIÓN: Validar parámetros requeridos
      if (!params.fechaInicio || !params.fechaFin) {
        throw new Error('fechaInicio y fechaFin son requeridos');
      }
      
      // ✅ CORRECCIÓN: Asegurar formato correcto de fechas
      const parametrosLimpios = {
        fechaInicio: this.formatearFecha(params.fechaInicio),
        fechaFin: this.formatearFecha(params.fechaFin)
      };
      
      // Agregar parámetros opcionales si existen
      if (params.sucursal_id) {
        parametrosLimpios.sucursal_id = params.sucursal_id;
      }
      
      if (params.agrupacion) {
        parametrosLimpios.agrupacion = params.agrupacion;
      }
      
      console.log('📊 [REPORTES SERVICE] Obteniendo reporte ventas con params:', parametrosLimpios);
      
      const response = await this.get('/ventas', parametrosLimpios);
      return this.handleFirebaseResponse(response);
    } catch (error) {
      console.error('❌ [REPORTES SERVICE] Error en reporte ventas:', error);
      throw error;
    }
  }
  
  /**
   * ✅ CORREGIDO: Obtiene reporte de compras en un período
   * @param {string} fechaInicio - Fecha de inicio (YYYY-MM-DD)
   * @param {string} fechaFin - Fecha de fin (YYYY-MM-DD)
   * @param {string} sucursal_id - ID sucursal (opcional)
   * @returns {Promise<Object>} Reporte de compras
   */
  async obtenerReporteCompras(fechaInicio, fechaFin, sucursal_id = null) {
    try {
      const params = {
        fechaInicio: this.formatearFecha(fechaInicio),
        fechaFin: this.formatearFecha(fechaFin)
      };
      
      if (sucursal_id) {
        params.sucursal_id = sucursal_id;
      }
      
      console.log('📊 [REPORTES SERVICE] Obteniendo reporte compras con params:', params);
      
      const response = await this.get('/compras', params);
      return this.handleFirebaseResponse(response);
    } catch (error) {
      console.error('❌ [REPORTES SERVICE] Error en reporte compras:', error);
      throw error;
    }
  }
  
  /**
   * ✅ CORREGIDO: Obtiene reporte de ganancias en un período
   * @param {string} fechaInicio - Fecha de inicio (YYYY-MM-DD)
   * @param {string} fechaFin - Fecha de fin (YYYY-MM-DD)
   * @param {string} agrupacion - Tipo de agrupación (dia, semana, mes)
   * @param {string} sucursal_id - ID sucursal (opcional)
   * @returns {Promise<Object>} Reporte de ganancias
   */
  async obtenerReporteGanancias(fechaInicio, fechaFin, agrupacion = 'dia', sucursal_id = null) {
    try {
      const params = {
        fechaInicio: this.formatearFecha(fechaInicio),
        fechaFin: this.formatearFecha(fechaFin),
        agrupacion
      };
      
      if (sucursal_id) {
        params.sucursal_id = sucursal_id;
      }
      
      console.log('📊 [REPORTES SERVICE] Obteniendo reporte ganancias con params:', params);
      
      const response = await this.get('/ganancias', params);
      return this.handleFirebaseResponse(response);
    } catch (error) {
      console.error('❌ [REPORTES SERVICE] Error en reporte ganancias:', error);
      throw error;
    }
  }

  /**
   * ✅ CORREGIDO: Obtiene resumen general de compras
   */
  async obtenerResumenCompras(filtros) {
    try {
      console.log('📊 [REPORTES SERVICE] Obteniendo resumen de compras:', filtros);
      
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.proveedor_id) params.append('proveedor_id', filtros.proveedor_id);
      if (filtros.estado) params.append('estado', filtros.estado);
      
      const resumen = await this.get(`/compras/resumen?${params.toString()}`);
      
      // ✅ CORRECCIÓN: Asegurar que devolvemos un objeto válido
      return this.ensureObject(resumen);
      
    } catch (error) {
      console.error('❌ [REPORTES SERVICE] Error al obtener resumen de compras:', error);
      // Devolver estructura vacía en caso de error
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
   * ✅ CORREGIDO: Obtiene compras agrupadas por día
   */
  async obtenerComprasPorDia(filtros) {
    try {
      console.log('📊 [REPORTES SERVICE] Obteniendo compras por día:', filtros);
      
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.proveedor_id) params.append('proveedor_id', filtros.proveedor_id);
      if (filtros.estado) params.append('estado', filtros.estado);
      
      const compras = await this.get(`/compras/por-dia?${params.toString()}`);
      
      // ✅ CORRECCIÓN: Asegurar que devolvemos un array
      return this.ensureArray(compras);
      
    } catch (error) {
      console.error('❌ [REPORTES SERVICE] Error al obtener compras por día:', error);
      return [];
    }
  }

  /**
   * ✅ CORREGIDO: Obtiene compras agrupadas por proveedor
   */
  async obtenerComprasPorProveedor(filtros) {
    try {
      console.log('📊 [REPORTES SERVICE] Obteniendo compras por proveedor:', filtros);
      
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      
      const compras = await this.get(`/compras/por-proveedor?${params.toString()}`);
      
      // ✅ CORRECCIÓN: Asegurar que devolvemos un array
      return this.ensureArray(compras);
      
    } catch (error) {
      console.error('❌ [REPORTES SERVICE] Error al obtener compras por proveedor:', error);
      return [];
    }
  }

  /**
   * ✅ CORREGIDO: Obtiene productos más comprados
   */
  async obtenerProductosMasComprados(filtros) {
    try {
      console.log('📊 [REPORTES SERVICE] Obteniendo productos más comprados:', filtros);
      
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      
      const productos = await this.get(`/compras/productos-mas-comprados?${params.toString()}`);
      
      // ✅ CORRECCIÓN: Asegurar que devolvemos un array
      return this.ensureArray(productos);
      
    } catch (error) {
      console.error('❌ [REPORTES SERVICE] Error al obtener productos más comprados:', error);
      return [];
    }
  }
  
  // ✅ MÉTODOS AUXILIARES CORREGIDOS
  
  /**
   * ✅ CORRECCIÓN: Formatea una fecha al formato YYYY-MM-DD
   * @param {string|Date} fecha - Fecha a formatear
   * @returns {string} Fecha formateada
   */
  formatearFecha(fecha) {
    if (!fecha) return '';
    
    if (fecha instanceof Date) {
      return fecha.toISOString().split('T')[0];
    }
    
    if (typeof fecha === 'string') {
      // Si ya está en formato correcto, devolverla
      if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
      }
      
      // Intentar parsear y formatear
      const fechaParsed = new Date(fecha);
      if (!isNaN(fechaParsed.getTime())) {
        return fechaParsed.toISOString().split('T')[0];
      }
    }
    
    console.warn('⚠️ [REPORTES SERVICE] Fecha en formato no reconocido:', fecha);
    return fecha;
  }
  
  /**
   * ✅ NUEVO: Manejo de respuesta mejorado para compatibilidad
   * @param {*} response - Respuesta del servidor
   * @returns {*} Datos procesados
   */
  handleFirebaseResponse(response) {
    // Si FirebaseService ya procesó la respuesta, devolverla
    if (response && typeof response === 'object') {
      return response;
    }
    
    // Si no, intentar procesar manualmente
    try {
      return JSON.parse(response);
    } catch (error) {
      console.warn('⚠️ [REPORTES SERVICE] No se pudo parsear respuesta:', response);
      return response;
    }
  }
  
  /**
   * ✅ NUEVO: Genera CSV para descarga de reporte de ventas
   * @param {Object} reporte - Datos del reporte
   * @param {Object} params - Parámetros del reporte
   */
  generarCSVVentas(reporte, params) {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Encabezados
      csvContent += 'Fecha,Ventas,Cantidad,Ganancia\n';
      
      // Datos por período
      if (reporte.ventasPorPeriodo) {
        reporte.ventasPorPeriodo.forEach(periodo => {
          csvContent += `${periodo.fecha},${periodo.total},${periodo.cantidad},${periodo.ganancia}\n`;
        });
      }
      
      // Iniciar descarga
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `reporte_ventas_${params.fechaInicio}_${params.fechaFin}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ [REPORTES SERVICE] CSV generado exitosamente');
      
    } catch (error) {
      console.error('❌ [REPORTES SERVICE] Error generando CSV:', error);
      throw error;
    }
  }
  
  /**
   * ✅ NUEVO: Valida respuesta del servidor y muestra errores útiles
   * @param {Object} response - Respuesta del servidor
   * @returns {Object} Datos validados
   */
  validarRespuesta(response) {
    if (!response) {
      throw new Error('Respuesta vacía del servidor');
    }
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    if (response.success === false) {
      throw new Error(response.message || 'Error del servidor');
    }
    
    return response.data || response;
  }
}

export default new ReportesService();