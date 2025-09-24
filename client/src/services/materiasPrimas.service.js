/**
 * Servicio para la gestión de materias primas
 * 
 * @module services/materiasPrimas.service
 * @requires ./firebase.service
 */

import FirebaseService from './firebase.service';

/**
 * Servicio para operaciones relacionadas con materias primas
 */
class MateriasPrimasService extends FirebaseService {
  constructor() {
    super('/materias-primas');
  }

  /**
   * Obtiene todas las materias primas
   * @returns {Promise<Array>} Lista de materias primas
   */
  async obtenerTodas() {
    try {
      const response = await this.get();
      return this.ensureArray(response);
    } catch (error) {
      console.error('Error al obtener materias primas:', error);
      throw error;
    }
  }

  /**
   * Obtiene materias primas activas
   * @returns {Promise<Array>} Lista de materias primas activas
   */
  async obtenerActivas() {
    try {
      const response = await this.get('/activas');
      return this.ensureArray(response);
    } catch (error) {
      console.error('Error al obtener materias primas activas:', error);
      throw error;
    }
  }

  /**
   * Obtiene materias primas con stock bajo
   * @returns {Promise<Array>} Lista de materias primas con stock bajo
   */
  async obtenerStockBajo() {
    try {
      const response = await this.get('/stock-bajo');
      return this.ensureArray(response);
    } catch (error) {
      console.error('Error al obtener materias primas con stock bajo:', error);
      throw error;
    }
  }

  /**
   * Obtiene una materia prima por ID
   * @param {string} id - ID de la materia prima
   * @returns {Promise<Object>} Datos de la materia prima
   */
  async obtenerPorId(id) {
    try {
      const response = await this.get(`/${id}`);
      return this.ensureObject(response);
    } catch (error) {
      console.error('Error al obtener materia prima:', error);
      throw error;
    }
  }

  /**
   * Crea una nueva materia prima
   * @param {Object} materiaPrima - Datos de la materia prima
   * @returns {Promise<Object>} Materia prima creada
   */
  async crear(materiaPrima) {
    try {
      const data = {
        codigo: materiaPrima.codigo || '',
        nombre: materiaPrima.nombre,
        descripcion: materiaPrima.descripcion || '',
        unidad_medida: materiaPrima.unidad_medida,
        precio_unitario: parseFloat(materiaPrima.precio_unitario),
        stock_actual: parseFloat(materiaPrima.stock_actual || 0),
        stock_minimo: parseFloat(materiaPrima.stock_minimo || 0),
        proveedor_id: materiaPrima.proveedor_id ? parseInt(materiaPrima.proveedor_id) : null,
        activo: materiaPrima.activo !== false
      };
      
      console.log('📤 Creando materia prima:', data);
      
      const response = await this.post('', data);
      return response;
    } catch (error) {
      console.error('Error al crear materia prima:', error);
      throw error;
    }
  }

  /**
   * Actualiza una materia prima existente
   * @param {string} id - ID de la materia prima
   * @param {Object} materiaPrima - Datos actualizados
   * @returns {Promise<Object>} Materia prima actualizada
   */
  async actualizar(id, materiaPrima) {
    try {
      const data = {
        codigo: materiaPrima.codigo || '',
        nombre: materiaPrima.nombre,
        descripcion: materiaPrima.descripcion || '',
        unidad_medida: materiaPrima.unidad_medida,
        precio_unitario: parseFloat(materiaPrima.precio_unitario),
        stock_actual: parseFloat(materiaPrima.stock_actual || 0),
        stock_minimo: parseFloat(materiaPrima.stock_minimo || 0),
        proveedor_id: materiaPrima.proveedor_id ? parseInt(materiaPrima.proveedor_id) : null,
        activo: materiaPrima.activo !== false
      };
      
      console.log('📤 Actualizando materia prima:', data);
      
      const response = await this.put(`/${id}`, data);
      return response;
    } catch (error) {
      console.error('Error al actualizar materia prima:', error);
      throw error;
    }
  }

  /**
   * Elimina una materia prima
   * @param {string} id - ID de la materia prima
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async eliminar(id) {
    try {
      const response = await this.delete(`/${id}`);
      return response;
    } catch (error) {
      console.error('Error al eliminar materia prima:', error);
      throw error;
    }
  }

  /**
   * Busca materias primas por término
   * @param {string} termino - Término de búsqueda
   * @returns {Promise<Array>} Lista de materias primas encontradas
   */
  async buscar(termino) {
    try {
      const response = await this.get('/buscar', { termino });
      return this.ensureArray(response);
    } catch (error) {
      console.error('Error al buscar materias primas:', error);
      throw error;
    }
  }

  /**
   * Actualiza el stock de una materia prima
   * @param {string} id - ID de la materia prima
   * @param {number} cantidad - Nueva cantidad de stock
   * @returns {Promise<Object>} Materia prima con stock actualizado
   */
  async actualizarStock(id, cantidad) {
    try {
      const response = await this.post(`/${id}/stock`, { cantidad: parseFloat(cantidad) });
      return response;
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      throw error;
    }
  }

  /**
   * Ajusta el stock de una materia prima (suma o resta)
   * @param {string} id - ID de la materia prima
   * @param {number} ajuste - Cantidad a ajustar (positivo suma, negativo resta)
   * @param {string} motivo - Motivo del ajuste
   * @returns {Promise<Object>} Resultado del ajuste
   */
  async ajustarStock(id, ajuste, motivo = '') {
    try {
      const response = await this.post(`/${id}/ajustar-stock`, { 
        ajuste: parseFloat(ajuste), 
        motivo 
      });
      return response;
    } catch (error) {
      console.error('Error al ajustar stock:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de movimientos de una materia prima
   * @param {string} id - ID de la materia prima
   * @returns {Promise<Array>} Lista de movimientos
   */
  async obtenerMovimientos(id) {
    try {
      const response = await this.get(`/${id}/movimientos`);
      return this.ensureArray(response);
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      throw error;
    }
  }
   /**
 * Ajustar stock de una materia prima
 * @param {string} id - ID de la materia prima
 * @param {Object} datos - Datos del ajuste
 * @returns {Promise<Object>} Materia prima actualizada
 */
	/**
 * Ajustar stock de una materia prima
 * @param {string} id - ID de la materia prima
 * @param {Object} datos - Datos del ajuste
 * @returns {Promise<Object>} Materia prima actualizada
 */
	async ajustarStock(id, datos) {
	  try {
		console.log('🔧 Ajustando stock:', { id, datos });
		
		// Preparar datos para actualizar
		const actualizacion = {
		  stock_actual: datos.stock_actual,
		  fechaActualizacion: new Date().toISOString()
		};
		
		// Si viene información del ajuste, guardarla en el historial
		if (datos.ajuste) {
		  // Aquí podrías guardar el historial en una colección separada si quieres
		  console.log('📝 Registrando ajuste:', datos.ajuste);
		}
		
		// Actualizar el documento
		const response = await this.put(`/${id}`, actualizacion);
		console.log('✅ Stock actualizado');
		
		return response;
	  } catch (error) {
		console.error('Error al ajustar stock:', error);
		throw error;
	  }
	}
  /**
   * Obtiene materias primas por proveedor
   * @param {string} proveedorId - ID del proveedor
   * @returns {Promise<Array>} Lista de materias primas del proveedor
   */
  async obtenerPorProveedor(proveedorId) {
    try {
      const response = await this.get('/proveedor', { proveedor_id: proveedorId });
      return this.ensureArray(response);
    } catch (error) {
      console.error('Error al obtener materias primas por proveedor:', error);
      throw error;
    }
  }
}
   

// Exportar instancia única del servicio
const materiasPrimasService = new MateriasPrimasService();
export default materiasPrimasService;