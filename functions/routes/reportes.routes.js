// functions/routes/reportes.routes.js - VERSIÓN CORREGIDA
const admin = require('firebase-admin');
const db = admin.firestore();

function fechaDocumento(data) {
  const raw = data?.fecha || data?.fechaCreacion || data?.created_at || data?.fechaActualizacion;
  if (!raw) return null;
  if (typeof raw === 'string') {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (raw.toDate) return raw.toDate();
  return null;
}

async function obtenerProductosEmpresa(companyId) {
  const productosMap = {};
  if (companyId) {
    const tenantSnap = await db.collection('companies').doc(companyId).collection('productos').get();
    tenantSnap.forEach(doc => {
      productosMap[doc.id] = doc.data();
    });
  }
  const globalSnap = await db.collection('productos').get();
  globalSnap.forEach(doc => {
    const data = doc.data();
    if (!companyId || !data.orgId || data.orgId === companyId) {
      productosMap[doc.id] = productosMap[doc.id] || data;
    }
  });
  return productosMap;
}

async function obtenerProveedoresEmpresa(companyId) {
  const proveedoresMap = {};
  if (companyId) {
    const tenantSnap = await db.collection('companies').doc(companyId).collection('proveedores').get();
    tenantSnap.forEach((doc) => {
      proveedoresMap[doc.id] = doc.data();
    });
  }
  const globalSnap = await db.collection('proveedores').get();
  globalSnap.forEach((doc) => {
    const data = doc.data();
    if (!companyId || !data.orgId || data.orgId === companyId) {
      proveedoresMap[doc.id] = proveedoresMap[doc.id] || data;
    }
  });
  return proveedoresMap;
}

function resolverNombreProveedor(compra, proveedoresMap) {
  const proveedorId = compra?.proveedor_id || null;
  const proveedor = proveedorId ? proveedoresMap?.[proveedorId] : null;
  return (
    compra?.proveedor_info?.nombre ||
    compra?.proveedor_nombre ||
    compra?.proveedor ||
    proveedor?.nombre ||
    (proveedorId ? `Proveedor ${proveedorId}` : 'Sin proveedor')
  );
}

function resolverTotalCompra(compra) {
  const posibles = [
    compra?.total,
    compra?.total_general,
    compra?.monto_total,
    compra?.importe_total,
    compra?.subtotal
  ];
  for (const v of posibles) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }

  if (Array.isArray(compra?.detalles) && compra.detalles.length > 0) {
    return compra.detalles.reduce((acc, det) => {
      const cantidad = Number(det?.cantidad) || 0;
      const costo = Number(det?.costo ?? det?.precio_unitario ?? det?.precio ?? 0) || 0;
      return acc + (cantidad * costo);
    }, 0);
  }

  return 0;
}

module.exports = async function reportesRoutes(req, res, path) {
  console.log('📊 [REPORTES] Ruta:', path);
  
  try {
    // Multi-tenant: obtener companyId
    const companyId = req.companyId || req.user?.companyId || req.query?.orgId || null;
    // ==================== REPORTE DE VENTAS CORREGIDO ====================
    if (path === '/reportes/ventas' && req.method === 'GET') {
      try {
        const { fechaInicio, fechaFin, sucursal_id, estado, proveedor_id } = req.query;
        
        console.log('📊 [REPORTES VENTAS] Params:', { fechaInicio, fechaFin, sucursal_id });
        
        if (!fechaInicio || !fechaFin) {
          res.status(400).json({ error: 'Fechas requeridas' });
          return true;
        }
        
        // ✅ CORRECCIÓN 1: Query sin filtros de fecha (filtrar en memoria)
        let ventasQuery = companyId ? db.collection('companies').doc(companyId).collection('ventas') : db.collection('ventas');
        
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
        let ventasQuery = companyId ? db.collection('companies').doc(companyId).collection('ventas') : db.collection('ventas');
        
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
          
          // Fecha efectiva: campo fecha o fechaCreacion (misma lógica admin / cajero)
          let fechaVenta = null;
          if (venta.fecha && typeof venta.fecha === 'string') {
            fechaVenta = new Date(venta.fecha);
          } else if (venta.fecha && venta.fecha.toDate) {
            fechaVenta = venta.fecha.toDate();
          } else if (venta.fechaCreacion && venta.fechaCreacion.toDate) {
            fechaVenta = venta.fechaCreacion.toDate();
          }
          if (!fechaVenta || Number.isNaN(fechaVenta.getTime())) {
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
          const productosCol = companyId
            ? db.collection('companies').doc(companyId).collection('productos')
            : db.collection('productos');
          for (let i = 0; i < idsArray.length; i += 10) {
            const batch = idsArray.slice(i, i + 10);
            const productosQuery = await productosCol
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
        let ventasQuery = companyId ? db.collection('companies').doc(companyId).collection('ventas') : db.collection('ventas');
        const ventasSnapshot = await ventasQuery.get();
        
        // Filtrar ventas en el rango de fechas y estados que representan venta realizada
        const estadosVentaRealizada = new Set(['completada', 'entregado', 'finalizada']);
        const ventasFiltradas = [];
        ventasSnapshot.forEach(doc => {
          const venta = doc.data();
          const fechaVenta = fechaDocumento(venta);
          if (!fechaVenta) return;
          
          if (fechaVenta >= fechaInicioDate && 
              fechaVenta <= fechaFinDate && 
              estadosVentaRealizada.has(String(venta.estado || '').toLowerCase())) {
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
        
        // Obtener información de productos para costos desde el tenant y legacy compatible.
        const productosMap = await obtenerProductosEmpresa(companyId);
        
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
    
    // ==================== REPORTE DE COMPRAS ====================
    if (path === '/reportes/compras' && req.method === 'GET') {
      try {
        const { fechaInicio, fechaFin, sucursal_id, estado, proveedor_id } = req.query;
        if (!fechaInicio || !fechaFin) {
          res.status(400).json({ error: 'Fechas requeridas' });
          return true;
        }

        let comprasQuery = companyId ? db.collection('companies').doc(companyId).collection('compras') : db.collection('compras');
        if (sucursal_id) {
          comprasQuery = comprasQuery.where('sucursal_id', '==', sucursal_id);
        }
        const comprasSnap = await comprasQuery.get();

        const fIni = new Date(fechaInicio); fIni.setHours(0,0,0,0);
        const fFin = new Date(fechaFin); fFin.setHours(23,59,59,999);

        const compras = [];
        const proveedoresMap = await obtenerProveedoresEmpresa(companyId);
        comprasSnap.forEach(d => {
          const c = d.data();
          let fecha = fechaDocumento(c);
          if (!fecha) return;
          if (estado && String(c.estado || '').toLowerCase() !== String(estado).toLowerCase()) return;
          if (proveedor_id && c.proveedor_id !== proveedor_id) return;
          if (fecha >= fIni && fecha <= fFin) {
            compras.push({ id: d.id, ...c, fechaISO: fecha.toISOString() });
          }
        });

        let total = 0; let cantidad = 0; let proveedoresUnicos = new Set(); let productosUnicos = new Set(); let unidades = 0; let pendientes = 0; let pendientePago = 0;
        const comprasPorDia = {};
        const comprasPorProveedor = {};
        const productosMasComprados = {};

        for (const compra of compras) {
          const t = resolverTotalCompra(compra);
          total += t; cantidad++;
          if (compra.proveedor_id) proveedoresUnicos.add(compra.proveedor_id);
          const fechaKey = compra.fechaISO.split('T')[0];
          if (!comprasPorDia[fechaKey]) comprasPorDia[fechaKey] = { fecha: fechaKey, total: 0, cantidad: 0 };
          comprasPorDia[fechaKey].total += t; comprasPorDia[fechaKey].cantidad++;
          const provKey = compra.proveedor_id || 'sin_proveedor';
          if (!comprasPorProveedor[provKey]) comprasPorProveedor[provKey] = {
            proveedor_id: provKey,
            nombre: resolverNombreProveedor(compra, proveedoresMap),
            total: 0,
            cantidad: 0
          };
          comprasPorProveedor[provKey].total += t; comprasPorProveedor[provKey].cantidad++;
          if (Array.isArray(compra.detalles)) {
            for (const det of compra.detalles) {
              const pid = det.producto_id || 'sin_id';
              productosUnicos.add(pid);
              const cant = parseFloat(det.cantidad || 0) || 0; unidades += cant;
              const subtotal = cant * parseFloat(det.precio_unitario || det.costo || 0);
              if (!productosMasComprados[pid]) productosMasComprados[pid] = { id: pid, nombre: det.producto_info?.nombre || det.nombre || 'Producto', cantidad: 0, total: 0 };
              productosMasComprados[pid].cantidad += cant;
              productosMasComprados[pid].total += subtotal;
            }
          }
          if ((compra.estado || '').toLowerCase() === 'pendiente') pendientes++;
          if ((compra.estado_pago || 'pendiente') === 'pendiente') pendientePago += t;
        }

        const comprasPorDiaArr = Object.values(comprasPorDia).sort((a,b)=>a.fecha.localeCompare(b.fecha));
        const comprasPorProveedorArr = Object.values(comprasPorProveedor).sort((a,b)=>b.total-a.total);
        const productosMasCompradosArr = Object.values(productosMasComprados).sort((a,b)=>b.cantidad-a.cantidad).slice(0,20);

        res.json({
          resumen: {
            total,
            cantidad_compras: cantidad,
            proveedores_unicos: proveedoresUnicos.size,
            productos_unicos: productosUnicos.size,
            unidades_compradas: unidades,
            compras_pendientes: pendientes,
            pendiente_pago: pendientePago
          },
          comprasPorDia: comprasPorDiaArr,
          comprasPorProveedor: comprasPorProveedorArr,
          productosMasComprados: productosMasCompradosArr
        });
        return true;
      } catch (error) {
        console.error('❌ Error en reporte compras:', error);
        res.status(500).json({ error: error.message });
        return true;
      }
    }

    // ==================== VARIANTES: compras/por-dia, compras/por-proveedor, compras/productos-mas-comprados ====================
    if (path === '/reportes/compras/por-dia' && req.method === 'GET') {
      try {
        const { fechaInicio, fechaFin, sucursal_id, estado, proveedor_id } = req.query;
        if (!fechaInicio || !fechaFin) { res.status(400).json({ error:'Fechas requeridas' }); return true; }
        let comprasQuery = companyId ? db.collection('companies').doc(companyId).collection('compras') : db.collection('compras');
        if (sucursal_id) comprasQuery = comprasQuery.where('sucursal_id','==',sucursal_id);
        const snap = await comprasQuery.get();
        const fIni = new Date(fechaInicio); fIni.setHours(0,0,0,0);
        const fFin = new Date(fechaFin); fFin.setHours(23,59,59,999);
        const porDia = {};
        snap.forEach(d=>{
          const c = d.data();
          let fecha = fechaDocumento(c);
          if (!fecha) return; if (fecha < fIni || fecha > fFin) return;
          if (estado && String(c.estado || '').toLowerCase() !== String(estado).toLowerCase()) return;
          if (proveedor_id && c.proveedor_id !== proveedor_id) return;
          const key = fecha.toISOString().split('T')[0];
          if (!porDia[key]) porDia[key] = { fecha:key, total:0, cantidad:0 };
          const t = resolverTotalCompra(c);
          porDia[key].total += t; porDia[key].cantidad++;
        });
        res.json(Object.values(porDia).sort((a,b)=>a.fecha.localeCompare(b.fecha)));
        return true;
      } catch (e) { res.status(500).json({ error:e.message }); return true; }
    }
    if (path === '/reportes/compras/por-proveedor' && req.method === 'GET') {
      try {
        const { fechaInicio, fechaFin, sucursal_id, estado, proveedor_id } = req.query;
        if (!fechaInicio || !fechaFin) { res.status(400).json({ error:'Fechas requeridas' }); return true; }
        let comprasQuery = companyId ? db.collection('companies').doc(companyId).collection('compras') : db.collection('compras');
        if (sucursal_id) comprasQuery = comprasQuery.where('sucursal_id','==',sucursal_id);
        const snap = await comprasQuery.get();
        const fIni = new Date(fechaInicio); fIni.setHours(0,0,0,0);
        const fFin = new Date(fechaFin); fFin.setHours(23,59,59,999);
        const porProv = {};
        const proveedoresMap = await obtenerProveedoresEmpresa(companyId);
        snap.forEach(d=>{
          const c = d.data();
          let fecha = fechaDocumento(c);
          if (!fecha) return; if (fecha < fIni || fecha > fFin) return;
          if (estado && String(c.estado || '').toLowerCase() !== String(estado).toLowerCase()) return;
          if (proveedor_id && c.proveedor_id !== proveedor_id) return;
          const key = c.proveedor_id || 'sin_proveedor';
          if (!porProv[key]) porProv[key] = {
            proveedor_id: key,
            nombre: resolverNombreProveedor(c, proveedoresMap),
            total: 0,
            cantidad: 0
          };
          const t = resolverTotalCompra(c);
          porProv[key].total += t; porProv[key].cantidad++;
        });
        const arr = Object.values(porProv).map(x=>({ ...x, porcentaje: 0 })).sort((a,b)=>b.total-a.total);
        const sum = arr.reduce((acc,x)=>acc+x.total,0) || 1;
        arr.forEach(x=> x.porcentaje = (x.total/sum)*100);
        res.json(arr);
        return true;
      } catch (e) { res.status(500).json({ error:e.message }); return true; }
    }
    if (path === '/reportes/compras/productos-mas-comprados' && req.method === 'GET') {
      try {
        const { fechaInicio, fechaFin, sucursal_id, estado, proveedor_id } = req.query;
        if (!fechaInicio || !fechaFin) { res.status(400).json({ error:'Fechas requeridas' }); return true; }
        let comprasQuery = companyId ? db.collection('companies').doc(companyId).collection('compras') : db.collection('compras');
        if (sucursal_id) comprasQuery = comprasQuery.where('sucursal_id','==',sucursal_id);
        const snap = await comprasQuery.get();
        const fIni = new Date(fechaInicio); fIni.setHours(0,0,0,0);
        const fFin = new Date(fechaFin); fFin.setHours(23,59,59,999);
        const productos = {};
        snap.forEach(d=>{
          const c = d.data();
          let fecha = fechaDocumento(c);
          if (!fecha) return; if (fecha < fIni || fecha > fFin) return;
          if (estado && String(c.estado || '').toLowerCase() !== String(estado).toLowerCase()) return;
          if (proveedor_id && c.proveedor_id !== proveedor_id) return;
          if (Array.isArray(c.detalles)) {
            c.detalles.forEach(det=>{
              const pid = det.producto_id || 'sin_id';
              const cant = parseFloat(det.cantidad||0)||0;
              const subtotal = cant * parseFloat(det.costo || det.precio_unitario || 0);
              if (!productos[pid]) productos[pid] = { id: pid, nombre: det.producto_info?.nombre || det.nombre || 'Producto', cantidad: 0, total: 0 };
              productos[pid].cantidad += cant; productos[pid].total += subtotal;
            });
          }
        });
        const arr = Object.values(productos).sort((a,b)=>b.cantidad-a.cantidad).slice(0,20);
        res.json(arr);
        return true;
      } catch (e) { res.status(500).json({ error:e.message }); return true; }
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