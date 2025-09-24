// functions/routes/reportes.routes.js - VERSIÓN CORREGIDA
const admin = require('firebase-admin');
const db = admin.firestore();

module.exports = async function reportesRoutes(req, res, path) {
  console.log('📊 [REPORTES] Ruta:', path);
  
  try {
    // ==================== REPORTE DE VENTAS CORREGIDO ====================
    if (path === '/reportes/ventas' && req.method === 'GET') {
      try {
        const { fechaInicio, fechaFin, sucursal_id } = req.query;
        
        console.log('📊 [REPORTES VENTAS] Params:', { fechaInicio, fechaFin, sucursal_id });
        
        if (!fechaInicio || !fechaFin) {
          res.status(400).json({ error: 'Fechas requeridas' });
          return true;
        }
        
        // ✅ CORRECCIÓN 1: Query sin filtros de fecha (filtrar en memoria)
        let ventasQuery = db.collection('ventas');
        
        if (sucursal_id) {
          ventasQuery = ventasQuery.where('sucursal_id', '==', sucursal_id);
        }
        
        const ventasSnapshot = await ventasQuery.get();
        console.log('📊 [REPORTES] Total ventas en DB:', ventasSnapshot.size);
        
        // ✅ CORRECCIÓN 2: Filtrar en memoria con fechas correctas
        const fechaInicioDate = new Date(fechaInicio);
        fechaInicioDate.setHours(0, 0, 0, 0);
        
        const fechaFinDate = new Date(fechaFin);
        fechaFinDate.setHours(23, 59, 59, 999);
        
        const ventasFiltradas = [];
        ventasSnapshot.forEach(doc => {
          const venta = doc.data();
          
          // Convertir fecha string/timestamp a Date
          let fechaVenta;
          if (venta.fecha && typeof venta.fecha === 'string') {
            fechaVenta = new Date(venta.fecha);
          } else if (venta.fecha && venta.fecha.toDate) {
            fechaVenta = venta.fecha.toDate();
          } else {
            console.warn('Fecha inválida en venta:', doc.id);
            return;
          }
          
          // Verificar si está en el rango Y es completada
          if (fechaVenta >= fechaInicioDate && 
              fechaVenta <= fechaFinDate && 
              venta.estado === 'completada') {
            ventasFiltradas.push({
              ...venta,
              id: doc.id,
              fecha: fechaVenta.toISOString()
            });
          }
        });
        
        console.log('📊 [REPORTES] Ventas filtradas:', ventasFiltradas.length);
        
        // Variables para acumular
        let totalVentas = 0;
        let cantidadVentas = 0;
        let unidadesVendidas = 0;
        let gananciaReal = 0;
        let descuentos = 0;
        let costoTotal = 0;
        
        const ventasPorDia = {};
        const ventasPorCategoria = {};
        const ventasPorMetodoPago = {};
        const productosVendidos = {};
        const clientesVentas = {};
        
        // ✅ CORRECCIÓN 3: Calcular ganancias reales
        for (const venta of ventasFiltradas) {
          totalVentas += venta.total || 0;
          cantidadVentas++;
          descuentos += venta.descuento || 0;
          
          // Fecha para agrupación
          const fecha = new Date(venta.fecha);
          const fechaKey = fecha.toISOString().split('T')[0];
          
          if (!ventasPorDia[fechaKey]) {
            ventasPorDia[fechaKey] = {
              fecha: fechaKey,
              total: 0,
              cantidad: 0,
              ganancia: 0
            };
          }
          ventasPorDia[fechaKey].total += venta.total || 0;
          ventasPorDia[fechaKey].cantidad++;
          
          // Método de pago
          const metodoPago = venta.metodo_pago || 'efectivo';
          if (!ventasPorMetodoPago[metodoPago]) {
            ventasPorMetodoPago[metodoPago] = {
              metodo_pago: metodoPago,
              total: 0,
              cantidad: 0
            };
          }
          ventasPorMetodoPago[metodoPago].total += venta.total || 0;
          ventasPorMetodoPago[metodoPago].cantidad++;
          
          // ✅ CORRECCIÓN 4: Procesar detalles con costos reales
          let gananciaVenta = 0;
          let costoVenta = 0;
          
          if (venta.detalles && Array.isArray(venta.detalles)) {
            for (const detalle of venta.detalles) {
              const cantidadDetalle = parseInt(detalle.cantidad || 0);
              const precioVentaUnitario = parseFloat(detalle.precio_unitario || 0);
              unidadesVendidas += cantidadDetalle;
              
              // Buscar precio de costo real del producto
              let costoUnitario = 0;
              if (detalle.producto_id) {
                try {
                  const productoDoc = await db.collection('productos').doc(detalle.producto_id).get();
                  if (productoDoc.exists) {
                    const producto = productoDoc.data();
                    costoUnitario = parseFloat(producto.precio_costo || 0);
                  } else {
                    // Si no existe el producto, estimar 70% del precio de venta
                    costoUnitario = precioVentaUnitario * 0.7;
                  }
                } catch (error) {
                  console.warn('Error obteniendo costo de producto:', detalle.producto_id);
                  costoUnitario = precioVentaUnitario * 0.7; // Fallback estimado
                }
              } else {
                // Sin producto_id, estimar 70%
                costoUnitario = precioVentaUnitario * 0.7;
              }
              
              const costoDetalle = costoUnitario * cantidadDetalle;
              const ventaDetalle = precioVentaUnitario * cantidadDetalle;
              const gananciaDetalle = ventaDetalle - costoDetalle;
              
              costoVenta += costoDetalle;
              gananciaVenta += gananciaDetalle;
              
              // Productos vendidos
              const prodId = detalle.producto_id || 'sin_id';
              if (!productosVendidos[prodId]) {
                productosVendidos[prodId] = {
                  id: prodId,
                  nombre: detalle.producto_info?.nombre || detalle.nombre || 'Producto',
                  codigo: detalle.producto_info?.codigo || detalle.codigo || '',
                  cantidad: 0,
                  total: 0
                };
              }
              productosVendidos[prodId].cantidad += cantidadDetalle;
              productosVendidos[prodId].total += ventaDetalle;
              
              // Categorías (por defecto General)
              const categoria = detalle.categoria || 'General';
              if (!ventasPorCategoria[categoria]) {
                ventasPorCategoria[categoria] = {
                  nombre: categoria,
                  total: 0,
                  cantidad: 0
                };
              }
              ventasPorCategoria[categoria].total += ventaDetalle;
              ventasPorCategoria[categoria].cantidad += cantidadDetalle;
            }
          }
          
          // Acumular ganancia total
          gananciaReal += gananciaVenta;
          costoTotal += costoVenta;
          
          // Actualizar ganancia por día
          ventasPorDia[fechaKey].ganancia = gananciaVenta;
          
          // Clientes
          if (venta.cliente_id) {
            if (!clientesVentas[venta.cliente_id]) {
              clientesVentas[venta.cliente_id] = {
                id: venta.cliente_id,
                nombre: venta.cliente_info?.nombre_completo || venta.cliente_nombre || 'Cliente',
                email: venta.cliente_info?.email || '',
                cantidad: 0,
                total: 0
              };
            }
            clientesVentas[venta.cliente_id].cantidad++;
            clientesVentas[venta.cliente_id].total += venta.total;
          }
        }
        
        // Convertir a arrays y ordenar
        const ventasPorPeriodoArray = Object.values(ventasPorDia)
          .sort((a, b) => a.fecha.localeCompare(b.fecha));
        
        const ventasPorCategoriaArray = Object.values(ventasPorCategoria)
          .map(cat => ({
            ...cat,
            porcentaje: totalVentas > 0 ? (cat.total / totalVentas) * 100 : 0
          }))
          .sort((a, b) => b.total - a.total);
        
        const ventasPorMetodoPagoArray = Object.values(ventasPorMetodoPago)
          .map(metodo => ({
            ...metodo,
            porcentaje: totalVentas > 0 ? (metodo.total / totalVentas) * 100 : 0
          }))
          .sort((a, b) => b.total - a.total);
        
        const productosDestacadosArray = Object.values(productosVendidos)
          .map(prod => ({
            ...prod,
            porcentaje: totalVentas > 0 ? (prod.total / totalVentas) * 100 : 0
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);
        
        const clientesDestacadosArray = Object.values(clientesVentas)
          .map(cliente => ({
            ...cliente,
            porcentaje: totalVentas > 0 ? (cliente.total / totalVentas) * 100 : 0
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);
        
        const ticketPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;
        
        console.log('📊 [REPORTES] Resumen final:', {
          totalVentas,
          cantidadVentas,
          gananciaReal,
          costoTotal,
          ventasPorPeriodo: ventasPorPeriodoArray.length,
          productosDestacados: productosDestacadosArray.length
        });
        
        res.json({
          resumen: {
            totalVentas,
            cantidadVentas,
            ticketPromedio,
            unidadesVendidas,
            ganancia: gananciaReal, // ✅ GANANCIA REAL
            descuentos,
            ventasCanceladas: 0,
            cantidadCanceladas: 0,
            costoTotal: costoTotal, // ✅ COSTO TOTAL REAL
            margenPromedio: totalVentas > 0 ? (gananciaReal / totalVentas) * 100 : 0 // ✅ MARGEN REAL
          },
          ventasPorPeriodo: ventasPorPeriodoArray,
          ventasPorCategoria: ventasPorCategoriaArray,
          ventasPorMetodoPago: ventasPorMetodoPagoArray,
          productosDestacados: productosDestacadosArray,
          clientesDestacados: clientesDestacadosArray
        });
        
        return true;
        
      } catch (error) {
        console.error('❌ Error en reporte ventas:', error);
        res.status(500).json({ error: error.message });
        return true;
      }
    }
    
    // ==================== DASHBOARD CORREGIDO ====================
    if (path === '/reportes/dashboard' && req.method === 'GET') {
      try {
        const { sucursal_id } = req.query;
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const mañana = new Date(hoy);
        mañana.setDate(mañana.getDate() + 1);
        
        // ✅ CORRECCIÓN 5: Query de ventas del día REAL
        let ventasQuery = db.collection('ventas');
        
        if (sucursal_id) {
          ventasQuery = ventasQuery.where('sucursal_id', '==', sucursal_id);
        }
        
        const ventasSnapshot = await ventasQuery.get();
        
        let ventasHoy = 0;
        let gananciasHoy = 0;
        let cantidadVentasHoy = 0;
        const productosVendidos = {};
        const clientesCompras = {};
        
        // ✅ CORRECCIÓN 6: Recolectar IDs de productos para búsqueda en batch
        const productosIds = new Set();
        const ventasHoyArray = [];
        
        ventasSnapshot.forEach(doc => {
          const venta = doc.data();
          
          // Verificar si es de hoy
          let fechaVenta;
          if (venta.fecha && typeof venta.fecha === 'string') {
            fechaVenta = new Date(venta.fecha);
          } else if (venta.fecha && venta.fecha.toDate) {
            fechaVenta = venta.fecha.toDate();
          } else {
            return;
          }
          
          // Solo ventas de HOY y completadas
          if (fechaVenta >= hoy && fechaVenta < mañana && venta.estado === 'completada') {
            ventasHoyArray.push({ id: doc.id, ...venta });
            
            // Recolectar IDs de productos
            if (venta.detalles && Array.isArray(venta.detalles)) {
              venta.detalles.forEach(detalle => {
                if (detalle.producto_id) {
                  productosIds.add(detalle.producto_id);
                }
              });
            }
          }
        });
        
        // ✅ CORRECCIÓN 7: Buscar todos los productos de una vez
        const productosMap = {};
        if (productosIds.size > 0) {
          const idsArray = Array.from(productosIds);
          
          // Firestore limita las consultas 'in' a 10 elementos
          for (let i = 0; i < idsArray.length; i += 10) {
            const batch = idsArray.slice(i, i + 10);
            const productosQuery = await db.collection('productos')
              .where(admin.firestore.FieldPath.documentId(), 'in', batch)
              .get();
            
            productosQuery.forEach(doc => {
              productosMap[doc.id] = doc.data();
            });
          }
        }
        
        // ✅ CORRECCIÓN 8: Procesar ventas con costos reales
        for (const venta of ventasHoyArray) {
          ventasHoy += venta.total || 0;
          cantidadVentasHoy++;
          
          let gananciaVenta = 0;
          
          // Procesar productos
          if (venta.detalles && Array.isArray(venta.detalles)) {
            for (const detalle of venta.detalles) {
              const cantidadDetalle = parseInt(detalle.cantidad || 0);
              const precioVentaUnitario = parseFloat(detalle.precio_unitario || 0);
              const totalDetalle = cantidadDetalle * precioVentaUnitario;
              
              // Obtener costo del producto
              let costoUnitario = precioVentaUnitario * 0.7; // Default 30% margen
              const producto = productosMap[detalle.producto_id];
              if (producto && producto.precio_costo) {
                costoUnitario = parseFloat(producto.precio_costo);
              }
              
              const costoDetalle = costoUnitario * cantidadDetalle;
              gananciaVenta += (totalDetalle - costoDetalle);
              
              // Acumular productos vendidos
              if (!productosVendidos[detalle.producto_id]) {
                productosVendidos[detalle.producto_id] = {
                  id: detalle.producto_id,
                  nombre: producto?.nombre || detalle.producto_info?.nombre || detalle.nombre || 'Producto',
                  codigo: producto?.codigo || detalle.producto_info?.codigo || detalle.codigo || '',
                  cantidad: 0,
                  total: 0,
                  precio_venta: precioVentaUnitario
                };
              }
              productosVendidos[detalle.producto_id].cantidad += cantidadDetalle;
              productosVendidos[detalle.producto_id].total += totalDetalle;
            }
          }
          
          gananciasHoy += gananciaVenta;
          
          // Procesar clientes
          if (venta.cliente_id) {
            if (!clientesCompras[venta.cliente_id]) {
              clientesCompras[venta.cliente_id] = {
                id: venta.cliente_id,
                nombre: venta.cliente_info?.nombre || 'Cliente',
                apellido: venta.cliente_info?.apellido || '',
                email: venta.cliente_info?.email || '',
                compras: 0,
                total: 0
              };
            }
            clientesCompras[venta.cliente_id].compras++;
            clientesCompras[venta.cliente_id].total += venta.total;
          }
        }
        
        const productosDestacados = Object.values(productosVendidos)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        
        const clientesDestacados = Object.values(clientesCompras)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        
        console.log('📊 [DASHBOARD] Datos de hoy:', {
          ventasHoy,
          cantidadVentasHoy,
          gananciasHoy,
          productosDestacados: productosDestacados.length
        });
        
        res.json({
          ventasHoy,
          cantidadVentasHoy, // ✅ NUEVO
          gananciasHoy,
          productosDestacados,
          clientesDestacados
        });
        
        return true;
        
      } catch (error) {
        console.error('❌ Error en dashboard:', error);
        res.status(500).json({ error: error.message });
        return true;
      }
    }
    
    // ==================== REPORTE DE GANANCIAS CORREGIDO ====================
    if (path === '/reportes/ganancias' && req.method === 'GET') {
      try {
        const { fechaInicio, fechaFin, agrupacion = 'dia' } = req.query;
        
        console.log('📊 [REPORTES GANANCIAS] Params:', { fechaInicio, fechaFin, agrupacion });
        
        if (!fechaInicio || !fechaFin) {
          res.status(400).json({ error: 'Fechas requeridas' });
          return true;
        }
        
        const fechaInicioDate = new Date(fechaInicio);
        fechaInicioDate.setHours(0, 0, 0, 0);
        
        const fechaFinDate = new Date(fechaFin);
        fechaFinDate.setHours(23, 59, 59, 999);
        
        // Obtener todas las ventas completadas en el período
        let ventasQuery = db.collection('ventas');
        const ventasSnapshot = await ventasQuery.get();
        
        // Filtrar ventas en el rango de fechas y completadas
        const ventasFiltradas = [];
        ventasSnapshot.forEach(doc => {
          const venta = doc.data();
          const fechaVenta = new Date(venta.fecha);
          
          if (fechaVenta >= fechaInicioDate && 
              fechaVenta <= fechaFinDate && 
              venta.estado === 'completada') {
            ventasFiltradas.push({
              id: doc.id,
              ...venta
            });
          }
        });
        
        console.log(`📊 [GANANCIAS] ${ventasFiltradas.length} ventas encontradas en el período`);
        
        // Variables para el resumen
        let ventasTotal = 0;
        let costoTotalGeneral = 0;
        let gananciaBruta = 0;
        
        // Estructuras para agrupaciones
        const evolucionPorPeriodo = {};
        const gananciasPorCategoria = {};
        const productosVendidos = {};
        const clientesCompras = {};
        
        // Obtener información de productos para costos
        const productosSnapshot = await db.collection('productos').get();
        const productosMap = {};
        productosSnapshot.forEach(doc => {
          productosMap[doc.id] = doc.data();
        });
        
        // Procesar cada venta
        for (const venta of ventasFiltradas) {
          const totalVenta = parseFloat(venta.total || 0);
          ventasTotal += totalVenta;
          
          let costoVenta = 0;
          let gananciaVenta = 0;
          
          // Procesar detalles de la venta
          if (venta.detalles && Array.isArray(venta.detalles)) {
            for (const detalle of venta.detalles) {
              const cantidad = parseInt(detalle.cantidad || 0);
              const precioVenta = parseFloat(detalle.precio_unitario || 0);
              const subtotalVenta = cantidad * precioVenta;
              
              // Obtener costo del producto
              let costoUnitario = 0;
              const producto = productosMap[detalle.producto_id];
              if (producto) {
                // Usar precio_costo si existe, si no, estimar un 70% del precio de venta
                costoUnitario = parseFloat(producto.precio_costo || (precioVenta * 0.7));
              } else {
                // Si no encontramos el producto, estimamos 70% del precio de venta
                costoUnitario = precioVenta * 0.7;
              }
              
              const costoDetalle = cantidad * costoUnitario;
              const gananciaDetalle = subtotalVenta - costoDetalle;
              
              costoVenta += costoDetalle;
              gananciaVenta += gananciaDetalle;
              
              // Acumular por producto
              const productoId = detalle.producto_id;
              if (!productosVendidos[productoId]) {
                productosVendidos[productoId] = {
                  id: productoId,
                  nombre: detalle.producto_info?.nombre || producto?.nombre || 'Producto sin nombre',
                  codigo: detalle.producto_info?.codigo || producto?.codigo || '',
                  unidades_vendidas: 0,
                  ventas_total: 0,
                  costo_total: 0,
                  ganancia: 0,
                  margen: 0
                };
              }
              
              productosVendidos[productoId].unidades_vendidas += cantidad;
              productosVendidos[productoId].ventas_total += subtotalVenta;
              productosVendidos[productoId].costo_total += costoDetalle;
              productosVendidos[productoId].ganancia += gananciaDetalle;
              
              // Acumular por categoría
              const categoriaId = producto?.categoria_id || 'general';
              const categoriaNombre = 'General'; // Simplificado por ahora
              
              if (!gananciasPorCategoria[categoriaId]) {
                gananciasPorCategoria[categoriaId] = {
                  categoria: categoriaNombre,
                  ventas_total: 0,
                  costo_total: 0,
                  ganancia: 0,
                  margen: 0
                };
              }
              
              gananciasPorCategoria[categoriaId].ventas_total += subtotalVenta;
              gananciasPorCategoria[categoriaId].costo_total += costoDetalle;
              gananciasPorCategoria[categoriaId].ganancia += gananciaDetalle;
            }
          }
          
          costoTotalGeneral += costoVenta; // ✅ CORRECCIÓN: Era costoTotalGeneral += costoTotalGeneral
          gananciaBruta += gananciaVenta;
          
          // Agrupar por período
          const fechaVenta = new Date(venta.fecha);
          let periodoKey = '';
          
          if (agrupacion === 'dia') {
            periodoKey = fechaVenta.toISOString().split('T')[0];
          } else if (agrupacion === 'semana') {
            const inicioSemana = new Date(fechaVenta);
            inicioSemana.setDate(fechaVenta.getDate() - fechaVenta.getDay());
            periodoKey = inicioSemana.toISOString().split('T')[0];
          } else if (agrupacion === 'mes') {
            periodoKey = `${fechaVenta.getFullYear()}-${String(fechaVenta.getMonth() + 1).padStart(2, '0')}`;
          }
          
          if (!evolucionPorPeriodo[periodoKey]) {
            evolucionPorPeriodo[periodoKey] = {
              periodo: periodoKey,
              ventas_total: 0,
              costo_total: 0,
              ganancia: 0
            };
          }
          
          evolucionPorPeriodo[periodoKey].ventas_total += totalVenta;
          evolucionPorPeriodo[periodoKey].costo_total += costoVenta;
          evolucionPorPeriodo[periodoKey].ganancia += gananciaVenta;
          
          // Acumular por cliente
          if (venta.cliente_id) {
            if (!clientesCompras[venta.cliente_id]) {
              clientesCompras[venta.cliente_id] = {
                cliente: venta.cliente_info?.nombre_completo || venta.cliente_nombre || 'Cliente sin nombre',
                total_compras: 0,
                monto_total: 0
              };
            }
            
            clientesCompras[venta.cliente_id].total_compras++;
            clientesCompras[venta.cliente_id].monto_total += totalVenta;
          }
        }
        
        // Calcular márgenes para productos
        Object.values(productosVendidos).forEach(producto => {
          if (producto.ventas_total > 0) {
            producto.margen = (producto.ganancia / producto.ventas_total) * 100;
          }
        });
        
        // Calcular márgenes para categorías
        Object.values(gananciasPorCategoria).forEach(categoria => {
          if (categoria.ventas_total > 0) {
            categoria.margen = (categoria.ganancia / categoria.ventas_total) * 100;
          }
        });
        
        // Convertir objetos a arrays y ordenar
        const evolucionGanancias = Object.values(evolucionPorPeriodo)
          .sort((a, b) => a.periodo.localeCompare(b.periodo));
        
        const gananciasPorCategoriaArray = Object.values(gananciasPorCategoria)
          .sort((a, b) => b.ganancia - a.ganancia);
        
        const topProductosPorGanancia = Object.values(productosVendidos)
          .sort((a, b) => b.ganancia - a.ganancia)
          .slice(0, 10);
        
        const productosMasVendidos = Object.values(productosVendidos)
          .sort((a, b) => b.unidades_vendidas - a.unidades_vendidas)
          .slice(0, 10);
        
        const productosMenosVendidos = Object.values(productosVendidos)
          .sort((a, b) => a.unidades_vendidas - b.unidades_vendidas)
          .slice(0, 10);
        
        const mejoresClientes = Object.values(clientesCompras)
          .sort((a, b) => b.monto_total - a.monto_total)
          .slice(0, 10);
        
        // Construir respuesta
        const respuesta = {
          resumen: {
            ventas_total: ventasTotal,
            costo_total: costoTotalGeneral,
            ganancia_bruta: gananciaBruta
          },
          evolucionGanancias,
          gananciasPorCategoria: gananciasPorCategoriaArray,
          topProductosPorGanancia,
          productosMasVendidos,
          mejoresClientes,
          productosMenosVendidos
        };
        
        console.log('📊 [GANANCIAS] Resumen:', {
          ventas: ventasTotal,
          costos: costoTotalGeneral,
          ganancia: gananciaBruta,
          margen: ventasTotal > 0 ? ((gananciaBruta / ventasTotal) * 100).toFixed(2) + '%' : '0%'
        });
        
        res.json(respuesta);
        
        return true;
        
      } catch (error) {
        console.error('❌ Error en reporte ganancias:', error);
        res.status(500).json({ error: error.message });
        return true;
      }
    }
    
    // Agregar más rutas aquí si es necesario...
    
    // Si no coincide ninguna ruta
    return false;
    
  } catch (error) {
    console.error('❌ Error general en reportes:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
    return true;
  }
};