// functions/routes/compras.routes.js - VERSIÓN CORREGIDA
const admin = require('firebase-admin');
const db = admin.firestore();

// Función para enriquecer compras con información de proveedores
const enriquecerComprasConProveedores = async (compras) => {
  if (!Array.isArray(compras) || compras.length === 0) {
    return compras;
  }

  try {
    // Obtener IDs únicos de proveedores
    const proveedoresIds = [...new Set(
      compras
        .map(compra => compra.proveedor_id)
        .filter(id => id)
    )];

    console.log(`🔄 Cargando datos de ${proveedoresIds.length} proveedores únicos...`);

    // Obtener datos de proveedores en paralelo
    const proveedoresPromises = proveedoresIds.map(async (proveedorId) => {
      try {
        const proveedorDoc = await db.collection('proveedores').doc(proveedorId).get();
        return { 
          id: proveedorId, 
          data: proveedorDoc.exists ? proveedorDoc.data() : null,
          success: proveedorDoc.exists
        };
      } catch (error) {
        console.warn(`⚠️ Proveedor ${proveedorId} no encontrado:`, error.message);
        return { 
          id: proveedorId, 
          data: {
            id: proveedorId,
            nombre: 'Proveedor no encontrado',
            contacto: '',
            telefono: ''
          }, 
          success: false 
        };
      }
    });

    const proveedoresResults = await Promise.all(proveedoresPromises);
    
    // Crear mapa de proveedores para acceso rápido
    const proveedoresMap = new Map();
    let proveedoresEncontrados = 0;
    let proveedoresFaltantes = 0;
    
    proveedoresResults.forEach(result => {
      proveedoresMap.set(result.id, result.data);
      if (result.success) {
        proveedoresEncontrados++;
      } else {
        proveedoresFaltantes++;
      }
    });

    console.log(`✅ Proveedores encontrados: ${proveedoresEncontrados}/${proveedoresIds.length}`);
    if (proveedoresFaltantes > 0) {
      console.warn(`⚠️ Proveedores faltantes: ${proveedoresFaltantes}`);
    }

    // Enriquecer compras con datos de proveedor
    const comprasEnriquecidas = compras.map(compra => {
      let proveedor_info;
      
      if (compra.proveedor_id && proveedoresMap.has(compra.proveedor_id)) {
        // Proveedor encontrado
        const proveedor = proveedoresMap.get(compra.proveedor_id);
        proveedor_info = {
          id: proveedor.id,
          nombre: proveedor.nombre || '',
          contacto: proveedor.contacto || '',
          telefono: proveedor.telefono || '',
          email: proveedor.email || ''
        };
      } else if (compra.proveedor_info) {
        // Usar proveedor_info existente si ya lo tiene
        proveedor_info = compra.proveedor_info;
      } else {
        // Sin proveedor
        proveedor_info = {
          id: compra.proveedor_id || null,
          nombre: compra.proveedor_id ? `Proveedor ${compra.proveedor_id}` : 'Sin proveedor',
          contacto: '',
          telefono: '',
          email: ''
        };
      }
      
      return {
        ...compra,
        proveedor_info,
        // Mantener compatibilidad
        proveedor: proveedor_info.nombre
      };
    });

    return comprasEnriquecidas;

  } catch (error) {
    console.error('❌ Error al enriquecer compras con proveedores:', error);
    
    // En caso de error, devolver compras con proveedor_info básico
    return compras.map(compra => ({
      ...compra,
      proveedor_info: {
        id: compra.proveedor_id || null,
        nombre: compra.proveedor_id ? `Error al cargar proveedor (ID: ${compra.proveedor_id})` : 'Sin proveedor',
        contacto: '',
        telefono: '',
        email: ''
      },
      proveedor: compra.proveedor_id ? `Error al cargar proveedor (ID: ${compra.proveedor_id})` : 'Sin proveedor'
    }));
  }
};
// Agregar esta función en compras.routes.js después de enriquecerComprasConProveedores

// Función para enriquecer detalles con información de productos
const enriquecerDetallesConProductos = async (compras) => {
  if (!Array.isArray(compras) || compras.length === 0) {
    return compras;
  }

  try {
    // Recopilar todos los producto_ids únicos de todos los detalles
    const productosIds = new Set();
    
    compras.forEach(compra => {
      if (compra.detalles && Array.isArray(compra.detalles)) {
        compra.detalles.forEach(detalle => {
          if (detalle.producto_id) {
            productosIds.add(detalle.producto_id);
          }
        });
      }
    });

    if (productosIds.size === 0) {
      return compras;
    }

    console.log(`🔄 Cargando datos de ${productosIds.size} productos únicos...`);

    // Obtener datos de productos en paralelo
    const productosPromises = Array.from(productosIds).map(async (productoId) => {
      try {
        const productoDoc = await db.collection('productos').doc(productoId).get();
        return { 
          id: productoId, 
          data: productoDoc.exists ? productoDoc.data() : null,
          success: productoDoc.exists
        };
      } catch (error) {
        console.warn(`⚠️ Producto ${productoId} no encontrado:`, error.message);
        return { 
          id: productoId, 
          data: {
            id: productoId,
            nombre: 'Producto no encontrado',
            codigo: 'N/A'
          }, 
          success: false 
        };
      }
    });

    const productosResults = await Promise.all(productosPromises);
    
    // Crear mapa de productos para acceso rápido
    const productosMap = new Map();
    let productosEncontrados = 0;
    let productosFaltantes = 0;
    
    productosResults.forEach(result => {
      productosMap.set(result.id, result.data);
      if (result.success) {
        productosEncontrados++;
      } else {
        productosFaltantes++;
      }
    });

    console.log(`✅ Productos encontrados: ${productosEncontrados}/${productosIds.size}`);
    if (productosFaltantes > 0) {
      console.warn(`⚠️ Productos faltantes: ${productosFaltantes}`);
    }

    // Enriquecer compras con datos de productos en detalles
    const comprasEnriquecidas = compras.map(compra => {
      if (!compra.detalles || !Array.isArray(compra.detalles)) {
        return compra;
      }

      const detallesEnriquecidos = compra.detalles.map(detalle => {
        if (!detalle.producto_id || !productosMap.has(detalle.producto_id)) {
          return {
            ...detalle,
            producto_nombre: detalle.producto_nombre || 'Producto no encontrado',
            producto_codigo: detalle.producto_codigo || 'N/A'
          };
        }

        const producto = productosMap.get(detalle.producto_id);
        
        return {
          ...detalle,
          producto_nombre: producto.nombre || 'Sin nombre',
          producto_codigo: producto.codigo || 'Sin código',
          // Mantener compatibilidad con nombres antiguos si existen
          nombre: producto.nombre,
          codigo: producto.codigo
        };
      });

      return {
        ...compra,
        detalles: detallesEnriquecidos
      };
    });

    return comprasEnriquecidas;

  } catch (error) {
    console.error('❌ Error al enriquecer detalles con productos:', error);
    
    // En caso de error, devolver compras con detalles básicos
    return compras.map(compra => ({
      ...compra,
      detalles: compra.detalles ? compra.detalles.map(detalle => ({
        ...detalle,
        producto_nombre: detalle.producto_nombre || `Error al cargar producto (ID: ${detalle.producto_id})`,
        producto_codigo: detalle.producto_codigo || 'ERROR'
      })) : []
    }));
  }
};
const comprasRoutes = async (req, res, path) => {
  try {
    const pathParts = path.split('/').filter(p => p);
    const companyId = req.companyId || req.user?.companyId || null;
    
    // Reemplazar estos bloques en compras.routes.js

	// COMPRAS - GET todas (LÍNEAS ~30-70) - REEMPLAZAR POR ESTO:
	if (req.method === 'GET' && pathParts.length === 1) {
	  try {
		let query = db.collection('compras');
		
		// Filtrar por companyId si está disponible
		if (companyId) {
		  query = query.where('orgId', '==', companyId);
		  console.log(`🔍 [MULTI-TENANT] Filtrando compras por companyId: ${companyId}`);
		}
		
		const comprasSnapshot = await query.orderBy('fecha', 'desc').get();
		const compras = [];
		
		comprasSnapshot.forEach(doc => {
		  compras.push({
			id: doc.id,
			...doc.data()
		  });
		});
		
		// ✅ PASO 1: Enriquecer compras con información de proveedores
		const comprasConProveedores = await enriquecerComprasConProveedores(compras);
		
		// ✅ PASO 2: Enriquecer detalles con información de productos
		const comprasCompletas = await enriquecerDetallesConProductos(comprasConProveedores);
		
		console.log(`✅ Compras encontradas: ${comprasCompletas.length}`);
		
		res.json({
		  success: true,
		  data: comprasCompletas,
		  total: comprasCompletas.length,
		  message: 'Compras obtenidas correctamente'
		});
		return true;
	  } catch (error) {
		console.error('❌ Error al obtener compras:', error);
		res.status(500).json({
		  success: false,
		  error: error.message
		});
		return true;
	  }
	}

	// COMPRA - GET por ID (LÍNEAS ~72-102) - REEMPLAZAR POR ESTO:
	if (req.method === 'GET' && pathParts.length === 2) {
	  try {
		const compraId = pathParts[1];
		const compraDoc = await db.collection('compras').doc(compraId).get();
		
		if (!compraDoc.exists) {
		  res.status(404).json({
			success: false,
			message: 'Compra no encontrada'
		  });
		  return true;
		}
		
		const compra = {
		  id: compraDoc.id,
		  ...compraDoc.data()
		};
		
		// ✅ PASO 1: Enriquecer compra individual con proveedor
		const comprasConProveedor = await enriquecerComprasConProveedores([compra]);
		
		// ✅ PASO 2: Enriquecer detalles con información de productos
		const comprasCompletas = await enriquecerDetallesConProductos(comprasConProveedor);
		
		const compraCompleta = comprasCompletas[0];
		
		console.log(`✅ Compra obtenida: ${compraId}`, {
		  proveedor: compraCompleta.proveedor_info?.nombre,
		  detalles: compraCompleta.detalles?.length,
		  primer_producto: compraCompleta.detalles?.[0]?.producto_nombre
		});
		
		res.json({
		  success: true,
		  data: compraCompleta,
		  message: 'Compra obtenida correctamente'
		});
		return true;
	  } catch (error) {
		console.error('❌ Error al obtener compra:', error);
		res.status(500).json({
		  success: false,
		  error: error.message
		});
		return true;
	  }
	}
    
    // COMPRAS - POST crear nueva (SIN CAMBIOS - YA ESTÁ BIEN)
    if (req.method === 'POST' && pathParts.length === 1) {
      const nuevaCompra = req.body;
      
      console.log('📦 Creando nueva compra:', nuevaCompra);
      
      // Validación básica
      if (!nuevaCompra.proveedor_id || !nuevaCompra.detalles || nuevaCompra.detalles.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Datos de compra incompletos (proveedor y detalles requeridos)'
        });
        return true;
      }
      
      try {
        // Obtener la sucursal principal
        const sucursalPrincipalSnapshot = await db.collection('sucursales')
          .where('tipo', '==', 'principal')
          .limit(1)
          .get();
        
        if (sucursalPrincipalSnapshot.empty) {
          // Si no hay sucursal principal, crear una
          console.log('⚠️ No se encontró sucursal principal, creando una...');
          
          const nuevaSucursal = {
            nombre: 'Sucursal Principal',
            direccion: 'Dirección principal',
            telefono: '',
            tipo: 'principal',
            activa: true,
            fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
          };
          
          const sucursalRef = await db.collection('sucursales').add(nuevaSucursal);
          var sucursalPrincipalId = sucursalRef.id;
          
          console.log('✅ Sucursal principal creada:', sucursalPrincipalId);
        } else {
          var sucursalPrincipalId = sucursalPrincipalSnapshot.docs[0].id;
          console.log('✅ Usando sucursal principal existente:', sucursalPrincipalId);
        }
        
        // Estructura para Firebase
        const compraFirebase = {
          ...nuevaCompra,
          sucursal_id: nuevaCompra.sucursal_id || sucursalPrincipalId,
          fecha: nuevaCompra.fecha || new Date().toISOString(),
          fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
          estado: nuevaCompra.estado || 'pendiente',
          activo: nuevaCompra.activo !== false,
          ...(companyId ? { orgId: companyId } : {})
        };
        
        // Crear la compra
        const docRef = await db.collection('compras').add(compraFirebase);
        console.log('✅ Compra creada con ID:', docRef.id);
        
        // Si la compra está completada, actualizar stock
        if (compraFirebase.estado === 'completada' && Array.isArray(compraFirebase.detalles)) {
          console.log('🔄 Actualizando stock en sucursal principal...');
          
          const batch = db.batch();
          
          for (const detalle of compraFirebase.detalles) {
            if (detalle.producto_id && detalle.cantidad) {
              console.log(`  📦 Procesando producto ${detalle.producto_id}, cantidad: ${detalle.cantidad}`);
              
              // Buscar stock existente
              const stockQuery = await db.collection('stock_sucursal')
                .where('producto_id', '==', detalle.producto_id)
                .where('sucursal_id', '==', sucursalPrincipalId)
                .limit(1)
                .get();
              
              if (stockQuery.empty) {
                // Crear nuevo registro de stock
                console.log(`  🆕 Creando stock para producto ${detalle.producto_id}`);
                
                const nuevoStockRef = db.collection('stock_sucursal').doc();
                batch.set(nuevoStockRef, {
                  producto_id: detalle.producto_id,
                  sucursal_id: sucursalPrincipalId,
                  cantidad: parseFloat(parseFloat(detalle.cantidad).toFixed(3)),
                  stock_minimo: 5,
                  ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
                });
              } else {
                // Actualizar stock existente
                const stockDoc = stockQuery.docs[0];
                const stockData = stockDoc.data();
                const stockActual = parseFloat(stockData.cantidad || 0);
                const nuevoStock = parseFloat((stockActual + parseFloat(detalle.cantidad)).toFixed(3));
				console.log(`📊 DEBUG STOCK:`);
				console.log(`  - Stock actual: ${stockActual} (tipo: ${typeof stockActual})`);
				console.log(`  - Cantidad a sumar: ${parseFloat(detalle.cantidad)} (tipo: ${typeof parseFloat(detalle.cantidad)})`);
				console.log(`  - Nuevo stock calculado: ${nuevoStock}`);
				console.log(`  - Nuevo stock con toFixed: ${parseFloat(nuevoStock.toFixed(3))}`);
                
                console.log(`  🔄 Actualizando stock: ${stockActual} + ${detalle.cantidad} = ${nuevoStock}`);
                
                batch.update(stockDoc.ref, {
                  cantidad: parseFloat(nuevoStock.toFixed(3)),
                  ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
                });
              }
              
              // Crear movimiento de stock
              const movimientoRef = db.collection('movimientos_stock').doc();
              batch.set(movimientoRef, {
                sucursal_id: sucursalPrincipalId,
                producto_id: detalle.producto_id,
                tipo: 'entrada',
                cantidad: parseFloat(detalle.cantidad),
                motivo: 'Compra a proveedor',
                referencia_tipo: 'compra',
                referencia_id: docRef.id,
                fecha: admin.firestore.FieldValue.serverTimestamp(),
                usuario_id: nuevaCompra.usuario_id || 'sistema'
              });
            }
          }
          
          // Ejecutar todas las operaciones
          await batch.commit();
          console.log('✅ Stock actualizado correctamente');
        }
        
        // 💸 Registrar movimiento en caja (EGRESO)
        try {
          const fechaISO = new Date().toISOString();
          const fechaDia = fechaISO.split('T')[0];
          const montoEgreso = parseFloat(compraFirebase.total || compraFirebase.subtotal || 0) || 0;
          await db.collection('movimientos_caja').add({
            tipo: 'egreso',
            monto: montoEgreso,
            concepto: `Compra ${docRef.id} a ${compraFirebase.proveedor_nombre || compraFirebase.proveedor || 'Proveedor'}`,
            usuario: nuevaCompra.usuario_email || nuevaCompra.usuario_id || 'sistema',
            observaciones: compraFirebase.estado ? `Estado: ${compraFirebase.estado}` : '',
            fecha: fechaDia,
            hora: fechaISO.split('T')[1]?.slice(0,8) || '',
            referencia_tipo: 'compra',
            referencia_id: docRef.id,
            proveedor_id: compraFirebase.proveedor_id || null,
            sucursal_id: compraFirebase.sucursal_id || sucursalPrincipalId || null,
            fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
            ...(companyId ? { orgId: companyId } : {})
          });
          console.log('💸 [CAJA] Egreso registrado por compra:', { id: docRef.id, monto: montoEgreso });
        } catch (e) {
          console.warn('⚠️ [CAJA] No se pudo registrar egreso por compra:', e.message);
        }

        res.status(201).json({
          success: true,
          data: {
            id: docRef.id,
            ...compraFirebase
          },
          message: 'Compra creada correctamente'
        });
        
      } catch (error) {
        console.error('❌ Error al crear compra:', error);
        res.status(500).json({
          success: false,
          message: 'Error al crear compra',
          error: error.message
        });
      }
      
      return true;
    }
	// En functions/routes/compras.routes.js, agregar:

// GET /compras/filtrar - Obtener compras con filtros
	if (path === '/compras/filtrar' && req.method === 'GET') {
	  try {
		const { fecha_inicio, fecha_fin, estado, proveedor_id } = req.query;
		
		let query = db.collection('compras');
		
		if (fecha_inicio && fecha_fin) {
		  const fechaInicioDate = new Date(fecha_inicio);
		  fechaInicioDate.setHours(0, 0, 0, 0);
		  
		  const fechaFinDate = new Date(fecha_fin);
		  fechaFinDate.setHours(23, 59, 59, 999);
		  
		  query = query
			.where('fecha', '>=', admin.firestore.Timestamp.fromDate(fechaInicioDate))
			.where('fecha', '<=', admin.firestore.Timestamp.fromDate(fechaFinDate));
		}
		
		if (estado) {
		  query = query.where('estado', '==', estado);
		}
		
		if (proveedor_id) {
		  query = query.where('proveedor_id', '==', proveedor_id);
		}
		
		const snapshot = await query.get();
		const compras = [];
		
		snapshot.forEach(doc => {
		  compras.push({
			id: doc.id,
			...doc.data(),
			// Formatear para la tabla
			numero: doc.data().numero || `COMP-${doc.id.slice(-6)}`,
			proveedor: doc.data().proveedor_nombre || 'Proveedor',
			subtotal: doc.data().subtotal || doc.data().total || 0,
			impuestos: doc.data().impuestos || 0
		  });
		});
		
		res.json(compras);
		return true;
		
	  } catch (error) {
		console.error('❌ Error al filtrar compras:', error);
		res.status(500).json({ error: error.message });
		return true;
	  }
	}
    // PUT /compras/:id - Actualizar compra existente (FALTABA ESTE ENDPOINT)
    if (req.method === 'PUT' && pathParts.length === 2) {
      try {
        const compraId = pathParts[1];
        const datosActualizados = req.body;
        
        console.log(`📦 [COMPRAS] Actualizando compra ${compraId}:`, datosActualizados);
        
        // Obtener la compra actual
        const compraDoc = await db.collection('compras').doc(compraId).get();
        
        if (!compraDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Compra no encontrada'
          });
          return true;
        }
        
        const compraActual = compraDoc.data();
        const estadoAnterior = compraActual.estado;
        const estadoNuevo = datosActualizados.estado;
        
        // Preparar datos de actualización
        const actualizacion = {
          ...datosActualizados,
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Si se está marcando como completada/recibida, actualizar stock
        const debeActualizarStock = (
          estadoNuevo === 'completada' || 
          estadoNuevo === 'recibida'
        ) && (
          estadoAnterior !== 'completada' && 
          estadoAnterior !== 'recibida'
        );
        
        if (debeActualizarStock) {
          console.log('🔄 [COMPRAS] Actualizando stock porque el estado cambió a recibida/completada...');
          
          // Obtener sucursal
          let sucursalId = compraActual.sucursal_id;
          
          if (!sucursalId) {
            const sucursalPrincipalSnapshot = await db.collection('sucursales')
              .where('tipo', '==', 'principal')
              .limit(1)
              .get();
            
            if (!sucursalPrincipalSnapshot.empty) {
              sucursalId = sucursalPrincipalSnapshot.docs[0].id;
            }
          }
          
          if (!sucursalId) {
            res.status(400).json({
              success: false,
              message: 'No se pudo determinar la sucursal para actualizar el stock'
            });
            return true;
          }
          
          // USAR TRANSACCIÓN para actualizar compra y stock
          await db.runTransaction(async (transaction) => {
            // 1. Actualizar la compra
            transaction.update(compraDoc.ref, actualizacion);
            
            // 2. Actualizar stock si hay detalles
            if (compraActual.detalles && Array.isArray(compraActual.detalles)) {
              for (const detalle of compraActual.detalles) {
                if (detalle.producto_id && detalle.cantidad) {
                  const cantidadRecibida = parseFloat(detalle.cantidad);
                  
                  console.log(`  📦 Actualizando stock producto ${detalle.producto_id}: +${cantidadRecibida}`);
                  
                  // Buscar stock existente
                  const stockQuery = await db.collection('stock_sucursal')
                    .where('producto_id', '==', detalle.producto_id)
                    .where('sucursal_id', '==', sucursalId)
                    .limit(1)
                    .get();
                  
                  if (stockQuery.empty) {
                    // Crear nuevo stock
                    const nuevoStockRef = db.collection('stock_sucursal').doc();
                    transaction.set(nuevoStockRef, {
                      producto_id: detalle.producto_id,
                      sucursal_id: sucursalId,
                      cantidad: cantidadRecibida,
                      stock_minimo: 5,
                      ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
                    });
                  } else {
                    // Actualizar stock existente
                    const stockDoc = stockQuery.docs[0];
                    const stockData = stockDoc.data();
                    const stockActual = parseFloat(stockData.cantidad || 0);
                    const nuevoStock = stockActual + cantidadRecibida;
                    
                    console.log(`    Stock: ${stockActual} + ${cantidadRecibida} = ${nuevoStock}`);
                    
                    transaction.update(stockDoc.ref, {
                      cantidad: parseFloat(nuevoStock.toFixed(3)),
                      ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
                    });
                  }
                  
                  // Crear movimiento de stock
                  const movimientoRef = db.collection('movimientos_stock').doc();
                  transaction.set(movimientoRef, {
                    sucursal_id: sucursalId,
                    producto_id: detalle.producto_id,
                    tipo: 'entrada',
                    cantidad: cantidadRecibida,
                    motivo: 'Recepción de compra',
                    referencia_tipo: 'compra',
                    referencia_id: compraId,
                    fecha: admin.firestore.FieldValue.serverTimestamp(),
                    usuario_id: datosActualizados.usuario_id || 'sistema'
                  });
                }
              }
            }
          });
          
          console.log('✅ [COMPRAS] Compra actualizada y stock procesado');
          
        } else {
          // Solo actualizar la compra sin tocar el stock
          await compraDoc.ref.update(actualizacion);
          console.log('✅ [COMPRAS] Compra actualizada (sin cambios de stock)');
        }
        
        res.json({
          success: true,
          data: {
            id: compraId,
            ...actualizacion
          },
          message: debeActualizarStock ? 
            'Compra actualizada y stock procesado correctamente' : 
            'Compra actualizada correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [COMPRAS] Error al actualizar compra:', error);
        res.status(500).json({
          success: false,
          message: 'Error al actualizar compra',
          error: error.message
        });
        return true;
      }
    }
    // Resto de rutas existentes...
    // (PUT, PATCH, etc. - mantener como están)
    // PATCH /compras/:id/recibir - Recibir mercadería (NUEVO - FALTABA ESTO)
    if (req.method === 'PATCH' && pathParts.length === 3 && pathParts[2] === 'recibir') {
      try {
        const compraId = pathParts[1];
        const { usuario_id } = req.body;
        
        console.log(`📦 [COMPRAS] Recibiendo mercadería de compra: ${compraId}`);
        
        // Obtener la compra
        const compraDoc = await db.collection('compras').doc(compraId).get();
        
        if (!compraDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Compra no encontrada'
          });
          return true;
        }
        
        const compraData = compraDoc.data();
        
        if (compraData.estado === 'recibida' || compraData.estado === 'completada') {
          res.status(400).json({
            success: false,
            message: 'Esta compra ya fue recibida anteriormente'
          });
          return true;
        }
        
        if (!compraData.detalles || compraData.detalles.length === 0) {
          res.status(400).json({
            success: false,
            message: 'La compra no tiene detalles de productos'
          });
          return true;
        }
        
        // Obtener sucursal (usar la de la compra o la principal)
        let sucursalId = compraData.sucursal_id;
        
        if (!sucursalId) {
          const sucursalPrincipalSnapshot = await db.collection('sucursales')
            .where('tipo', '==', 'principal')
            .limit(1)
            .get();
          
          if (!sucursalPrincipalSnapshot.empty) {
            sucursalId = sucursalPrincipalSnapshot.docs[0].id;
          } else {
            res.status(400).json({
              success: false,
              message: 'No se encontró sucursal para recibir la mercadería'
            });
            return true;
          }
        }
        
        console.log(`📍 Recibiendo en sucursal: ${sucursalId}`);
        
        // USAR TRANSACCIÓN para garantizar consistencia
        await db.runTransaction(async (transaction) => {
          // 1. Actualizar estado de la compra
          transaction.update(compraDoc.ref, {
            estado: 'recibida',
            fecha_recepcion: admin.firestore.FieldValue.serverTimestamp(),
            fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
            usuario_recepcion: usuario_id || 'sistema'
          });
          
          // 2. Actualizar stock de cada producto
          for (const detalle of compraData.detalles) {
            if (detalle.producto_id && detalle.cantidad) {
              const cantidadRecibida = parseFloat(detalle.cantidad);
              
              console.log(`  📦 Procesando producto ${detalle.producto_id}: +${cantidadRecibida}`);
              
              // Buscar stock existente
              const stockQuery = await db.collection('stock_sucursal')
                .where('producto_id', '==', detalle.producto_id)
                .where('sucursal_id', '==', sucursalId)
                .limit(1)
                .get();
              
              if (stockQuery.empty) {
                // Crear nuevo registro de stock
                console.log(`    🆕 Creando nuevo stock para producto ${detalle.producto_id}`);
                
                const nuevoStockRef = db.collection('stock_sucursal').doc();
                transaction.set(nuevoStockRef, {
                  producto_id: detalle.producto_id,
                  sucursal_id: sucursalId,
                  cantidad: cantidadRecibida,
                  stock_minimo: 5,
                  ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
                });
              } else {
                // Actualizar stock existente
                const stockDoc = stockQuery.docs[0];
                const stockData = stockDoc.data();
                const stockActual = parseFloat(stockData.cantidad || 0);
                const nuevoStock = stockActual + cantidadRecibida;
                
                console.log(`    🔄 Actualizando stock: ${stockActual} + ${cantidadRecibida} = ${nuevoStock}`);
                
                transaction.update(stockDoc.ref, {
                  cantidad: parseFloat(nuevoStock.toFixed(3)),
                  ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
                });
              }
              
              // 3. Crear movimiento de stock
              const movimientoRef = db.collection('movimientos_stock').doc();
              transaction.set(movimientoRef, {
                sucursal_id: sucursalId,
                producto_id: detalle.producto_id,
                tipo: 'entrada',
                cantidad: cantidadRecibida,
                motivo: 'Recepción de compra',
                referencia_tipo: 'compra',
                referencia_id: compraId,
                fecha: admin.firestore.FieldValue.serverTimestamp(),
                usuario_id: usuario_id || 'sistema'
              });
            }
          }
        });
        
        console.log(`✅ [COMPRAS] Mercadería recibida correctamente - Stock actualizado`);
        
        res.json({
          success: true,
          message: 'Mercadería recibida y stock actualizado correctamente',
          data: {
            compra_id: compraId,
            estado: 'recibida',
            fecha_recepcion: new Date().toISOString(),
            productos_procesados: compraData.detalles.length
          }
        });
        return true;
        
      } catch (error) {
        console.error('❌ [COMPRAS] Error al recibir mercadería:', error);
        res.status(500).json({
          success: false,
          message: 'Error al recibir mercadería',
          error: error.message
        });
        return true;
      }
    }
    
    // PATCH /compras/:id/estado - Cambiar estado de compra (ALTERNATIVO)
    if (req.method === 'PATCH' && pathParts.length === 3 && pathParts[2] === 'estado') {
      try {
        const compraId = pathParts[1];
        const { estado, usuario_id } = req.body;
        
        console.log(`📦 [COMPRAS] Cambiando estado de compra ${compraId} a: ${estado}`);
        
        const estadosPermitidos = ['pendiente', 'recibida', 'completada', 'cancelada'];
        if (!estadosPermitidos.includes(estado)) {
          res.status(400).json({
            success: false,
            message: 'Estado inválido'
          });
          return true;
        }
        
        // Si el nuevo estado es "recibida", usar la lógica de recibir mercadería
        if (estado === 'recibida') {
          // Redirigir a la función de recibir mercadería
          req.body = { usuario_id };
          // Simular llamada a /compras/:id/recibir
          const nuevaPath = `/compras/${compraId}/recibir`;
          const nuevosPathParts = nuevaPath.split('/').filter(p => p);
          // Recursivamente llamar a la misma función con la nueva ruta
          pathParts[2] = 'recibir';
          return await comprasRoutes(req, res, nuevaPath);
        }
        
        // Para otros cambios de estado (sin actualizar stock)
        await db.collection('compras').doc(compraId).update({
          estado: estado,
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({
          success: true,
          message: `Estado cambiado a: ${estado}`,
          data: {
            compra_id: compraId,
            estado: estado
          }
        });
        return true;
        
      } catch (error) {
        console.error('❌ [COMPRAS] Error al cambiar estado:', error);
        res.status(500).json({
          success: false,
          message: 'Error al cambiar estado',
          error: error.message
        });
        return true;
      }
    }
    // Si ninguna ruta coincide, devolver false
    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de compras:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = comprasRoutes;