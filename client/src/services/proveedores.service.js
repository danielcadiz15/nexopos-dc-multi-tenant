// src/services/proveedores.service.js - MIGRADO A FIREBASE
import FirebaseService from './firebase.service';

// Datos de respaldo para proveedores
const PROVEEDORES_RESPALDO = [
  {
    id: '1',
    nombre: 'Proveedor General',
    contacto: 'Sin contacto',
    telefono: '',
    email: '',
    direccion: '',
    activo: true,
    fechaCreacion: new Date().toISOString()
  }
];

/**
 * Servicio para gestión de proveedores con Firebase
 * Migrado completamente a Firebase Functions
 */
class ProveedoresService extends FirebaseService {
  constructor() {
    super('/proveedores'); // Módulo en Firebase Functions
  }

  /**
   * Obtiene todos los proveedores
   * @returns {Promise<Array>} Lista de proveedores
   */
  async obtenerTodos() {
    try {
      console.log('🔄 Obteniendo todos los proveedores...');
      const proveedores = await this.get('');
      
      // Asegurar que siempre sea un array
      const proveedoresArray = this.ensureArray(proveedores);
      
      if (proveedoresArray.length === 0) {
        console.log('⚠️ No hay proveedores, usando datos de respaldo');
        return PROVEEDORES_RESPALDO;
      }
      
      console.log(`✅ Proveedores cargados: ${proveedoresArray.length}`);
      return proveedoresArray;
      
    } catch (error) {
      console.error('❌ Error al obtener proveedores:', error);
      console.log('🔄 Usando datos de respaldo');
      return PROVEEDORES_RESPALDO;
    }
  }

  /**
   * Obtiene proveedores activos
   * @returns {Promise<Array>} Lista de proveedores activos
   */
  async obtenerActivos() {
    try {
      console.log('🔄 Obteniendo proveedores activos...');
      const proveedores = await this.get('/activos');
      
      const proveedoresArray = this.ensureArray(proveedores);
      
      if (proveedoresArray.length === 0) {
        const activos = PROVEEDORES_RESPALDO.filter(p => p.activo);
        console.log('⚠️ Usando proveedores activos de respaldo');
        return activos;
      }
      
      console.log(`✅ Proveedores activos: ${proveedoresArray.length}`);
      return proveedoresArray;
      
    } catch (error) {
      console.error('❌ Error al obtener proveedores activos:', error);
      return PROVEEDORES_RESPALDO.filter(p => p.activo);
    }
  }

  /**
   * Obtiene un proveedor por su ID
   * @param {string} id - ID del proveedor
   * @returns {Promise<Object>} Proveedor
   */
  async obtenerPorId(id) {
    try {
      console.log(`🔄 Obteniendo proveedor ID: ${id}`);
      const proveedor = await this.get(`/${id}`);
      
      const proveedorObj = this.ensureObject(proveedor);
      
      if (!proveedorObj || Object.keys(proveedorObj).length === 0) {
        // Buscar en datos de respaldo
        const proveedorRespaldo = PROVEEDORES_RESPALDO.find(p => p.id === id);
        if (proveedorRespaldo) {
          console.log('⚠️ Usando proveedor de respaldo');
          return proveedorRespaldo;
        }
        throw new Error(`Proveedor ${id} no encontrado`);
      }
      
      console.log(`✅ Proveedor obtenido:`, proveedorObj);
      return proveedorObj;
      
    } catch (error) {
      console.error(`❌ Error al obtener proveedor ${id}:`, error);
      
      // Buscar en datos de respaldo antes de lanzar error
      const proveedorRespaldo = PROVEEDORES_RESPALDO.find(p => p.id === id);
      if (proveedorRespaldo) {
        console.log('⚠️ Usando proveedor de respaldo');
        return proveedorRespaldo;
      }
      
      throw error;
    }
  }

  /**
   * Crea un nuevo proveedor
   * @param {Object} proveedor - Datos del proveedor
   * @returns {Promise<Object>} Proveedor creado
   */
  async crear(proveedor) {
    try {
      console.log('🆕 Creando proveedor:', proveedor);
      
      // Formatear datos del proveedor
      const proveedorFormateado = {
        ...proveedor,
        nombre: proveedor.nombre?.trim() || '',
        contacto: proveedor.contacto?.trim() || '',
        telefono: proveedor.telefono?.trim() || '',
        email: proveedor.email?.trim() || '',
        direccion: proveedor.direccion?.trim() || '',
        activo: proveedor.activo !== false // Por defecto true
      };
      
      // Validación básica
      if (!proveedorFormateado.nombre) {
        throw new Error('El nombre del proveedor es requerido');
      }
      
      const resultado = await this.post('', proveedorFormateado);
      console.log('✅ Proveedor creado:', resultado);
      
      return resultado;
    } catch (error) {
      console.error('❌ Error al crear proveedor:', error);
      throw error;
    }
  }

  /**
   * Actualiza un proveedor existente
   * @param {string} id - ID del proveedor
   * @param {Object} proveedor - Nuevos datos
   * @returns {Promise<Object>} Respuesta de la actualización
   */
  async actualizar(id, proveedor) {
    try {
      console.log(`🔄 Actualizando proveedor ${id}:`, proveedor);
      
      // Formatear datos del proveedor
      const proveedorFormateado = {
        ...proveedor,
        nombre: proveedor.nombre?.trim() || '',
        contacto: proveedor.contacto?.trim() || '',
        telefono: proveedor.telefono?.trim() || '',
        email: proveedor.email?.trim() || '',
        direccion: proveedor.direccion?.trim() || ''
      };
      
      // Validación básica
      if (!proveedorFormateado.nombre) {
        throw new Error('El nombre del proveedor es requerido');
      }
      
      const resultado = await this.put(`/${id}`, proveedorFormateado);
      console.log('✅ Proveedor actualizado:', resultado);
      
      return resultado;
    } catch (error) {
      console.error(`❌ Error al actualizar proveedor ${id}:`, error);
      throw error;
    }
  }

  /**
   * Elimina un proveedor
   * @param {string} id - ID del proveedor
   * @returns {Promise<Object>} Respuesta de la eliminación
   */
  async eliminar(id) {
    try {
      console.log(`🗑️ Eliminando proveedor ${id}`);
      const resultado = await this.delete(`/${id}`);
      console.log('✅ Proveedor eliminado:', resultado);
      
      return resultado;
    } catch (error) {
      console.error(`❌ Error al eliminar proveedor ${id}:`, error);
      throw error;
    }
  }

  /**
   * Busca proveedores por nombre
   * @param {string} termino - Término de búsqueda
   * @returns {Promise<Array>} Proveedores encontrados
   */
  async buscar(termino) {
    try {
      console.log('🔍 Buscando proveedores:', termino);
      
      if (!termino || !termino.trim()) {
        return await this.obtenerTodos();
      }
      
      const proveedores = await this.get('/buscar', { termino: termino.trim() });
      
      const proveedoresArray = this.ensureArray(proveedores);
      
      if (proveedoresArray.length === 0) {
        // Búsqueda en datos de respaldo
        const terminoLower = termino.toLowerCase();
        const respaldoFiltrado = PROVEEDORES_RESPALDO.filter(p => 
          p.nombre.toLowerCase().includes(terminoLower) ||
          p.contacto.toLowerCase().includes(terminoLower)
        );
        console.log(`⚠️ Búsqueda en respaldo: ${respaldoFiltrado.length} resultados`);
        return respaldoFiltrado;
      }
      
      console.log(`✅ Proveedores encontrados: ${proveedoresArray.length}`);
      return proveedoresArray;
      
    } catch (error) {
      console.error('❌ Error al buscar proveedores:', error);
      
      // Búsqueda simple en datos de respaldo
      const terminoLower = termino?.toLowerCase() || '';
      const respaldoFiltrado = PROVEEDORES_RESPALDO.filter(p => 
        p.nombre.toLowerCase().includes(terminoLower) ||
        p.contacto.toLowerCase().includes(terminoLower)
      );
      
      console.log(`⚠️ Búsqueda de respaldo: ${respaldoFiltrado.length} resultados`);
      return respaldoFiltrado;
    }
  }

  /**
   * Obtiene estadísticas de un proveedor
   * @param {string} id - ID del proveedor
   * @returns {Promise<Object>} Estadísticas del proveedor
   */
  async obtenerEstadisticas(id) {
    try {
      console.log(`🔄 Obteniendo estadísticas del proveedor ${id}`);
      const estadisticas = await this.get(`/${id}/estadisticas`);
      
      const statsObj = this.ensureObject(estadisticas);
      console.log(`📊 Estadísticas del proveedor:`, statsObj);
      
      return statsObj;
    } catch (error) {
      console.error(`❌ Error al obtener estadísticas del proveedor ${id}:`, error);
      return {
        totalCompras: 0,
        montoTotal: 0,
        ultimaCompra: null,
        comprasRecientes: 0
      };
    }
  }
}

export default new ProveedoresService();