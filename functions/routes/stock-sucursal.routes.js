// functions/routes/stock-sucursal.routes.js
const admin = require('firebase-admin');
const db = admin.firestore();

// Función para manejar todas las rutas de stock por sucursal
const stockSucursalRoutes = async (req, res, path) => {
  try {
    // STOCK-SUCURSAL - GET stock de una sucursal específica
    if (path.match(/^\/stock-sucursal\/sucursal\/[^\/]+$/) && req.method === 'GET') {
      const sucursalId = path.split('/sucursal/')[1];
      
      try {
        // Verificar que la sucursal existe
        const sucursalDoc = await db.collection('sucursales').doc(sucursalId).get();
        if (!sucursalDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Sucursal no encontrada'
          });
          return true;
        }
        
        // Obtener stock de la sucursal con información de productos
        const stockSnapshot = await db.collection('stock_sucursal')
          .where('sucursal_id', '==', sucursalId)
          .get();
        
        const stock = [];
        
        // Obtener información de productos en paralelo
        const productosPromises = stockSnapshot.docs.map(async (doc) => {
          const stockData = doc.data();
          const productoDoc = await db.collection('productos').doc(stockData.producto_id).get();
          
          if (productoDoc.exists) {
            const productoData = productoDoc.data();
            return {
              id: doc.id,
              ...stockData,
              producto: {
                id: productoDoc.id,
                codigo: productoData.codigo,
                nombre: productoData.nombre,
                descripcion: productoData.descripcion,
                precio_venta: productoData.precio_venta,
                precio_costo: productoData.precio_costo,
                categoria_id: productoData.categoria_id
              }
            };
          }
          return null;
        });
        
        const stockConProductos = await Promise.all(productosPromises);
        const stockFiltrado = stockConProductos.filter(item => item !== null);
        
        res.json({
          success: true,
          data: stockFiltrado,
          total: stockFiltrado.length,
          message: 'Stock de sucursal obtenido correctamente'
        });
      } catch (error) {
        console.error('Error al obtener stock de sucursal:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener stock de sucursal',
          error: error.message
        });
      }
      return true;
    }

    // STOCK-SUCURSAL - GET stock de un producto en todas las sucursales
    else if (path.match(/^\/stock-sucursal\/producto\/[^\/]+$/) && req.method === 'GET') {
      const productoId = path.split('/producto/')[1];
      
      try {
        // Verificar que el producto existe
        const productoDoc = await db.collection('productos').doc(productoId).get();
        if (!productoDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Producto no encontrado'
          });
          return true;
        }
        
        // Obtener stock del producto en todas las sucursales
        const stockSnapshot = await db.collection('stock_sucursal')
          .where('producto_id', '==', productoId)
          .get();
        
        const stock = [];
        
        // Obtener información de sucursales
        for (const doc of stockSnapshot.docs) {
          const stockData = doc.data();
          const sucursalDoc = await db.collection('sucursales').doc(stockData.sucursal_id).get();
          
          if (sucursalDoc.exists) {
            const sucursalData = sucursalDoc.data();
            stock.push({
              id: doc.id,
              ...stockData,
              sucursal: {
                id: sucursalDoc.id,
                nombre: sucursalData.nombre,
                tipo: sucursalData.tipo
              }
            });
          }
        }
        
        res.json({
          success: true,
          data: stock,
          total: stock.length,
          message: 'Stock del producto obtenido correctamente'
        });
      } catch (error) {
        console.error('Error al obtener stock del producto:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener stock del producto',
          error: error.message
        });
      }
      return true;
    }
	// POST /stock-sucursal/transferir - Crear nueva transferencia
	if (path === '/stock-sucursal/transferir' && req.method === 'POST') {
	  try {
		const {
		  sucursal_origen_id,
		  sucursal_destino_id,
		  productos,
		  motivo,
		  usuario_id
		} = req.body;

		console.log('🔄 [STOCK-SUCURSAL] Creando transferencia:', {
		  origen: sucursal_origen_id,
		  destino: sucursal_destino_id,
		  productos: productos?.length
		});

		// Validaciones básicas
		if (!sucursal_origen_id || !sucursal_destino_id) {
		  return res.status(400).json({
			success: false,
			message: 'Sucursales de origen y destino son requeridas'
		  });
		}

		if (!productos || productos.length === 0) {
		  return res.status(400).json({
			success: false,
			message: 'Debe incluir al menos un producto'
		  });
		}

		if (!motivo?.trim()) {
		  return res.status(400).json({
			success: false,
			message: 'El motivo es requerido'
		  });
		}

		// Verificar que las sucursales existen
		const [sucursalOrigen, sucursalDestino] = await Promise.all([
		  db.collection('sucursales').doc(sucursal_origen_id).get(),
		  db.collection('sucursales').doc(sucursal_destino_id).get()
		]);

		if (!sucursalOrigen.exists || !sucursalDestino.exists) {
		  return res.status(404).json({
			success: false,
			message: 'Una o ambas sucursales no existen'
		  });
		}

		// Verificar stock disponible en sucursal origen
		for (const producto of productos) {
		  const stockQuery = await db.collection('stock_sucursal')
			.where('producto_id', '==', producto.producto_id)
			.where('sucursal_id', '==', sucursal_origen_id)
			.limit(1)
			.get();

		  if (stockQuery.empty) {
			const productoDoc = await db.collection('productos').doc(producto.producto_id).get();
			const nombreProducto = productoDoc.exists ? productoDoc.data().nombre : 'Producto';
			
			return res.status(400).json({
			  success: false,
			  message: `${nombreProducto} no tiene stock en la sucursal origen`
			});
		  }

		  const stockData = stockQuery.docs[0].data();
		  if (stockData.cantidad < producto.cantidad) {
			const productoDoc = await db.collection('productos').doc(producto.producto_id).get();
			const nombreProducto = productoDoc.exists ? productoDoc.data().nombre : 'Producto';
			
			return res.status(400).json({
			  success: false,
			  message: `Stock insuficiente de ${nombreProducto}. Disponible: ${stockData.cantidad}, Solicitado: ${producto.cantidad}`
			});
		  }
		}

		// Enriquecer productos con información adicional
		const productosEnriquecidos = await Promise.all(
		  productos.map(async (item) => {
			try {
			  const productoDoc = await db.collection('productos').doc(item.producto_id).get();
			  if (productoDoc.exists) {
				const productoData = productoDoc.data();
				return {
				  producto_id: item.producto_id,
				  cantidad: parseFloat(item.cantidad),
				  producto_info: {
					codigo: productoData.codigo,
					nombre: productoData.nombre,
					descripcion: productoData.descripcion
				  }
				};
			  }
			  return {
				producto_id: item.producto_id,
				cantidad: parseFloat(item.cantidad)
			  };
			} catch (error) {
			  console.warn(`⚠️ Error al obtener info del producto ${item.producto_id}:`, error.message);
			  return {
				producto_id: item.producto_id,
				cantidad: parseFloat(item.cantidad)
			  };
			}
		  })
		);

		// CRÍTICO: Crear la transferencia en la colección 'transferencias'
		const transferenciaData = {
		  sucursal_origen_id,
		  sucursal_destino_id,
		  productos: productosEnriquecidos,
		  motivo: motivo.trim(),
		  usuario_solicita_id: usuario_id || 'sistema',
		  usuario_solicita_nombre: 'Usuario', // Se puede enriquecer después
		  estado: 'pendiente',
		  fecha_solicitud: new Date().toISOString(),
		  fecha_creacion: admin.firestore.FieldValue.serverTimestamp()
		};

		// Crear el documento en la colección transferencias
		const transferenciaRef = await db.collection('transferencias').add(transferenciaData);
		
		console.log(`✅ [STOCK-SUCURSAL] Transferencia creada con ID: ${transferenciaRef.id}`);

		// Obtener información de sucursales para la respuesta
		const respuestaData = {
		  id: transferenciaRef.id,
		  ...transferenciaData,
		  sucursal_origen: {
			id: sucursalOrigen.id,
			nombre: sucursalOrigen.data().nombre
		  },
		  sucursal_destino: {
			id: sucursalDestino.id,
			nombre: sucursalDestino.data().nombre
		  }
		};

		res.status(201).json({
		  success: true,
		  data: respuestaData,
		  message: 'Transferencia creada correctamente. Pendiente de aprobación.'
		});
		return true;

	  } catch (error) {
		console.error('❌ [STOCK-SUCURSAL] Error al crear transferencia:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al crear transferencia',
		  error: error.message
		});
		return true;
	  }
	}
    // STOCK-SUCURSAL - GET productos con stock bajo en una sucursal
    else if (path.match(/^\/stock-sucursal\/sucursal\/[^\/]+\/stock-bajo$/) && req.method === 'GET') {
      const sucursalId = path.split('/sucursal/')[1].split('/stock-bajo')[0];
      
      try {
        // Obtener stock bajo (donde cantidad <= stock_minimo)
        const stockSnapshot = await db.collection('stock_sucursal')
          .where('sucursal_id', '==', sucursalId)
          .get();
        
        const stockBajo = [];
        
        for (const doc of stockSnapshot.docs) {
          const stockData = doc.data();
          
          // Verificar si el stock está bajo
          if (stockData.cantidad <= stockData.stock_minimo) {
            const productoDoc = await db.collection('productos').doc(stockData.producto_id).get();
            
            if (productoDoc.exists) {
              const productoData = productoDoc.data();
              stockBajo.push({
                id: doc.id,
                ...stockData,
                producto: {
                  id: productoDoc.id,
                  codigo: productoData.codigo,
                  nombre: productoData.nombre,
                  categoria_id: productoData.categoria_id
                },
                diferencia: stockData.stock_minimo - stockData.cantidad
              });
            }
          }
        }
        
        // Ordenar por diferencia (más críticos primero)
        stockBajo.sort((a, b) => b.diferencia - a.diferencia);
        
        res.json({
          success: true,
          data: stockBajo,
          total: stockBajo.length,
          message: 'Productos con stock bajo obtenidos correctamente'
        });
      } catch (error) {
        console.error('Error al obtener stock bajo:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener stock bajo',
          error: error.message
        });
      }
      return true;
    }

    // STOCK-SUCURSAL - PUT actualizar stock de un producto en una sucursal
    else if (path.match(/^\/stock-sucursal\/[^\/]+\/[^\/]+$/) && req.method === 'PUT') {
      const [sucursalId, productoId] = path.split('/stock-sucursal/')[1].split('/');
      const { cantidad, stock_minimo } = req.body;
      
      try {
        // Buscar el registro de stock existente
        const stockQuery = await db.collection('stock_sucursal')
          .where('sucursal_id', '==', sucursalId)
          .where('producto_id', '==', productoId)
          .limit(1)
          .get();
        
        if (stockQuery.empty) {
          // Si no existe, crear uno nuevo
          const nuevoStock = {
            sucursal_id: sucursalId,
            producto_id: productoId,
            cantidad: parseFloat(cantidad || 0),
            stock_minimo: parseFloat(stock_minimo || 5),
            ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
          };
          
          const docRef = await db.collection('stock_sucursal').add(nuevoStock);
          
          res.json({
            success: true,
            data: {
              id: docRef.id,
              ...nuevoStock
            },
            message: 'Stock creado correctamente'
          });
        } else {
          // Si existe, actualizar
          const stockDoc = stockQuery.docs[0];
          const actualizacion = {
            ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
          };
          
          if (cantidad !== undefined) {
            actualizacion.cantidad = parseFloat(cantidad);
          }
          if (stock_minimo !== undefined) {
            actualizacion.stock_minimo = parseFloat(stock_minimo);
          }
          
          await stockDoc.ref.update(actualizacion);
          
          res.json({
            success: true,
            data: {
              id: stockDoc.id,
              ...stockDoc.data(),
              ...actualizacion
            },
            message: 'Stock actualizado correctamente'
          });
        }
      } catch (error) {
        console.error('Error al actualizar stock:', error);
        res.status(500).json({
          success: false,
          message: 'Error al actualizar stock',
          error: error.message
        });
      }
      return true;
    }

    // STOCK-SUCURSAL - POST ajustar stock (sumar o restar)
    else if (path === '/stock-sucursal/ajustar' && req.method === 'POST') {
      const { sucursal_id, producto_id, ajuste, motivo } = req.body;
      
      try {
        // Validaciones
        if (!sucursal_id || !producto_id || ajuste === undefined || !motivo) {
          res.status(400).json({
            success: false,
            message: 'Faltan datos requeridos'
          });
          return true;
        }
        
        const ajusteNum = parseFloat(ajuste);
        
        // Buscar el stock actual
        const stockQuery = await db.collection('stock_sucursal')
          .where('sucursal_id', '==', sucursal_id)
          .where('producto_id', '==', producto_id)
          .limit(1)
          .get();
        
        if (stockQuery.empty) {
          res.status(404).json({
            success: false,
            message: 'Stock no encontrado para este producto en esta sucursal'
          });
          return true;
        }
        
        const stockDoc = stockQuery.docs[0];
        const stockActual = stockDoc.data().cantidad || 0;
        const nuevaCantidad = Math.max(0, stockActual + ajusteNum);
        
        // Actualizar stock
        await stockDoc.ref.update({
          cantidad: nuevaCantidad,
          ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Registrar movimiento
        await db.collection('movimientos_stock').add({
          sucursal_id,
          producto_id,
          tipo: ajusteNum > 0 ? 'entrada' : 'salida',
          cantidad: Math.abs(ajusteNum),
          stock_anterior: stockActual,
          stock_nuevo: nuevaCantidad,
          motivo,
          fecha: admin.firestore.FieldValue.serverTimestamp(),
          usuario_id: req.body.usuario_id || 'sistema'
        });
        
        res.json({
          success: true,
          data: {
            stock_anterior: stockActual,
            ajuste: ajusteNum,
            stock_nuevo: nuevaCantidad
          },
          message: 'Stock ajustado correctamente'
        });
      } catch (error) {
        console.error('Error al ajustar stock:', error);
        res.status(500).json({
          success: false,
          message: 'Error al ajustar stock',
          error: error.message
        });
      }
      return true;
    }

    // STOCK-SUCURSAL - POST inicializar stock para una sucursal
    else if (path === '/stock-sucursal/inicializar' && req.method === 'POST') {
      const { sucursal_id, productos } = req.body;
      
      try {
        if (!sucursal_id || !Array.isArray(productos)) {
          res.status(400).json({
            success: false,
            message: 'Datos inválidos'
          });
          return true;
        }
        
        const batch = db.batch();
        const registrosCreados = [];
        
        for (const producto of productos) {
          if (!producto.producto_id) continue;
          
          // Verificar si ya existe
          const stockExistente = await db.collection('stock_sucursal')
            .where('sucursal_id', '==', sucursal_id)
            .where('producto_id', '==', producto.producto_id)
            .limit(1)
            .get();
          
          if (stockExistente.empty) {
            const nuevoStock = {
              sucursal_id,
              producto_id: producto.producto_id,
              cantidad: parseFloat(producto.cantidad || 0),
              stock_minimo: parseFloat(producto.stock_minimo || 5),
              ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = db.collection('stock_sucursal').doc();
            batch.set(docRef, nuevoStock);
            registrosCreados.push({
              id: docRef.id,
              ...nuevoStock
            });
          }
        }
        
        await batch.commit();
        
        res.json({
          success: true,
          data: registrosCreados,
          total: registrosCreados.length,
          message: `Stock inicializado: ${registrosCreados.length} productos`
        });
      } catch (error) {
        console.error('Error al inicializar stock:', error);
        res.status(500).json({
          success: false,
          message: 'Error al inicializar stock',
          error: error.message
        });
      }
      return true;
    }

    // STOCK-SUCURSAL - POST transferir stock entre sucursales
    else if (path === '/stock-sucursal/transferir' && req.method === 'POST') {
      const { 
        sucursal_origen_id, 
        sucursal_destino_id, 
        productos, // Array de {producto_id, cantidad}
        motivo,
        usuario_id 
      } = req.body;
      
      try {
        // Validaciones
        if (!sucursal_origen_id || !sucursal_destino_id || !Array.isArray(productos) || productos.length === 0) {
          res.status(400).json({
            success: false,
            message: 'Datos inválidos para la transferencia'
          });
          return true;
        }
        
        // Verificar que las sucursales existen y son diferentes
        if (sucursal_origen_id === sucursal_destino_id) {
          res.status(400).json({
            success: false,
            message: 'Las sucursales de origen y destino deben ser diferentes'
          });
          return true;
        }
        
        const [origenDoc, destinoDoc] = await Promise.all([
          db.collection('sucursales').doc(sucursal_origen_id).get(),
          db.collection('sucursales').doc(sucursal_destino_id).get()
        ]);
        
        if (!origenDoc.exists || !destinoDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Una o ambas sucursales no existen'
          });
          return true;
        }
        
        // Verificar stock disponible para todos los productos
        for (const producto of productos) {
          const stockQuery = await db.collection('stock_sucursal')
            .where('sucursal_id', '==', sucursal_origen_id)
            .where('producto_id', '==', producto.producto_id)
            .limit(1)
            .get();
          
          if (stockQuery.empty) {
            res.status(400).json({
              success: false,
              message: `Producto ${producto.producto_id} no tiene stock en la sucursal origen`
            });
            return true;
          }
          
          const stockDoc = stockQuery.docs[0];
          const stockDisponible = stockDoc.data().cantidad || 0;
          
          if (stockDisponible < producto.cantidad) {
            res.status(400).json({
              success: false,
              message: `Stock insuficiente para el producto ${producto.producto_id}. Disponible: ${stockDisponible}, Solicitado: ${producto.cantidad}`
            });
            return true;
          }
        }
        
        // Crear registro de transferencia
        const transferencia = {
          sucursal_origen_id,
          sucursal_destino_id,
          usuario_solicita_id: usuario_id || 'sistema',
          estado: 'pendiente',
          motivo: motivo || '',
          fecha_solicitud: admin.firestore.FieldValue.serverTimestamp(),
          productos: productos
        };
        
        const transferenciaRef = await db.collection('transferencias').add(transferencia);
        
        res.json({
          success: true,
          data: {
            id: transferenciaRef.id,
            ...transferencia,
            fecha_solicitud: new Date().toISOString() // Para la respuesta inmediata
          },
          message: 'Transferencia creada exitosamente y pendiente de aprobación'
        });
      } catch (error) {
        console.error('Error al crear transferencia:', error);
        res.status(500).json({
          success: false,
          message: 'Error al crear transferencia',
          error: error.message
        });
      }
      return true;
    }

    // STOCK-SUCURSAL - GET movimientos de stock de una sucursal
    else if (path.match(/^\/stock-sucursal\/sucursal\/[^\/]+\/movimientos$/) && req.method === 'GET') {
      const sucursalId = path.split('/sucursal/')[1].split('/movimientos')[0];
      const { fecha_inicio, fecha_fin, tipo } = req.query;
      
      try {
        let query = db.collection('movimientos_stock')
          .where('sucursal_id', '==', sucursalId);
        
        if (tipo) {
          query = query.where('tipo', '==', tipo);
        }
        
        // Por ahora ordenar por fecha descendente
        query = query.orderBy('fecha', 'desc').limit(100);
        
        const movimientosSnapshot = await query.get();
        const movimientos = [];
        
        // Enriquecer con información de productos
        for (const doc of movimientosSnapshot.docs) {
          const movimiento = doc.data();
          const productoDoc = await db.collection('productos').doc(movimiento.producto_id).get();
          
          if (productoDoc.exists) {
            movimientos.push({
              id: doc.id,
              ...movimiento,
              producto: {
                id: productoDoc.id,
                codigo: productoDoc.data().codigo,
                nombre: productoDoc.data().nombre
              }
            });
          }
        }
        
        res.json({
          success: true,
          data: movimientos,
          total: movimientos.length,
          message: 'Movimientos obtenidos correctamente'
        });
      } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener movimientos',
          error: error.message
        });
      }
      return true;
    }
    
    // STOCK-SUCURSAL - GET movimientos de un producto en todas las sucursales
    else if (path.match(/^\/stock-sucursal\/producto\/[^\/]+\/movimientos$/) && req.method === 'GET') {
      const productoId = path.split('/producto/')[1].split('/movimientos')[0];
      try {
        // Verificar que el producto existe
        const productoDoc = await db.collection('productos').doc(productoId).get();
        if (!productoDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Producto no encontrado'
          });
          return true;
        }
        const producto = productoDoc.data();
        // Obtener movimientos de stock de ese producto en todas las sucursales
        const movimientosSnapshot = await db.collection('movimientos_stock')
          .where('producto_id', '==', productoId)
          .orderBy('fecha', 'desc')
          .limit(200)
          .get();
        const movimientos = movimientosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json({
          success: true,
          movimientos,
          producto: {
            id: productoDoc.id,
            nombre: producto.nombre,
            codigo: producto.codigo
          }
        });
      } catch (error) {
        console.error('Error al obtener movimientos del producto:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener movimientos del producto',
          error: error.message
        });
      }
      return true;
    }

    // Si ninguna ruta coincide, devolver false
    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de stock-sucursal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = stockSucursalRoutes;