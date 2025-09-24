// src/services/categorias.service.js - MIGRADO A FIREBASE
import FirebaseService from './firebase.service';

/**
 * Servicio para gestión de categorías con Firebase
 * Migrado completamente a Firebase Functions
 */
class CategoriasService extends FirebaseService {
  constructor() {
    super('/categorias'); // Módulo en Firebase Functions
  }

  /**
   * Obtiene todas las categorías
   * @returns {Promise<Array>} Lista de categorías
   */
  async obtenerTodos() {
    try {
      console.log('🔄 Obteniendo todas las categorías...');
      const categorias = await this.get('');
      
      // Asegurar que siempre sea un array
      const categoriasArray = this.ensureArray(categorias);
      
      if (categoriasArray.length === 0) {
        console.log('⚠️ No hay categorías creadas');
        return [];
      }
      
      console.log(`✅ Categorías cargadas: ${categoriasArray.length}`);
      return categoriasArray;
      
    } catch (error) {
      console.error('❌ Error al obtener categorías:', error);
      return [];
    }
  }

  /**
   * Alias para compatibilidad con código existente
   */
  async obtenerTodas() {
    return this.obtenerTodos();
  }

  /**
   * Obtiene categorías activas
   * @returns {Promise<Array>} Lista de categorías activas
   */
  async obtenerActivas() {
    try {
      console.log('🔄 Obteniendo categorías activas...');
      const categorias = await this.get('/activas');
      
      const categoriasArray = this.ensureArray(categorias);
      
      if (categoriasArray.length === 0) {
        return [];
      }
      
      console.log(`✅ Categorías activas: ${categoriasArray.length}`);
      return categoriasArray;
      
    } catch (error) {
      console.error('❌ Error al obtener categorías activas:', error);
      return [];
    }
  }

  /**
   * Obtiene una categoría por su ID
   * @param {string} id - ID de la categoría
   * @returns {Promise<Object>} Categoría
   */
  async obtenerPorId(id) {
    try {
      console.log(`🔄 Obteniendo categoría ID: ${id}`);
      const categoria = await this.get(`/${id}`);
      
      const categoriaObj = this.ensureObject(categoria);
      
      if (!categoriaObj || Object.keys(categoriaObj).length === 0) {
        throw new Error(`Categoría ${id} no encontrada`);
      }
      
      console.log(`✅ Categoría obtenida:`, categoriaObj);
      return categoriaObj;
      
    } catch (error) {
      console.error(`❌ Error al obtener categoría ${id}:`, error);
      throw error;
    }
  }

  /**
   * Crea una nueva categoría
   * @param {Object} categoria - Datos de la categoría
   * @returns {Promise<Object>} Categoría creada
   */
  async crear(categoria) {
    try {
      console.log('🆕 Creando categoría:', categoria);
      
      // Formatear datos de la categoría
      const categoriaFormateada = {
        ...categoria,
        nombre: categoria.nombre?.trim() || '',
        descripcion: categoria.descripcion?.trim() || '',
        activo: categoria.activo !== false // Por defecto true
      };
      
      // Validación básica
      if (!categoriaFormateada.nombre) {
        throw new Error('El nombre de la categoría es requerido');
      }
      
      const resultado = await this.post('', categoriaFormateada);
      console.log('✅ Categoría creada:', resultado);
      
      return resultado;
    } catch (error) {
      console.error('❌ Error al crear categoría:', error);
      throw error;
    }
  }

  /**
   * Actualiza una categoría existente
   * @param {string} id - ID de la categoría
   * @param {Object} categoria - Nuevos datos
   * @returns {Promise<Object>} Respuesta de la actualización
   */
  async actualizar(id, categoria) {
    try {
      console.log(`🔄 Actualizando categoría ${id}:`, categoria);
      
      // Formatear datos de la categoría
      const categoriaFormateada = {
        ...categoria,
        nombre: categoria.nombre?.trim() || '',
        descripcion: categoria.descripcion?.trim() || ''
      };
      
      // Validación básica
      if (!categoriaFormateada.nombre) {
        throw new Error('El nombre de la categoría es requerido');
      }
      
      const resultado = await this.put(`/${id}`, categoriaFormateada);
      console.log('✅ Categoría actualizada:', resultado);
      
      return resultado;
    } catch (error) {
      console.error(`❌ Error al actualizar categoría ${id}:`, error);
      throw error;
    }
  }

  /**
   * Elimina una categoría
   * @param {string} id - ID de la categoría
   * @returns {Promise<Object>} Respuesta de la eliminación
   */
  async eliminar(id) {
    try {
      console.log(`🗑️ Eliminando categoría ${id}`);
      const resultado = await this.delete(`/${id}`);
      console.log('✅ Categoría eliminada:', resultado);
      
      return resultado;
    } catch (error) {
      console.error(`❌ Error al eliminar categoría ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca categorías por nombre
   * @param {string} termino - Término de búsqueda
   * @returns {Promise<Array>} Categorías encontradas
   */
  async buscar(termino) {
    try {
      console.log('🔍 Buscando categorías:', termino);
      
      if (!termino || !termino.trim()) {
        return await this.obtenerTodos();
      }
      
      const categorias = await this.get('/buscar', { termino: termino.trim() });
      
      const categoriasArray = this.ensureArray(categorias);
      
      if (categoriasArray.length === 0) {
        return [];
      }
      
      console.log(`✅ Categorías encontradas: ${categoriasArray.length}`);
      return categoriasArray;
      
    } catch (error) {
      console.error('❌ Error al buscar categorías:', error);
      return [];
    }
  }

  /**
   * Obtiene el número de productos por categoría
   * @param {string} id - ID de la categoría
   * @returns {Promise<number>} Número de productos
   */
  async contarProductos(id) {
    try {
      console.log(`🔄 Contando productos de categoría ${id}`);
      const resultado = await this.get(`/${id}/productos/count`);
      
      const count = typeof resultado === 'number' ? resultado : (resultado?.count || 0);
      console.log(`✅ Productos en categoría ${id}: ${count}`);
      
      return count;
    } catch (error) {
      console.error(`❌ Error al contar productos de categoría ${id}:`, error);
      return 0;
    }
  }
}

export default new CategoriasService();