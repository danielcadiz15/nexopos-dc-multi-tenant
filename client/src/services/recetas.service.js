/**
 * Servicio para la gestión de recetas
 * 
 * @module services/recetas.service
 * @requires ./firebase.service
 */

import FirebaseService from './firebase.service';
import axios from 'axios'; // AGREGAR ESTA LÍNEA


/**
 * Servicio para operaciones relacionadas con recetas
 */
class RecetasService extends FirebaseService {
  constructor() {
    super('/recetas');
  }

  /**
   * Obtiene todas las recetas
   * @returns {Promise<Array>} Lista de recetas
   */
  async obtenerTodas() {
    try {
      const response = await this.get();
      return this.ensureArray(response);
    } catch (error) {
      console.error('Error al obtener recetas:', error);
      throw error;
    }
  }

  /**
   * Obtiene recetas activas
   * @returns {Promise<Array>} Lista de recetas activas
   */
  async obtenerActivas() {
    try {
      const response = await this.get('/activas');
      return this.ensureArray(response);
    } catch (error) {
      console.error('Error al obtener recetas activas:', error);
      throw error;
    }
  }

  /**
   * Obtiene una receta por ID
   * @param {string} id - ID de la receta
   * @returns {Promise<Object>} Datos de la receta
   */
  async obtenerPorId(id) {
    try {
      const response = await this.get(`/${id}`);
      return this.ensureObject(response);
    } catch (error) {
      console.error('Error al obtener receta:', error);
      throw error;
    }
  }

  /**
   * Obtiene el detalle (ingredientes) de una receta
   * @param {string} id - ID de la receta
   * @returns {Promise<Array>} Lista de ingredientes
   */
  async obtenerDetalle(id) {
    try {
      const response = await this.get(`/${id}/detalle`);
      return this.ensureArray(response);
    } catch (error) {
      console.error('Error al obtener detalle de receta:', error);
      throw error;
    }
  }

  /**
   * Calcula el costo de una receta
   * @param {string} id - ID de la receta
   * @returns {Promise<Object>} Objeto con costos calculados
   */
  async calcularCosto(id) {
    try {
      const response = await this.get(`/${id}/costo`);
      return this.ensureObject(response);
    } catch (error) {
      console.error('Error al calcular costo de receta:', error);
      throw error;
    }
  }

  /**
   * Verifica el stock disponible para producir una receta
   * @param {string} recetaId - ID de la receta
   * @param {number} cantidad - Cantidad a producir
   * @returns {Promise<Object>} Verificación de stock
   */
  async verificarStock(recetaId, cantidad, sucursalId) {
	  try {
		console.log(`🔍 Verificando stock para receta ${recetaId}, cantidad: ${cantidad}, sucursal: ${sucursalId}`);
		
		const response = await this.post(`/${recetaId}/verificar-stock`, { 
		  cantidad,
		  sucursal_id: sucursalId 
		});
		
		// Si response es un array, significa que firebase.service.js procesó la respuesta
		// Necesitamos devolver la estructura esperada
		if (Array.isArray(response)) {
		  return {
			stock_suficiente: response.length > 0 && response.every(item => item.suficiente),
			data: response
		  };
		}
		
		// Si no es array, devolver como está
		return response;
		
	  } catch (error) {
		console.error('Error al verificar stock:', error);
		throw error;
	  }
	}

  /**
   * Crea una nueva receta
   * @param {Object} receta - Datos de la receta
   * @param {Array} detalles - Lista de ingredientes
   * @returns {Promise<Object>} Receta creada
   */
	 async crear(receta, ingredientes) {
	  try {
		console.log('📤 Enviando receta:', { receta, ingredientes });
		
		// Verificar estructura antes de enviar
		if (!ingredientes || !Array.isArray(ingredientes)) {
		  throw new Error('Los ingredientes deben ser un array');
		}
		
		// Verificar que todos los ingredientes tengan producto_id
		const ingredientesInvalidos = ingredientes.filter(ing => !ing.producto_id);
		if (ingredientesInvalidos.length > 0) {
		  console.error('❌ Ingredientes sin producto_id:', ingredientesInvalidos);
		  throw new Error('Todos los ingredientes deben tener producto_id');
		}
		
		const response = await this.post('', {
		  receta: receta,
		  ingredientes: ingredientes
		});
		
		return response;
	  } catch (error) {
		console.error('Error al crear receta:', error);
		throw error;
	  }
	}
	/**
	 * Actualiza una receta existente
	 * @param {string} id - ID de la receta
	 * @param {Object} receta - Datos actualizados de la receta
	 * @param {Array} ingredientes - Lista actualizada de ingredientes
	 * @returns {Promise<Object>} Receta actualizada
	 */
	async actualizar(id, receta, ingredientes) {
	  try {
		console.log('📤 Actualizando receta:', { id, receta, ingredientes });
		
		// Verificar estructura antes de enviar
		if (!ingredientes || !Array.isArray(ingredientes)) {
		  throw new Error('Los ingredientes deben ser un array');
		}
		
		// Verificar que todos los ingredientes tengan producto_id
		const ingredientesInvalidos = ingredientes.filter(ing => !ing.producto_id);
		if (ingredientesInvalidos.length > 0) {
		  console.error('❌ Ingredientes sin producto_id:', ingredientesInvalidos);
		  throw new Error('Todos los ingredientes deben tener producto_id');
		}
		
		const response = await this.put(`/${id}`, {
		  receta: receta,
		  ingredientes: ingredientes
		});
		
		return response;
	  } catch (error) {
		console.error('Error al actualizar receta:', error);
		throw error;
	  }
	}
  /**
   * Elimina una receta
   * @param {string} id - ID de la receta
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async eliminar(id) {
    try {
      const response = await this.delete(`/${id}`);
      return response;
    } catch (error) {
      console.error('Error al eliminar receta:', error);
      throw error;
    }
  }

  /**
   * Busca recetas por término
   * @param {string} termino - Término de búsqueda
   * @returns {Promise<Array>} Lista de recetas encontradas
   */
  async buscar(termino) {
    try {
      const response = await this.get('/buscar', { termino });
      return this.ensureArray(response);
    } catch (error) {
      console.error('Error al buscar recetas:', error);
      throw error;
    }
  }

  /**
   * Obtiene recetas por producto
   * @param {string} productoId - ID del producto
   * @returns {Promise<Array>} Lista de recetas del producto
   */
  async obtenerPorProducto(productoId) {
    try {
      const response = await this.get('/producto', { producto_id: productoId });
      return this.ensureArray(response);
    } catch (error) {
      console.error('Error al obtener recetas por producto:', error);
      throw error;
    }
  }

  /**
   * Duplica una receta existente
   * @param {string} id - ID de la receta a duplicar
   * @param {string} nuevoNombre - Nombre para la nueva receta
   * @returns {Promise<Object>} Nueva receta creada
   */
  async duplicar(id, nuevoNombre) {
    try {
      const response = await this.post(`/${id}/duplicar`, { nombre: nuevoNombre });
      return response;
    } catch (error) {
      console.error('Error al duplicar receta:', error);
      throw error;
    }
  }
}

// Exportar instancia única del servicio
const recetasService = new RecetasService();
export default recetasService;