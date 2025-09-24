// src/services/materiasPrimasHelper.js
// Helper ACTUALIZADO para pasar sucursal_id

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api-5q2i5764zq-uc.a.run.app';

class MateriasPrimasHelper {
  // Obtener todas las materias primas CON STOCK DE SUCURSAL
  async obtenerTodas(sucursalId = null) {
    try {
      console.log('🔄 Obteniendo materias primas del sistema unificado...');
      console.log('📍 Sucursal ID:', sucursalId || 'no especificada');
      
      // Construir URL con parámetro de sucursal si existe
      let url = `${API_URL}/recetas/materias-primas`;
      if (sucursalId) {
        url += `?sucursal_id=${sucursalId}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data && response.data.success) {
        console.log(`✅ ${response.data.data.length} materias primas obtenidas`);
        
        // Verificar el stock recibido
        response.data.data.forEach(mp => {
          if (mp.stock_actual > 0) {
            console.log(`📦 ${mp.nombre}: ${mp.stock_actual} ${mp.unidad_medida}`);
          }
        });
        
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Error al obtener materias primas:', error);
      
      // Fallback: intentar obtener productos y filtrar localmente
      try {
        console.log('🔄 Intentando método alternativo...');
        const productosResponse = await axios.get(`${API_URL}/productos`);
        
        if (productosResponse.data && productosResponse.data.success) {
          // Buscar la categoría materias primas
          const categoriasResponse = await axios.get(`${API_URL}/categorias`);
          const categorias = categoriasResponse.data.data || [];
          const categoriaMP = categorias.find(c => c.nombre === 'Materias Primas');
          
          if (categoriaMP) {
            // Filtrar productos por categoría
            const productos = productosResponse.data.data || [];
            let materiasPrimas = productos.filter(p => 
              p.categoria_id === categoriaMP.id && p.activo
            );
            
            // Si hay sucursal, obtener stock específico
            if (sucursalId && materiasPrimas.length > 0) {
              console.log('🔄 Obteniendo stock por sucursal...');
              
              // Para cada materia prima, obtener su stock en la sucursal
              const materiasPrimasConStock = await Promise.all(
                materiasPrimas.map(async (mp) => {
                  try {
                    const stockResponse = await axios.get(
                      `${API_URL}/stock-sucursal/producto/${mp.id}?sucursal_id=${sucursalId}`
                    );
                    
                    if (stockResponse.data && stockResponse.data.success && stockResponse.data.data) {
                      return {
                        ...mp,
                        stock_actual: stockResponse.data.data.cantidad || 0,
                        stock_sucursal: stockResponse.data.data.cantidad || 0
                      };
                    }
                  } catch (error) {
                    console.warn(`No se pudo obtener stock para ${mp.nombre}`);
                  }
                  
                  return mp;
                })
              );
              
              materiasPrimas = materiasPrimasConStock;
            }
            
            console.log(`✅ ${materiasPrimas.length} materias primas filtradas localmente`);
            return materiasPrimas;
          }
        }
      } catch (fallbackError) {
        console.error('❌ Error en método alternativo:', fallbackError);
      }
      
      return [];
    }
  }

  // Obtener materias primas activas
  async obtenerActivas(sucursalId = null) {
    const todas = await this.obtenerTodas(sucursalId);
    return todas.filter(mp => mp.activo !== false);
  }

  // Buscar materias primas
  async buscar(termino, sucursalId = null) {
    if (!termino || termino.trim().length < 2) {
      return await this.obtenerTodas(sucursalId);
    }
    
    const todas = await this.obtenerTodas(sucursalId);
    const terminoLower = termino.toLowerCase().trim();
    
    return todas.filter(mp => 
      (mp.nombre && mp.nombre.toLowerCase().includes(terminoLower)) ||
      (mp.codigo && mp.codigo.toLowerCase().includes(terminoLower))
    );
  }

  // Resto de métodos sin cambios...
  async obtenerPorId(id) {
    try {
      const response = await axios.get(`${API_URL}/productos/${id}`);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error al obtener materia prima ${id}:`, error);
      return null;
    }
  }

  async crear(materiaPrima) {
    try {
      const categoriasResponse = await axios.get(`${API_URL}/categorias`);
      const categorias = categoriasResponse.data.data || [];
      const categoriaMP = categorias.find(c => c.nombre === 'Materias Primas');
      
      if (!categoriaMP) {
        throw new Error('No se encontró la categoría Materias Primas');
      }
      
      const producto = {
        ...materiaPrima,
        categoria_id: categoriaMP.id,
        codigo: materiaPrima.codigo || `MP-${Date.now()}`,
        precio_costo: materiaPrima.precio_unitario || materiaPrima.precio_costo || 0,
        precio_venta: materiaPrima.precio_unitario || materiaPrima.precio_costo || 0,
        unidad_medida: materiaPrima.unidad_medida || 'unidad',
        activo: true
      };
      
      const response = await axios.post(`${API_URL}/productos`, producto);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Error al crear materia prima');
    } catch (error) {
      console.error('❌ Error al crear materia prima:', error);
      throw error;
    }
  }

  async actualizar(id, materiaPrima) {
    try {
      const datos = {
        ...materiaPrima,
        precio_costo: materiaPrima.precio_unitario || materiaPrima.precio_costo,
        precio_venta: materiaPrima.precio_unitario || materiaPrima.precio_costo
      };
      
      const response = await axios.put(`${API_URL}/productos/${id}`, datos);
      
      if (response.data && response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Error al actualizar materia prima');
    } catch (error) {
      console.error(`❌ Error al actualizar materia prima ${id}:`, error);
      throw error;
    }
  }

  async eliminar(id) {
    try {
      const response = await axios.delete(`${API_URL}/productos/${id}`);
      
      if (response.data && response.data.success) {
        return response.data;
      }
      
      throw new Error('Error al eliminar materia prima');
    } catch (error) {
      console.error(`❌ Error al eliminar materia prima ${id}:`, error);
      throw error;
    }
  }
}

// Exportar instancia única
const materiasPrimasHelper = new MateriasPrimasHelper();
export default materiasPrimasHelper;