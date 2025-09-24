// src/services/stockSync.service.js
import productosService from './productos.service';
import materiasPrimasService from './materiasPrimas.service';

class StockSyncService {
  /**
   * Sincroniza el stock entre productos y materias primas
   * @param {string} codigo - Código del producto/materia prima
   * @param {number} nuevoStock - Nuevo valor de stock
   * @param {string} origen - 'producto' o 'materia_prima'
   */
  async sincronizarStock(codigo, nuevoStock, origen = 'producto') {
    try {
      console.log(`🔄 Sincronizando stock para código ${codigo}: ${nuevoStock}`);
      
      if (origen === 'producto') {
        // Buscar si existe como materia prima
        const materiasPrimas = await materiasPrimasService.obtenerTodas();
        const materiaPrima = materiasPrimas.find(mp => mp.codigo === codigo);
        
        if (materiaPrima) {
          console.log(`📦 Actualizando materia prima ${materiaPrima.nombre}`);
          await materiasPrimasService.ajustarStock(materiaPrima.id, {
            stock_actual: nuevoStock
          });
        }
      } else if (origen === 'materia_prima') {
        // Buscar si existe como producto
        const productos = await productosService.obtenerTodos();
        const producto = productos.find(p => p.codigo === codigo);
        
        if (producto) {
          console.log(`📦 Actualizando producto ${producto.nombre}`);
          await productosService.actualizarStock(producto.id, {
            cantidad: nuevoStock
          });
        }
      }
      
      console.log(`✅ Sincronización completada`);
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      // No lanzar error para no interrumpir el flujo principal
    }
  }
  
  /**
   * Sincroniza múltiples items después de producción
   * @param {Array} consumos - Items consumidos [{codigo, cantidad}]
   * @param {Object} producido - Item producido {codigo, cantidad}
   */
  async sincronizarProduccion(consumos, producido) {
    try {
      console.log(`🏭 Sincronizando después de producción`);
      
      // Actualizar materias primas consumidas
      for (const consumo of consumos) {
        const materiasPrimas = await materiasPrimasService.obtenerTodas();
        const mp = materiasPrimas.find(m => m.codigo === consumo.codigo);
        if (mp) {
          const stockActual = parseFloat(mp.stock_actual || 0);
          const consumoCantidad = parseFloat(consumo.cantidad || 0);
          const nuevoStockMP = Math.max(0, stockActual - consumoCantidad);
          await this.sincronizarStock(consumo.codigo, nuevoStockMP, 'materia_prima');
        }
      }
      
      // Actualizar producto producido
      if (producido && producido.codigo) {
        const productos = await productosService.obtenerTodos();
        const prod = productos.find(p => p.codigo === producido.codigo);
        if (prod) {
          const stockActual = parseFloat(prod.stock?.cantidad || 0);
          const cantidadProducida = parseFloat(producido.cantidad || 0);
          const nuevoStockProd = stockActual + cantidadProducida;
          await this.sincronizarStock(producido.codigo, nuevoStockProd, 'producto');
        }
      }
      
    } catch (error) {
      console.error('❌ Error en sincronización de producción:', error);
    }
  }
}

const stockSyncService = new StockSyncService();
export default stockSyncService;