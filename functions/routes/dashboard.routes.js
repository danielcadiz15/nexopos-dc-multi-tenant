// functions/routes/dashboard.routes.js
const admin = require('firebase-admin');
const db = admin.firestore();

// Función para manejar todas las rutas del dashboard
const dashboardRoutes = async (req, res, path) => {
  try {
    const companyId = req.companyId || req.user?.companyId || null;
    
    // DASHBOARD - Estadísticas generales
    if (path === '/dashboard' && req.method === 'GET') {
      // Construir queries con filtro multi-tenant
      const queries = [
        companyId ? db.collection('productos').where('orgId', '==', companyId) : db.collection('productos'),
        companyId ? db.collection('categorias').where('orgId', '==', companyId) : db.collection('categorias'),
        companyId ? db.collection('clientes').where('orgId', '==', companyId) : db.collection('clientes'),
        companyId ? db.collection('compras').where('orgId', '==', companyId) : db.collection('compras'),
        companyId ? db.collection('proveedores').where('orgId', '==', companyId) : db.collection('proveedores'),
        companyId ? db.collection('ventas').where('orgId', '==', companyId) : db.collection('ventas')
      ];
      
      const [productos, categorias, clientes, compras, proveedores, ventas] = await Promise.all(queries.map(q => q.get()));
      
      let productosActivosQuery = db.collection('productos').where('activo', '==', true);
      if (companyId) productosActivosQuery = productosActivosQuery.where('orgId', '==', companyId);
      const productosActivos = await productosActivosQuery.get();
      
      // Estadísticas de ventas del día
      const hoy = new Date();
      const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
      const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
      
      let ventasHoyQuery = db.collection('ventas')
        .where('fecha', '>=', inicioHoy.toISOString())
        .where('fecha', '<', finHoy.toISOString());
      if (companyId) ventasHoyQuery = ventasHoyQuery.where('orgId', '==', companyId);
      const ventasHoySnapshot = await ventasHoyQuery
        .get();
      
      let ventasHoy = 0;
      let gananciasHoy = 0;
      
      ventasHoySnapshot.forEach(doc => {
        const venta = doc.data();
        ventasHoy += venta.total || 0;
        gananciasHoy += (venta.ganancia || venta.total * 0.2 || 0);
      });
      
      // Productos con stock bajo
      const productosStockBajoSnapshot = await db.collection('productos')
        .where('stock_actual', '<=', 5)
        .get();
      
      // Productos más vendidos (últimos 30 días)
      const hace30Dias = new Date();
      hace30Dias.setDate(hace30Dias.getDate() - 30);
      
      const ventasRecientesSnapshot = await db.collection('ventas')
        .where('fecha', '>=', hace30Dias.toISOString())
        .get();
      
      const productosVendidos = {};
      
      ventasRecientesSnapshot.forEach(doc => {
        const venta = doc.data();
        if (venta.detalles && Array.isArray(venta.detalles)) {
          venta.detalles.forEach(detalle => {
            const productoId = detalle.producto_id;
            if (productoId) {
              productosVendidos[productoId] = (productosVendidos[productoId] || 0) + parseInt(detalle.cantidad || 0);
            }
          });
        }
      });
      
      // Convertir a array y ordenar
      const topProductos = Object.entries(productosVendidos)
        .map(([id, cantidad]) => ({ id, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);
      
      // Clientes más frecuentes
      const clientesVentas = {};
      
      ventas.forEach(doc => {
        const venta = doc.data();
        if (venta.cliente_id) {
          clientesVentas[venta.cliente_id] = (clientesVentas[venta.cliente_id] || 0) + 1;
        }
      });
      
      // Convertir a array y ordenar
      const topClientes = Object.entries(clientesVentas)
        .map(([id, cantidad]) => ({ id, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);
      
      const dashboardData = {
        totalProductos: productos.size,
        productosActivos: productosActivos.size,
        totalCategorias: categorias.size,
        totalClientes: clientes.size,
        totalCompras: compras.size,
        totalProveedores: proveedores.size,
        totalVentas: ventas.size,
        ventasHoy: ventasHoySnapshot.size,
        totalVentasHoy: ventasHoy,
        gananciasHoy: gananciasHoy,
        productosStockBajo: productosStockBajoSnapshot.size,
        productosDestacados: topProductos,
        clientesDestacados: topClientes
      };
      
      console.log(`✅ Dashboard data:`, dashboardData);
      
      res.json({
        success: true,
        data: dashboardData,
        message: 'Datos del dashboard obtenidos correctamente'
      });
      return true;
    }
    
    // Si ninguna ruta coincide, devolver false
    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = dashboardRoutes;