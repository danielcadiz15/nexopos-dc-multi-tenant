// functions/routes/productos.routes.js - ARCHIVO COMPLETO CORREGIDO
const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * Función auxiliar para validar un producto
 */
function validarProducto(producto, validarPrecios = true) {
  const errores = [];
  
  // Validaciones obligatorias
  if (!producto.nombre || producto.nombre.trim().length === 0) {
    errores.push('Nombre es obligatorio');
  }
  
  if (validarPrecios) {
    // Validaciones de precios
    if (producto.precio_costo < 0) {
      errores.push('Precio de costo no puede ser negativo');
    }
    
    if (producto.precio_venta <= 0) {
      errores.push('Precio de venta debe ser mayor a 0');
    }
    
    if (producto.precio_venta < producto.precio_costo) {
      errores.push('Precio de venta debe ser mayor o igual al costo');
    }
  }
  
  // Validaciones de stock
  if (producto.stock_inicial < 0) {
    errores.push('Stock inicial no puede ser negativo');
  }
  
  return {
    valido: errores.length === 0,
    errores
  };
}

// Función para manejar todas las rutas de productos
const productosRoutes = async (req, res, path) => {
  try {
    const companyId = req.companyId || req.user?.companyId || null;
    if (path === '/productos' && req.method === 'GET') {
      let query = db.collection('productos');
      
      // Filtrar por companyId si está disponible
      if (companyId) {
        query = query.where('orgId', '==', companyId);
        console.log(`🔍 [MULTI-TENANT] Filtrando productos por companyId: ${companyId}`);
      } else {
        console.log('⚠️ [MULTI-TENANT] No hay companyId, mostrando todos los productos');
      }
      
      const productosSnapshot = await query.get();
      const productos = [];
      
      productosSnapshot.forEach(doc => {
        const data = doc.data();
        productos.push({
          id: doc.id,
          ...data,
          // Asegurar campos numéricos
          precio_venta: parseFloat(data.precio_venta || 0),
          precio_costo: parseFloat(data.precio_costo || 0),
          stock_actual: parseInt(data.stock_actual || data.stock?.cantidad || 0),
          stock_minimo: parseInt(data.stock_minimo || 5),
          unidad_medida: data.unidad_medida || 'unidad'
        });
      });
      
      console.log(`✅ Productos encontrados: ${productos.length}`);
      
      res.json({
        success: true,
        data: productos,
        total: productos.length,
        message: 'Productos obtenidos correctamente'
      });
      return true;
    }
    
    // PRODUCTOS - GET solo activos
    else if (path === '/productos/activos' && req.method === 'GET') {
      let query = db.collection('productos').where('activo', '==', true);
      
      // Filtrar por companyId si está disponible
      if (companyId) {
        query = query.where('orgId', '==', companyId);
        console.log(`🔍 [MULTI-TENANT] Obteniendo productos activos por companyId: ${companyId}`);
      }
      
      const productosSnapshot = await query.get();
      
      const productos = [];
      productosSnapshot.forEach(doc => {
        const data = doc.data();
        productos.push({
          id: doc.id,
          ...data,
          precio_venta: parseFloat(data.precio_venta || 0),
          precio_costo: parseFloat(data.precio_costo || 0),
          stock_actual: parseInt(data.stock_actual || data.stock?.cantidad || 0),
          stock_minimo: parseInt(data.stock_minimo || 5),
          unidad_medida: data.unidad_medida || 'unidad'
        });
      });
      
      res.json({
        success: true,
        data: productos,
        total: productos.length,
        message: 'Productos activos obtenidos correctamente'
      });
      return true;
    }
    
    // PRODUCTOS - Búsqueda (CRÍTICO para PuntoVenta)
    else if (path === '/productos/buscar' && req.method === 'GET') {
      const termino = req.query.termino;
      
      if (!termino) {
        // Devolver todos los productos si no hay término
        let query = db.collection('productos');
        
        // Filtrar por companyId si está disponible
        if (companyId) {
          query = query.where('orgId', '==', companyId);
          console.log(`🔍 [MULTI-TENANT] Buscando productos por companyId: ${companyId}`);
        }
        
        const productosSnapshot = await query.get();
        const productos = [];
        
        productosSnapshot.forEach(doc => {
          const data = doc.data();
          productos.push({
            id: doc.id,
            ...data,
            precio_venta: parseFloat(data.precio_venta || 0),
            stock_actual: parseInt(data.stock_actual || data.stock?.cantidad || 0),
            unidad_medida: data.unidad_medida || 'unidad'
          });
        });
        
        res.json({
          success: true,
          data: productos,
          message: 'Todos los productos obtenidos'
        });
        return true;
      }
      
      // Búsqueda flexible - por nombre, código, o código de barras
      let query = db.collection('productos');
      if (companyId) {
        query = query.where('orgId', '==', companyId);
        console.log(`🔍 [MULTI-TENANT] Filtrando productos por companyId: ${companyId}`);
      }
      const productosSnapshot = await query.get();
      const productos = [];
      const terminoLower = termino.toLowerCase();
      
      productosSnapshot.forEach(doc => {
        const data = doc.data();
        const nombre = (data.nombre || '').toLowerCase();
        const codigo = (data.codigo || '').toLowerCase();
        const codigoBarras = (data.codigo_barras || '').toLowerCase();
        
        // Búsqueda flexible
        if (nombre.includes(terminoLower) || 
            codigo.includes(terminoLower) || 
            codigoBarras.includes(terminoLower)) {
          productos.push({
            id: doc.id,
            ...data,
            precio_venta: parseFloat(data.precio_venta || 0),
            precio_costo: parseFloat(data.precio_costo || 0),
            stock_actual: parseInt(data.stock_actual || data.stock?.cantidad || 0),
            stock_minimo: parseInt(data.stock_minimo || 5),
            unidad_medida: data.unidad_medida || 'unidad'
          });
        }
      });
      
      // Ordenar por relevancia (coincidencias exactas primero)
      productos.sort((a, b) => {
        const aNombre = (a.nombre || '').toLowerCase();
        const aCodigo = (a.codigo || '').toLowerCase();
        const bNombre = (b.nombre || '').toLowerCase();
        const bCodigo = (b.codigo || '').toLowerCase();
        
        // Coincidencias exactas de código primero
        if (aCodigo === terminoLower) return -1;
        if (bCodigo === terminoLower) return 1;
        
        // Coincidencias que empiezan con el término
        if (aNombre.startsWith(terminoLower) && !bNombre.startsWith(terminoLower)) return -1;
        if (bNombre.startsWith(terminoLower) && !aNombre.startsWith(terminoLower)) return 1;
        
        return 0;
      });
      
      console.log(`🔍 Búsqueda "${termino}": ${productos.length} productos encontrados`);
      
      res.json({
        success: true,
        data: productos,
        total: productos.length,
        message: 'Búsqueda de productos completada'
      });
      return true;
    }
    
    // ✅ NUEVO ENDPOINT: GET /productos/buscar-con-stock/:sucursalId
    else if (path.match(/^\/productos\/buscar-con-stock\/[^\/]+$/) && req.method === 'GET') {
      const sucursalId = path.split('/')[3];
      const { termino } = req.query;
      
      try {
        console.log(`🔍 [PRODUCTOS] Buscando productos con stock en sucursal ${sucursalId}, término: "${termino}"`);
        
        // Obtener productos filtrados por companyId
        let query = db.collection('productos');
        if (companyId) {
          query = query.where('orgId', '==', companyId);
          console.log(`🔍 [MULTI-TENANT] Filtrando productos por companyId: ${companyId}`);
        }
        const productosSnapshot = await query.get();
        const productos = [];
        
        // Para cada producto, obtener su stock en la sucursal específica
        for (const doc of productosSnapshot.docs) {
          const productoData = doc.data();
          
          // Filtrar por término si existe
          if (termino && termino.length >= 2) {
            const terminoLower = termino.toLowerCase();
            const nombre = (productoData.nombre || '').toLowerCase();
            const codigo = (productoData.codigo || '').toLowerCase();
            const codigoBarras = (productoData.codigo_barras || '').toLowerCase();
            
            // Continuar solo si coincide con la búsqueda
            if (!nombre.includes(terminoLower) && 
                !codigo.includes(terminoLower) && 
                !codigoBarras.includes(terminoLower)) {
              continue;
            }
          }
          
          // Obtener stock en sucursal específica (multi-tenant)
          const stockQuery = await (companyId
            ? db.collection('companies').doc(companyId).collection('stock_sucursal')
            : db.collection('stock_sucursal'))
            .where('producto_id', '==', doc.id)
            .where('sucursal_id', '==', sucursalId)
            .limit(1)
            .get();
          
          let stockSucursal = 0;
          let stockMinimo = 5;
          
          if (!stockQuery.empty) {
            const stockData = stockQuery.docs[0].data();
            stockSucursal = parseInt(stockData.cantidad || 0);
            stockMinimo = parseInt(stockData.stock_minimo || 5);
          }
          
          // Solo incluir productos activos
          if (productoData.activo !== false) {
            productos.push({
              id: doc.id,
              ...productoData,
              precio_venta: parseFloat(productoData.precio_venta || 0),
              precio_costo: parseFloat(productoData.precio_costo || 0),
              stock_actual: stockSucursal, // ← STOCK POR SUCURSAL (NO GLOBAL)
              stock_minimo: stockMinimo,
              stock_sucursal: stockSucursal, // Campo adicional para claridad
              sucursal_id: sucursalId, // Para referencia
              unidad_medida: productoData.unidad_medida || 'unidad'
            });
          }
        }
        
        // Ordenar resultados por relevancia y stock
        productos.sort((a, b) => {
          // Si hay término de búsqueda, priorizar coincidencias exactas de código
          if (termino) {
            const terminoLower = termino.toLowerCase();
            const aCodigoExacto = a.codigo?.toLowerCase() === terminoLower;
            const bCodigoExacto = b.codigo?.toLowerCase() === terminoLower;
            
            if (aCodigoExacto && !bCodigoExacto) return -1;
            if (bCodigoExacto && !aCodigoExacto) return 1;
            
            // Luego priorizar nombres que empiecen con el término
            const aNombreEmpieza = a.nombre?.toLowerCase().startsWith(terminoLower);
            const bNombreEmpieza = b.nombre?.toLowerCase().startsWith(terminoLower);
            
            if (aNombreEmpieza && !bNombreEmpieza) return -1;
            if (bNombreEmpieza && !aNombreEmpieza) return 1;
          }
          
          // Finalmente ordenar por stock (mayor stock primero)
          return b.stock_actual - a.stock_actual;
        });
        
        console.log(`✅ [PRODUCTOS] ${productos.length} productos encontrados con stock por sucursal`);
        
        res.json({
          success: true,
          data: productos,
          total: productos.length,
          sucursal_id: sucursalId,
          termino: termino || null,
          message: 'Productos con stock por sucursal obtenidos correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PRODUCTOS] Error al buscar productos con stock por sucursal:', error);
        res.status(500).json({
          success: false,
          message: 'Error al buscar productos con stock por sucursal',
          error: error.message
        });
        return true;
      }
    }
    
    // GET /productos/codigo/:codigo/sucursal/:sucursalId
    else if (path.match(/^\/productos\/codigo\/[^\/]+\/sucursal\/[^\/]+$/) && req.method === 'GET') {
      const pathSegments = path.split('/');
      const codigo = pathSegments[3];
      const sucursalId = pathSegments[5];
      
      try {
        console.log(`🔍 [PRODUCTOS] Buscando producto código "${codigo}" en sucursal ${sucursalId}`);
        
        // Buscar producto por código
        let refCode = db.collection('productos')
          .where('codigo', '==', codigo)
          .where('activo', '==', true);
        if (companyId) refCode = refCode.where('orgId', '==', companyId);
        const productosSnapshot = await refCode.limit(1).get();
        
        if (productosSnapshot.empty) {
          res.status(404).json({
            success: false,
            message: `Producto con código ${codigo} no encontrado`
          });
          return true;
        }
        
        const productoDoc = productosSnapshot.docs[0];
        const productoData = productoDoc.data();
        
        // Obtener stock en sucursal específica (multi-tenant)
        const stockQuery = await (companyId
          ? db.collection('companies').doc(companyId).collection('stock_sucursal')
          : db.collection('stock_sucursal'))
          .where('producto_id', '==', productoDoc.id)
          .where('sucursal_id', '==', sucursalId)
          .limit(1)
          .get();
        
        let stockSucursal = 0;
        let stockMinimo = 5;
        
        if (!stockQuery.empty) {
          const stockData = stockQuery.docs[0].data();
          stockSucursal = parseInt(stockData.cantidad || 0);
          stockMinimo = parseInt(stockData.stock_minimo || 5);
        }
        
        const producto = {
          id: productoDoc.id,
          ...productoData,
          precio_venta: parseFloat(productoData.precio_venta || 0),
          precio_costo: parseFloat(productoData.precio_costo || 0),
          stock_actual: stockSucursal, // ← STOCK POR SUCURSAL
          stock_minimo: stockMinimo,
          stock_sucursal: stockSucursal,
          sucursal_id: sucursalId,
          unidad_medida: productoData.unidad_medida || 'unidad'
        };
        
        console.log(`✅ [PRODUCTOS] Producto encontrado con stock ${stockSucursal} en sucursal`);
        
        res.json({
          success: true,
          data: producto,
          message: 'Producto obtenido correctamente con stock por sucursal'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PRODUCTOS] Error al buscar producto por código con stock:', error);
        res.status(500).json({
          success: false,
          message: 'Error al buscar producto por código',
          error: error.message
        });
        return true;
      }
    }
    
    // PRODUCTOS - GET con stock bajo
    else if (path === '/productos/stock-bajo' && req.method === 'GET') {
      try {
        console.log('🔍 [PRODUCTOS] Obteniendo productos con stock bajo');
        
        // Obtener todos los productos del tenant
        let query = db.collection('productos');
        if (companyId) {
          query = query.where('orgId', '==', companyId);
          console.log(`🔍 [MULTI-TENANT] Filtrando productos por companyId: ${companyId}`);
        }
        const productosSnapshot = await query.get();
        
        const productosStockBajo = [];
        
        // Para cada producto, verificar su stock en todas las sucursales
        for (const doc of productosSnapshot.docs) {
          const productoData = doc.data();
          
          // Obtener stock en todas las sucursales del tenant (multi-tenant)
          let stockQuery = (companyId
            ? db.collection('companies').doc(companyId).collection('stock_sucursal')
            : db.collection('stock_sucursal'))
            .where('producto_id', '==', doc.id);
          
          if (companyId) {
            // Filtrar por sucursales del tenant
            const sucursalesSnapshot = await db.collection('sucursales')
              .where('orgId', '==', companyId)
              .get();
            
            const sucursalIds = sucursalesSnapshot.docs.map(s => s.id);
            if (sucursalIds.length > 0) {
              stockQuery = stockQuery.where('sucursal_id', 'in', sucursalIds);
            }
          }
          
          const stockSnapshot = await stockQuery.get();
          
          let stockTotal = 0;
          let stockMinimo = parseInt(productoData.stock_minimo || 5);
          
          stockSnapshot.forEach(stockDoc => {
            const stockData = stockDoc.data();
            stockTotal += parseInt(stockData.cantidad || 0);
            stockMinimo = Math.min(stockMinimo, parseInt(stockData.stock_minimo || 5));
          });
          
          // Si el stock total está por debajo del mínimo, incluir el producto
          if (stockTotal <= stockMinimo) {
            productosStockBajo.push({
              id: doc.id,
              ...productoData,
              stock_actual: stockTotal,
              stock_minimo: stockMinimo,
              unidad_medida: productoData.unidad_medida || 'unidad'
            });
          }
        }
        
        console.log(`✅ [PRODUCTOS] ${productosStockBajo.length} productos con stock bajo encontrados`);
        
        res.json({
          success: true,
          data: productosStockBajo,
          total: productosStockBajo.length,
          message: 'Productos con stock bajo obtenidos correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PRODUCTOS] Error al obtener productos con stock bajo:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener productos con stock bajo',
          error: error.message
        });
        return true;
      }
    }
    
    // PRODUCTO - GET por ID
    else if (path.startsWith('/productos/') && req.method === 'GET') {
      const productId = path.split('/productos/')[1];
      
      // Verificar si es una subconsulta especial
      if (productId === 'stock-bajo' || productId === 'activos' || productId === 'buscar' || 
          productId.includes('buscar-con-stock') || productId.includes('codigo') || 
          productId === 'importar-masivo') {
        // Estas rutas ya se manejan arriba
        return false;
      }
      
      const productDoc = await db.collection('productos').doc(productId).get();
      
      if (!productDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
        return true;
      }
      
      const data = productDoc.data();
      if (companyId && data.companyId && data.companyId !== companyId) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
      }
      const producto = {
        id: productDoc.id,
        ...data,
        precio_venta: parseFloat(data.precio_venta || 0),
        precio_costo: parseFloat(data.precio_costo || 0),
        stock_actual: parseInt(data.stock_actual || data.stock?.cantidad || 0),
        stock_minimo: parseInt(data.stock_minimo || 5),
        unidad_medida: data.unidad_medida || 'unidad'
      };
      
      res.json({
        success: true,
        data: producto,
        message: 'Producto obtenido correctamente'
      });
      return true;
    }
    
    // PRODUCTOS - POST crear nuevo
    else if (path === '/productos' && req.method === 'POST') {
      const nuevoProducto = req.body;
      
      // Validación básica
      if (!nuevoProducto.codigo && !nuevoProducto.nombre) {
        res.status(400).json({
          success: false,
          message: 'El código o nombre del producto es requerido'
        });
        return true;
      }
      
      // Estructura para Firebase con campos numéricos correctos
      const productoFirebase = {
        ...nuevoProducto,
        ...(companyId ? { orgId: companyId } : {}),
        codigo: nuevoProducto.codigo || '',
        nombre: nuevoProducto.nombre || '',
        descripcion: nuevoProducto.descripcion || '',
        unidad_medida: nuevoProducto.unidad_medida || 'unidad',
        precio_costo: parseFloat(nuevoProducto.precio_costo || 0),
        precio_venta: parseFloat(nuevoProducto.precio_venta || 0),
        stock_actual: parseInt(nuevoProducto.stock_actual || nuevoProducto.stock_inicial || 0),
        stock_minimo: parseInt(nuevoProducto.stock_minimo || 5),
        categoria_id: nuevoProducto.categoria_id || '',
        proveedor_id: nuevoProducto.proveedor_id || '',
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        activo: nuevoProducto.activo !== false
      };
      
      // Si tiene stock inicial, crear registro en stock_sucursal
      if (parseInt(productoFirebase.stock_actual) > 0 && nuevoProducto.sucursal_id) {
        const docRef = await db.collection('productos').add(productoFirebase);
        
        // Crear registro de stock en sucursal
        await db.collection('stock_sucursal').add({
          producto_id: docRef.id,
          sucursal_id: nuevoProducto.sucursal_id,
          cantidad: productoFirebase.stock_actual,
          stock_minimo: productoFirebase.stock_minimo,
          ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.status(201).json({
          success: true,
          data: {
            id: docRef.id,
            ...productoFirebase
          },
          message: 'Producto creado correctamente con stock inicial'
        });
      } else {
        const docRef = await db.collection('productos').add(productoFirebase);
        
        res.status(201).json({
          success: true,
          data: {
            id: docRef.id,
            ...productoFirebase
          },
          message: 'Producto creado correctamente'
        });
      }
      
      return true;
    }
    
    // ✅ NUEVO ENDPOINT: POST /productos/importar-masivo - IMPLEMENTACIÓN COMPLETA
    else if (path === '/productos/importar-masivo' && req.method === 'POST') {
      const { productos, sucursal_id, opciones } = req.body;
      
      console.log(`🔄 [PRODUCTOS API] Importando ${productos.length} productos a sucursal ${sucursal_id}`);
      
      if (!productos || !Array.isArray(productos) || productos.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Array de productos es requerido y no puede estar vacío'
        });
        return true;
      }
      
      if (!sucursal_id) {
        res.status(400).json({
          success: false,
          message: 'ID de sucursal es requerido'
        });
        return true;
      }
      
      try {
        // Verificar que la sucursal existe
        const sucursalDoc = await db.collection('sucursales').doc(sucursal_id).get();
        if (!sucursalDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Sucursal no encontrada'
          });
          return true;
        }
        
        const resultados = {
          importados: 0,
          actualizados: 0,
          duplicados: 0,
          errores: [],
          total_enviados: productos.length
        };
        
        // Procesar todos los productos en un solo batch (límite removido en 2023)
        const batch = db.batch();
        
        console.log(`📦 [PRODUCTOS API] Procesando ${productos.length} productos en un solo batch`);
        
        for (const producto of productos) {
          try {
            // Validar datos básicos
            if (!producto.codigo && !producto.nombre) {
              resultados.errores.push({
                producto,
                error: 'Código o nombre es requerido'
              });
              continue;
            }
            
            // Verificar si el producto ya existe por código
            let productoId = null;
            let esActualizacion = false;
            
            if (producto.codigo) {
              const existingQuery = await db.collection('productos')
                .where('codigo', '==', producto.codigo.trim())
                .limit(1)
                .get();
              
              if (!existingQuery.empty) {
                productoId = existingQuery.docs[0].id;
                esActualizacion = true;
                
                if (opciones?.evitar_duplicados) {
                  resultados.duplicados++;
                  continue;
                }
              }
            }
            
            // Preparar datos del producto
            const datosProducto = {
              codigo: producto.codigo?.trim() || '',
              nombre: producto.nombre?.trim() || '',
              descripcion: producto.descripcion?.trim() || '',
              precio_costo: parseFloat(producto.precio_costo || 0),
              precio_venta: parseFloat(producto.precio_venta || producto.precio_costo * 1.3 || 0),
              stock_actual: 0, // Stock global siempre 0 (se maneja por sucursal)
              stock_minimo: parseInt(producto.stock_minimo || 5),
              categoria_id: opciones?.categoria_default || producto.categoria_id || '',
              unidad_medida: producto.unidad_medida || 'unidad',
              activo: producto.activo !== false,
              fechaCreacion: esActualizacion ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.FieldValue.serverTimestamp(),
              fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
            };
            
            // Calcular listas de precios si no están definidas
            if (!datosProducto.listas_precios) {
              const precioBase = datosProducto.precio_venta;
              datosProducto.listas_precios = {
                mayorista: precioBase * 0.85, // 15% descuento (más barato)
				posadas: precioBase,          // Precio base (medio)
				interior: precioBase * 1.15   // 15% margen extra (más caro)
              };
            }
            
            // Crear o actualizar producto
            if (esActualizacion) {
              const productoRef = db.collection('productos').doc(productoId);
              batch.update(productoRef, datosProducto);
              resultados.actualizados++;
            } else {
              productoId = db.collection('productos').doc().id;
              const productoRef = db.collection('productos').doc(productoId);
              batch.set(productoRef, datosProducto);
              resultados.importados++;
            }
            
            // Crear/actualizar stock por sucursal
            const stockSucursalRef = db.collection('stock_sucursal').doc(`${productoId}_${sucursal_id}`);
            const stockInicial = parseInt(producto.stock_inicial || producto.cantidad_inicial || 0);
            
            const datosStock = {
              producto_id: productoId,
              sucursal_id: sucursal_id,
              cantidad: stockInicial,
              stock_minimo: parseInt(producto.stock_minimo || 5),
              ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
            };
            
            batch.set(stockSucursalRef, datosStock, { merge: true });
            
            // Registrar movimiento de stock inicial si es nuevo producto
            if (!esActualizacion && stockInicial > 0) {
              const movimientoRef = db.collection('movimientos_stock').doc();
              batch.set(movimientoRef, {
                producto_id: productoId,
                sucursal_id: sucursal_id,
                tipo: 'entrada',
                cantidad: stockInicial,
                cantidad_anterior: 0,
                cantidad_nueva: stockInicial,
                motivo: 'Importación masiva - Stock inicial',
                fecha: admin.firestore.FieldValue.serverTimestamp(),
                usuario_id: req.user?.uid || 'sistema'
              });
            }
            
          } catch (errorProducto) {
            console.error('❌ [PRODUCTOS API] Error procesando producto:', errorProducto);
            resultados.errores.push({
              producto: producto.codigo || producto.nombre,
              error: errorProducto.message
            });
          }
        }
        
        // Ejecutar el batch único
        try {
          await batch.commit();
          console.log(`✅ [PRODUCTOS API] Batch completado con ${resultados.importados + resultados.actualizados} productos`);
        } catch (errorBatch) {
          console.error(`❌ [PRODUCTOS API] Error en batch:`, errorBatch);
          throw new Error(`Error al ejecutar batch: ${errorBatch.message}`);
        }
        
        // Respuesta detallada
        const mensaje = `Importación completada: ${resultados.importados} nuevos, ${resultados.actualizados} actualizados, ${resultados.duplicados} duplicados, ${resultados.errores.length} errores`;
        
        console.log(`✅ [PRODUCTOS API] ${mensaje}`);
        
        res.json({
          success: true,
          message: mensaje,
          data: resultados
        });
        
      } catch (error) {
        console.error('❌ [PRODUCTOS API] Error en importación masiva:', error);
        res.status(500).json({
          success: false,
          message: 'Error durante la importación masiva',
          error: error.message
        });
      }
      
      return true;
    }
    
    // PRODUCTOS - PUT actualizar
    else if (path.startsWith('/productos/') && req.method === 'PUT') {
      const productId = path.split('/productos/')[1];
      const datosActualizacion = req.body;
      
      // Formatear campos numéricos
      if (datosActualizacion.precio_costo !== undefined) {
        datosActualizacion.precio_costo = parseFloat(datosActualizacion.precio_costo || 0);
      }
      if (datosActualizacion.precio_venta !== undefined) {
        datosActualizacion.precio_venta = parseFloat(datosActualizacion.precio_venta || 0);
      }
      if (datosActualizacion.stock_actual !== undefined) {
        datosActualizacion.stock_actual = parseInt(datosActualizacion.stock_actual || 0);
      }
      if (datosActualizacion.stock_minimo !== undefined) {
        datosActualizacion.stock_minimo = parseInt(datosActualizacion.stock_minimo || 5);
      }
      if (datosActualizacion.unidad_medida !== undefined) {
        datosActualizacion.unidad_medida = datosActualizacion.unidad_medida || 'unidad';
      }
      
      // Agregar timestamp de actualización
      datosActualizacion.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();
      
      await db.collection('productos').doc(productId).update(datosActualizacion);
      
      res.json({
        success: true,
        data: {
          id: productId,
          ...datosActualizacion
        },
        message: 'Producto actualizado correctamente'
      });
      return true;
    }
    
    // PRODUCTOS - DELETE eliminar
    else if (path.startsWith('/productos/') && req.method === 'DELETE') {
      const productId = path.split('/productos/')[1];
      
      await db.collection('productos').doc(productId).delete();
      
      res.json({
        success: true,
        message: 'Producto eliminado correctamente'
      });
      return true;
    }

    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de productos:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
  
};

module.exports = productosRoutes;