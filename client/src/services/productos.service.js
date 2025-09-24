// src/services/productos.service.js - VERSIÓN CORREGIDA COMPLETA CON MÉTODOS FALTANTES
import FirebaseService from './firebase.service';
import ApiService from './api.service';
import { useAuth } from '../contexts/AuthContext';

// Datos de respaldo para productos (por si Firebase falla)
const PRODUCTOS_RESPALDO = [
  {
    id: '1',
    codigo: 'PROD001',
    nombre: 'Producto General',
    descripcion: 'Producto de ejemplo',
    precio_costo: 10.00,
    precio_venta: 15.00,
    stock_actual: 0,
    stock_minimo: 5,
    categoria_id: '1',
    proveedor_id: '1',
    activo: true,
    fechaCreacion: new Date().toISOString()
  }
];

/**
 * Servicio para gestión de productos con Firebase
 * ✅ VERSIÓN CORREGIDA - Incluye métodos faltantes para stock por sucursal
 * Mantiene EXACTAMENTE la misma interfaz que el servicio original
 */
class ProductosService extends FirebaseService {
  constructor() {
    super('/productos'); // Módulo en Firebase Functions
    this.api = new ApiService('/productos');
  }

  getOrgQuery(params = {}) {
    // Obtener orgId del localStorage o del contexto global si está disponible
    const orgId = localStorage.getItem('orgId') || window?.authContext?.orgId || null;
    return orgId ? { ...params, orgId } : params;
  }

  async obtenerTodos() {
    try {
      console.log('🔄 [PRODUCTOS SERVICE] Obteniendo todos los productos...');
      const productos = await this.api.get('', this.getOrgQuery());
      console.log('🔄 [PRODUCTOS SERVICE] Respuesta de API:', productos);
      
      const productosArray = this.ensureArray(productos.data);
      console.log('🔄 [PRODUCTOS SERVICE] Productos procesados:', productosArray.length);
      
      if (productosArray.length === 0) {
        console.log('⚠️ [PRODUCTOS SERVICE] No hay productos, usando datos de respaldo');
        return PRODUCTOS_RESPALDO;
      }
      
      console.log('✅ [PRODUCTOS SERVICE] Productos obtenidos correctamente:', productosArray.length);
      return productosArray;
    } catch (error) {
      console.error('❌ [PRODUCTOS SERVICE] Error al obtener productos:', error);
      return PRODUCTOS_RESPALDO;
    }
  }

  async obtenerTodas() { return this.obtenerTodos(); }

  async obtenerActivos() {
    try {
      const res = await this.api.get('/activos');
      const productosArray = this.ensureArray(res.data);
      if (productosArray.length === 0) return PRODUCTOS_RESPALDO.filter(p => p.activo);
      return productosArray;
    } catch (error) {
      console.error('❌ Error al obtener productos activos:', error);
      return PRODUCTOS_RESPALDO.filter(p => p.activo);
    }
  }

  async obtenerPorId(id) {
    try {
      const res = await this.api.get(`/${id}`);
      const productoObj = this.ensureObject(res.data);
      if (!productoObj || Object.keys(productoObj).length === 0) {
        const productoRespaldo = PRODUCTOS_RESPALDO.find(p => p.id === id);
        if (productoRespaldo) return productoRespaldo;
        throw new Error(`Producto ${id} no encontrado`);
      }
      return productoObj;
    } catch (error) {
      console.error(`❌ Error al obtener producto ${id}:`, error);
      const productoRespaldo = PRODUCTOS_RESPALDO.find(p => p.id === id);
      if (productoRespaldo) return productoRespaldo;
      throw error;
    }
  }

  async buscarConStockPorSucursal(termino, sucursalId) {
    try {
      if (!sucursalId) throw new Error('ID de sucursal es requerido');
      let url = `/buscar-con-stock/${sucursalId}`;
      if (termino && termino.trim()) url += `?termino=${encodeURIComponent(termino.trim())}`;
      const response = await this.api.get(url);
      const raw = response?.data ?? response;
      const productosArray = this.ensureArray(raw);
      if (productosArray.length === 0 && termino) return await this.buscarConStockFallback(termino, sucursalId);
      return productosArray.map(p => ({
        ...p,
        stock_sucursal: parseFloat(p?.stock_sucursal ?? p?.cantidad ?? p?.stock ?? p?.stock_actual ?? 0) || 0,
        stock_actual: parseFloat(p?.stock_sucursal ?? p?.cantidad ?? p?.stock ?? p?.stock_actual ?? 0) || 0,
        stock_minimo: parseFloat(p?.stock_minimo ?? 5) || 5,
        sucursal_id: p?.sucursal_id ?? sucursalId
      }));
    } catch (error) {
      console.error('❌ [PRODUCTOS SERVICE] Error al buscar productos con stock por sucursal:', error);
      return await this.buscarConStockFallback(termino, sucursalId);
    }
  }

  async buscarConStockFallback(termino, sucursalId) {
    try {
      const productos = await this.buscar(termino);
      if (productos.length === 0) return [];
      const productosConStock = await Promise.all(
        productos.map(async (producto) => {
          try {
            const stockSucursal = await this.consultarStockEnSucursal(producto.id, sucursalId);
            return {
              ...producto,
              stock_actual: stockSucursal.cantidad || 0,
              stock_sucursal: stockSucursal.cantidad || 0,
              stock_minimo: stockSucursal.stock_minimo || producto.stock_minimo || 5,
              sucursal_id: sucursalId
            };
          } catch (error) {
            return { ...producto, stock_actual: parseInt(producto.stock_actual || 0), stock_sucursal: parseInt(producto.stock_actual || 0), sucursal_id: sucursalId };
          }
        })
      );
      return productosConStock;
    } catch (error) {
      console.error('❌ [PRODUCTOS SERVICE] Error en fallback:', error);
      return [];
    }
  }

  async consultarStockEnSucursal(productoId, sucursalId) {
    try {
      const stockService = new FirebaseService('/stock-sucursal');
      const stock = await stockService.get(`/producto/${productoId}/sucursal/${sucursalId}`);
      const stockData = this.ensureObject(stock);
      const cantidad = parseFloat(stockData.cantidad ?? stockData.stock ?? stockData.stock_actual ?? 0) || 0;
      const stockMin = parseFloat(stockData.stock_minimo ?? 5) || 5;
      return { stock: cantidad, cantidad: cantidad, stock_minimo: stockMin };
    } catch (error) {
      return { stock: 0, cantidad: 0, stock_minimo: 5 };
    }
  }

  async obtenerPorCodigoConStock(codigo, sucursalId) {
    try {
      if (!codigo || !sucursalId) throw new Error('Código de producto y ID de sucursal son requeridos');
      try {
        const url = `/codigo/${encodeURIComponent(codigo)}/sucursal/${sucursalId}`;
        const response = await this.api.get(url);
        return response.data || response;
      } catch (endpointError) {
        const producto = await this.obtenerPorCodigo(codigo);
        if (!producto) return null;
        const stockSucursal = await this.consultarStockEnSucursal(producto.id, sucursalId);
        return { ...producto, stock_actual: stockSucursal.cantidad || 0, stock_sucursal: stockSucursal.cantidad || 0, stock_minimo: stockSucursal.stock_minimo || producto.stock_minimo || 5, sucursal_id: sucursalId };
      }
    } catch (error) {
      console.error('❌ [PRODUCTOS SERVICE] Error al buscar producto por código con stock:', error);
      return null;
    }
  }

  async buscar(termino, sucursalId = null) {
    try {
      const params = this.getOrgQuery({ search: termino, limit: 20, ...(sucursalId && { sucursal_id: sucursalId }) });
      const productos = await this.api.get('', params);
      const productosArray = this.ensureArray(productos.data);
      return productosArray;
    } catch (error) {
      console.error('❌ Error al buscar productos:', error);
      return [];
    }
  }

  async obtenerPorCodigo(codigo) {
    try {
      const productos = await this.buscar(codigo);
      if (productos && productos.length > 0) {
        const productoExacto = productos.find(p => p.codigo === codigo || p.codigo_barras === codigo || p.codigo?.toString() === codigo?.toString());
        if (productoExacto) return productoExacto;
        return productos[0];
      }
      return null;
    } catch (error) {
      console.error(`❌ Error al buscar por código ${codigo}:`, error);
      return null;
    }
  }

  async crear(producto) {
    try {
      const productoFormateado = {
        ...producto,
        codigo: producto.codigo?.trim() || '',
        nombre: producto.nombre?.trim() || '',
        descripcion: producto.descripcion?.trim() || '',
        precio_costo: parseFloat(producto.precio_costo || 0),
        precio_venta: parseFloat(producto.precio_venta || 0),
        stock_actual: parseInt(producto.stock_actual || producto.stock_inicial || 0),
        stock_minimo: parseInt(producto.stock_minimo || 5),
        categoria_id: producto.categoria_id || '',
        proveedor_id: producto.proveedor_id || '',
        activo: producto.activo !== false
      };
      const resultado = await this.api.post('', this.getOrgQuery(productoFormateado));
      return resultado.data ?? resultado;
    } catch (error) {
      console.error('❌ Error al crear producto:', error);
      throw error;
    }
  }

  async actualizar(id, producto) {
    try {
      const productoFormateado = { ...producto };
      if (producto.precio_costo !== undefined) productoFormateado.precio_costo = parseFloat(producto.precio_costo || 0);
      if (producto.precio_venta !== undefined) productoFormateado.precio_venta = parseFloat(producto.precio_venta || 0);
      if (producto.stock_actual !== undefined) productoFormateado.stock_actual = parseInt(producto.stock_actual || 0);
      if (producto.stock_minimo !== undefined) productoFormateado.stock_minimo = parseInt(producto.stock_minimo || 5);
      const resultado = await this.api.post(`/update/${id}`, this.getOrgQuery(productoFormateado));
      return resultado.data ?? resultado;
    } catch (error) {
      console.error(`❌ Error al actualizar producto ${id}:`, error);
      throw error;
    }
  }

  async eliminar(id) {
    try {
      const resultado = await this.api.post(`/delete/${id}`, this.getOrgQuery());
      return resultado.data ?? resultado;
    } catch (error) {
      console.error(`❌ Error al eliminar producto ${id}:`, error);
      throw error;
    }
  }

  async obtenerStockBajo() {
    try {
      const res = await this.api.get('/stock-bajo');
      const productosArray = this.ensureArray(res.data);
      if (productosArray.length === 0) return PRODUCTOS_RESPALDO.filter(p => p.stock_actual <= (p.stock_minimo || 5));
      return productosArray;
    } catch (error) {
      console.error('❌ Error al obtener stock bajo:', error);
      return PRODUCTOS_RESPALDO.filter(p => p.stock_actual <= (p.stock_minimo || 5));
    }
  }

  async obtenerPorCategoria(categoriaId) {
    try {
      const res = await this.api.get('/categoria', this.getOrgQuery({ categoriaId }));
      const productosArray = this.ensureArray(res.data);
      if (productosArray.length === 0) return PRODUCTOS_RESPALDO.filter(p => p.categoria_id === categoriaId);
      return productosArray;
    } catch (error) {
      console.error(`❌ Error al obtener productos de categoría ${categoriaId}:`, error);
      return PRODUCTOS_RESPALDO.filter(p => p.categoria_id === categoriaId);
    }
  }

  async ajustarStock(id, cantidad, motivo = 'Ajuste manual') {
    try {
      const ajuste = { cantidad: parseInt(cantidad), motivo: motivo.trim() };
      const resultado = await this.api.post(`/${id}/stock`, this.getOrgQuery(ajuste));
      return resultado.data ?? resultado;
    } catch (error) {
      console.error(`❌ Error al ajustar stock del producto ${id}:`, error);
      throw error;
    }
  }

  async obtenerHistorialMovimientos(id) {
    try {
      const res = await this.api.get(`/${id}/movimientos`, this.getOrgQuery());
      return this.ensureArray(res.data);
    } catch (error) {
      console.error(`❌ Error al obtener historial del producto ${id}:`, error);
      return [];
    }
  }

  async obtenerEstadisticas() {
    try {
      const res = await this.api.get('/estadisticas', this.getOrgQuery());
      const statsObj = this.ensureObject(res.data);
      if (!statsObj || Object.keys(statsObj).length === 0) {
        return {
          total: PRODUCTOS_RESPALDO.length,
          activos: PRODUCTOS_RESPALDO.filter(p => p.activo).length,
          stockBajo: PRODUCTOS_RESPALDO.filter(p => p.stock_actual <= (p.stock_minimo || 5)).length,
          sinStock: PRODUCTOS_RESPALDO.filter(p => p.stock_actual === 0).length
        };
      }
      return statsObj;
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      return { total: 0, activos: 0, stockBajo: 0, sinStock: 0 };
    }
  }

  async buscarConFiltros(filtros = {}) {
    try {
      const res = await this.api.get('/filtros', this.getOrgQuery(filtros));
      return this.ensureArray(res.data);
    } catch (error) {
      console.error('❌ Error en búsqueda con filtros:', error);
      let resultado = [...PRODUCTOS_RESPALDO];
      if (filtros.categoria) resultado = resultado.filter(p => p.categoria_id === filtros.categoria);
      if (filtros.proveedor) resultado = resultado.filter(p => p.proveedor_id === filtros.proveedor);
      if (filtros.activo !== undefined) resultado = resultado.filter(p => p.activo === filtros.activo);
      return resultado;
    }
  }

  async verificarDisponibilidad(id, cantidad) {
    try {
      const producto = await this.obtenerPorId(id);
      if (!producto) return { disponible: false, mensaje: 'Producto no encontrado', stockActual: 0 };
      const stockActual = parseInt(producto.stock_actual || 0);
      const disponible = stockActual >= cantidad;
      return { disponible, stockActual, cantidadSolicitada: cantidad, mensaje: disponible ? 'Stock disponible' : `Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidad}` };
    } catch (error) {
      console.error(`❌ Error al verificar disponibilidad del producto ${id}:`, error);
      return { disponible: false, mensaje: 'Error al verificar disponibilidad', stockActual: 0 };
    }
  }

  async importarMasivo(productos, sucursalId, opciones = {}) {
    try {
      const datosEnvio = {
        productos: productos.map(p => ({
          codigo: p.codigo?.toString().trim() || '',
          nombre: p.nombre?.toString().trim() || '',
          descripcion: p.descripcion?.toString().trim() || '',
          precio_costo: parseFloat(p.precio_costo || 0),
          precio_venta: parseFloat(p.precio_venta || 0),
          stock_inicial: parseInt(p.stock_actual || p.stock_inicial || 0),
          stock_minimo: parseInt(p.stock_minimo || 5),
          categoria_id: p.categoria_id || opciones.categoria_default || '',
          unidad_medida: p.unidad_medida || 'unidad',
          activo: p.activo !== false
        })),
        sucursal_id: sucursalId,
        opciones: {
          categoria_default: opciones.categoria_default || '',
          evitar_duplicados: opciones.evitar_duplicados || false,
          actualizar_existentes: opciones.actualizar_existentes || true
        }
      };
      const resultado = await this.api.post('/importar-masivo', this.getOrgQuery(datosEnvio));
      const payload = (resultado?.data?.data) ?? resultado?.data ?? resultado;
      const errores = payload?.errores ?? payload?.errors ?? [];
      return {
        success: true,
        message: resultado?.data?.message || 'Importación completada',
        data: {
          importados: payload?.importados ?? payload?.created ?? payload?.creados ?? 0,
          actualizados: payload?.actualizados ?? payload?.updated ?? 0,
          duplicados: payload?.duplicados ?? payload?.skipped ?? 0,
          errores: Array.isArray(errores) ? errores : (errores ? [errores] : []),
          total_enviados: productos.length,
          procesamiento_completo: payload?.procesamiento_completo ?? true
        }
      };
    } catch (error) {
      console.error('❌ [PRODUCTOS SERVICE] Error en importación masiva:', error);
      throw new Error('Error durante la importación masiva: ' + error.message);
    }
  }

  async obtenerMasVendidos(limite = 10) {
    try {
      const res = await this.api.get('/mas-vendidos', this.getOrgQuery({ limite }));
      return this.ensureArray(res.data);
    } catch (error) {
      console.error('❌ Error al obtener productos más vendidos:', error);
      return [];
    }
  }
}

export default new ProductosService();

export async function obtenerProductoParaVenta(codigo, sucursalId) {
  if (/\s|\./.test(codigo)) {
    const productosService = new ProductosService();
    const productos = await productosService.buscar(codigo, sucursalId);
    return productos.find(p => p.codigo === codigo) || productos[0] || null;
  } else {
    const productosService = new ProductosService();
    return await productosService.obtenerPorCodigoConStock(codigo, sucursalId);
  }
} 