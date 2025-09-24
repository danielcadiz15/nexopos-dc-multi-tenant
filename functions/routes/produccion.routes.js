// functions/routes/produccion.routes.js - MODIFICADO PARA USAR PRODUCTOS
const admin = require('firebase-admin');
const db = admin.firestore();

// Función helper para crear notificaciones de producción
async function crearNotificacionProduccion(datos) {
  try {
    const notificacion = {
      ...datos,
      fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
      leida: false,
      activa: true
    };
    
    const docRef = await db.collection('notificaciones').add(notificacion);
    console.log(`🔔 [PRODUCCIÓN] Notificación creada: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('❌ [PRODUCCIÓN] Error al crear notificación:', error);
    return null;
  }
}

const produccionRoutes = async (req, res, path) => {
  try {
    const pathParts = path.split('/').filter(p => p);
    
    // GET /produccion - Obtener todas las órdenes de producción
    if (req.method === 'GET' && pathParts.length === 1) {
      try {
        const { estado, fecha_desde, fecha_hasta } = req.query;
        
        console.log('🏭 [PRODUCCIÓN] Obteniendo órdenes de producción');
        
        let query = db.collection('ordenes_produccion').orderBy('fecha_orden', 'desc');
        
        // Aplicar filtros
        if (estado) {
          query = query.where('estado', '==', estado);
        }
        
        const ordenesSnapshot = await query.get();
        const ordenes = [];
        
        // Procesar cada orden y enriquecer con información
        for (const doc of ordenesSnapshot.docs) {
          const orden = {
            id: doc.id,
            ...doc.data()
          };
          
          // Enriquecer con información del producto
          if (orden.producto_id) {
            try {
              const productoDoc = await db.collection('productos').doc(orden.producto_id).get();
              if (productoDoc.exists) {
                const productoData = productoDoc.data();
                orden.producto_info = {
                  id: productoDoc.id,
                  codigo: productoData.codigo,
                  nombre: productoData.nombre,
                  descripcion: productoData.descripcion
                };
                orden.producto_nombre = productoData.nombre;
                orden.producto_codigo = productoData.codigo;
              }
            } catch (error) {
              console.warn(`⚠️ Error al obtener producto ${orden.producto_id}:`, error.message);
            }
          }
          
          // Enriquecer con información de la receta
          if (orden.receta_id) {
            try {
              const recetaDoc = await db.collection('recetas').doc(orden.receta_id).get();
              if (recetaDoc.exists) {
                const recetaData = recetaDoc.data();
                orden.receta_info = {
                  id: recetaDoc.id,
                  nombre: recetaData.nombre,
                  rendimiento: recetaData.rendimiento
                };
                orden.receta_nombre = recetaData.nombre;
              }
            } catch (error) {
              console.warn(`⚠️ Error al obtener receta ${orden.receta_id}:`, error.message);
            }
          }
          
          // Filtrar por fechas si se especifica
          if (fecha_desde || fecha_hasta) {
            const fechaOrden = new Date(orden.fecha_orden);
            if (fecha_desde && fechaOrden < new Date(fecha_desde)) continue;
            if (fecha_hasta && fechaOrden > new Date(fecha_hasta)) continue;
          }
          
          ordenes.push(orden);
        }
        
        console.log(`✅ [PRODUCCIÓN] ${ordenes.length} órdenes obtenidas`);
        
        res.json({
          success: true,
          data: ordenes,
          total: ordenes.length,
          filtros: { estado, fecha_desde, fecha_hasta },
          message: 'Órdenes de producción obtenidas correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PRODUCCIÓN] Error al obtener órdenes:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener órdenes de producción',
          error: error.message
        });
        return true;
      }
    }
    
    // GET /produccion/:id - Obtener orden por ID con detalles completos
    if (req.method === 'GET' && pathParts.length === 2 && !['pendientes', 'completadas'].includes(pathParts[1])) {
      try {
        const ordenId = pathParts[1];
        console.log(`🏭 [PRODUCCIÓN] Obteniendo orden: ${ordenId}`);
        
        const ordenDoc = await db.collection('ordenes_produccion').doc(ordenId).get();
        
        if (!ordenDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Orden de producción no encontrada'
          });
          return true;
        }
        
        const orden = {
          id: ordenDoc.id,
          ...ordenDoc.data()
        };
        
        // Obtener información completa de la receta y sus ingredientes
        let receta = null;
        let ingredientes = [];
        
        if (orden.receta_id) {
          try {
            // Obtener receta
            const recetaDoc = await db.collection('recetas').doc(orden.receta_id).get();
            if (recetaDoc.exists) {
              receta = {
                id: recetaDoc.id,
                ...recetaDoc.data()
              };
              
              // Obtener ingredientes de la receta
              const ingredientesSnapshot = await db.collection('recetas_detalles')
                .where('receta_id', '==', orden.receta_id)
                .orderBy('orden', 'asc')
                .get();
              
              // Enriquecer ingredientes con información de productos (antes materias primas)
              for (const doc of ingredientesSnapshot.docs) {
                const ingrediente = {
                  id: doc.id,
                  ...doc.data()
                };
                
                // MODIFICADO: Buscar en productos
                const productoId = ingrediente.producto_id || ingrediente.materia_prima_id;
                
                if (productoId) {
                  try {
                    const productoDoc = await db.collection('productos').doc(productoId).get();
                    if (productoDoc.exists) {
                      const productoData = productoDoc.data();
                      
                      ingrediente.materia_prima_info = {
                        id: productoDoc.id,
                        nombre: productoData.nombre,
                        unidad_medida: productoData.unidad_medida || 'unidad',
                        precio_unitario: productoData.precio_costo || productoData.precio_unitario,
                        stock_actual: productoData.stock_actual
                      };
                      
                      // Calcular cantidad necesaria para esta orden específica
                      const cantidadBase = parseFloat(ingrediente.cantidad);
                      const rendimientoReceta = parseInt(receta.rendimiento || 1);
                      const cantidadOrden = parseInt(orden.cantidad);
                      
                      ingrediente.cantidad_necesaria = (cantidadBase * cantidadOrden) / rendimientoReceta;
                      ingrediente.subtotal = ingrediente.cantidad_necesaria * parseFloat(productoData.precio_costo || productoData.precio_unitario || 0);
                    }
                  } catch (error) {
                    console.warn(`⚠️ Error al obtener producto:`, error.message);
                  }
                }
                
                ingredientes.push(ingrediente);
              }
            }
          } catch (error) {
            console.warn(`⚠️ Error al obtener detalles de receta:`, error.message);
          }
        }
        
        // Obtener información del producto
        let producto = null;
        if (orden.producto_id) {
          try {
            const productoDoc = await db.collection('productos').doc(orden.producto_id).get();
            if (productoDoc.exists) {
              producto = {
                id: productoDoc.id,
                ...productoDoc.data()
              };
            }
          } catch (error) {
            console.warn(`⚠️ Error al obtener producto:`, error.message);
          }
        }
        
        const respuesta = {
          orden,
          receta,
          ingredientes,
          producto
        };
        
        console.log(`✅ [PRODUCCIÓN] Orden obtenida con detalles completos`);
        
        res.json({
          success: true,
          data: respuesta,
          message: 'Orden de producción obtenida correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PRODUCCIÓN] Error al obtener orden:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener orden de producción',
          error: error.message
        });
        return true;
      }
    }
    
    // POST /produccion - Crear nueva orden de producción
    if (req.method === 'POST' && pathParts.length === 1) {
      try {
        const nuevaOrden = req.body;
        
        console.log('🏭 [PRODUCCIÓN] Creando nueva orden de producción');
        
        // Validaciones
        if (!nuevaOrden.receta_id) {
          res.status(400).json({
            success: false,
            message: 'La receta es obligatoria'
          });
          return true;
        }
        
        if (!nuevaOrden.cantidad || parseInt(nuevaOrden.cantidad) < 1) {
          res.status(400).json({
            success: false,
            message: 'La cantidad debe ser al menos 1'
          });
          return true;
        }
        
        // Verificar que la receta existe y está activa
        const recetaDoc = await db.collection('recetas').doc(nuevaOrden.receta_id).get();
        if (!recetaDoc.exists) {
          res.status(400).json({
            success: false,
            message: 'La receta especificada no existe'
          });
          return true;
        }
        
        const recetaData = recetaDoc.data();
        if (!recetaData.activo) {
          res.status(400).json({
            success: false,
            message: 'La receta no está activa'
          });
          return true;
        }
        
        // Verificar que el producto existe
        if (!recetaData.producto_id) {
          res.status(400).json({
            success: false,
            message: 'La receta no tiene un producto asociado'
          });
          return true;
        }
        
        const productoDoc = await db.collection('productos').doc(recetaData.producto_id).get();
        if (!productoDoc.exists) {
          res.status(400).json({
            success: false,
            message: 'El producto de la receta no existe'
          });
          return true;
        }
        
        // Obtener sucursal principal si no se especifica
        let sucursalId = nuevaOrden.sucursal_id;
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
              message: 'No se encontró sucursal principal'
            });
            return true;
          }
        }
        
        // VERIFICAR STOCK DE MATERIAS PRIMAS (ahora productos) ANTES DE CREAR LA ORDEN
        console.log('🔍 [PRODUCCIÓN] Verificando stock de ingredientes...');
        
        const ingredientesSnapshot = await db.collection('recetas_detalles')
          .where('receta_id', '==', nuevaOrden.receta_id)
          .get();
        
        const stockInsuficiente = [];
        
        for (const doc of ingredientesSnapshot.docs) {
          const ingrediente = doc.data();
          
          // MODIFICADO: Buscar en productos
          const productoId = ingrediente.producto_id || ingrediente.materia_prima_id;
          
          if (productoId && ingrediente.cantidad) {
            // Verificar stock en stock_sucursal
            const stockQuery = await db.collection('stock_sucursal')
              .where('producto_id', '==', productoId)
              .where('sucursal_id', '==', sucursalId)
              .limit(1)
              .get();
            
            let stockActual = 0;
            if (!stockQuery.empty) {
              stockActual = parseFloat(stockQuery.docs[0].data().cantidad || 0);
            }
            
            // Calcular cantidad necesaria
            const cantidadBase = parseFloat(ingrediente.cantidad);
            const rendimientoReceta = parseInt(recetaData.rendimiento || 1);
            const cantidadOrden = parseInt(nuevaOrden.cantidad);
            const cantidadNecesaria = (cantidadBase * cantidadOrden) / rendimientoReceta;
            
            // Obtener nombre del producto
            const productoDoc = await db.collection('productos').doc(productoId).get();
            const nombreProducto = productoDoc.exists ? productoDoc.data().nombre : 'Producto no encontrado';
            
            console.log(`  📦 ${nombreProducto}: Stock=${stockActual}, Necesario=${cantidadNecesaria}`);
            
            if (stockActual < cantidadNecesaria) {
              stockInsuficiente.push({
                producto_id: productoId,
                nombre: nombreProducto,
                stock_actual: stockActual,
                cantidad_necesaria: cantidadNecesaria,
                faltante: cantidadNecesaria - stockActual
              });
            }
          }
        }
        
        if (stockInsuficiente.length > 0) {
          console.error('❌ [PRODUCCIÓN] Stock insuficiente:', stockInsuficiente);
          res.status(400).json({
            success: false,
            message: 'Stock insuficiente de ingredientes',
            detalles_error: stockInsuficiente
          });
          return true;
        }
        
        console.log('✅ [PRODUCCIÓN] Stock verificado - Todo disponible');
        
        // Calcular costos
        let costoMateriasPrimas = 0;
        
        for (const doc of ingredientesSnapshot.docs) {
          const ingrediente = doc.data();
          
          const productoId = ingrediente.producto_id || ingrediente.materia_prima_id;
          if (productoId && ingrediente.cantidad) {
            const productoDoc = await db.collection('productos').doc(productoId).get();
            
            if (productoDoc.exists) {
              const producto = productoDoc.data();
              const cantidadBase = parseFloat(ingrediente.cantidad);
              const rendimientoReceta = parseInt(recetaData.rendimiento || 1);
              const cantidadOrden = parseInt(nuevaOrden.cantidad);
              const cantidadNecesaria = (cantidadBase * cantidadOrden) / rendimientoReceta;
              
              costoMateriasPrimas += cantidadNecesaria * parseFloat(producto.precio_costo || producto.precio_unitario || 0);
            }
          }
        }
        
        const costoManoObra = parseFloat(recetaData.costo_mano_obra || 0) * parseInt(nuevaOrden.cantidad) / parseInt(recetaData.rendimiento || 1);
        const costoAdicional = parseFloat(recetaData.costo_adicional || 0) * parseInt(nuevaOrden.cantidad) / parseInt(recetaData.rendimiento || 1);
        const costoTotal = costoMateriasPrimas + costoManoObra + costoAdicional;
        const costoUnitario = costoTotal / parseInt(nuevaOrden.cantidad);
        
        // Generar número de orden
        const timestamp = Date.now();
        const numeroOrden = `OP-${timestamp}`;
        
        // Crear estructura para Firebase
        const ordenFirebase = {
          numero: numeroOrden,
          receta_id: nuevaOrden.receta_id,
          producto_id: recetaData.producto_id,
          cantidad: parseInt(nuevaOrden.cantidad),
          estado: 'pendiente',
          fecha_orden: nuevaOrden.fecha_orden || new Date().toISOString(),
          fecha_produccion: null,
          fecha_completada: null,
          usuario_id: nuevaOrden.usuario_id || 'sistema',
          usuario_nombre: nuevaOrden.usuario_nombre || 'Sistema',
          usuario_apellido: nuevaOrden.usuario_apellido || '',
          notas: nuevaOrden.notas || '',
          costo_materias_primas: costoMateriasPrimas,
          costo_mano_obra: costoManoObra,
          costo_adicional: costoAdicional,
          costo_total: costoTotal,
          costo_unitario: costoUnitario,
          sucursal_id: sucursalId,
          fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Crear la orden
        const docRef = await db.collection('ordenes_produccion').add(ordenFirebase);
        
        console.log(`✅ [PRODUCCIÓN] Orden creada: ${docRef.id} - ${numeroOrden}`);
        
        res.status(201).json({
          success: true,
          data: {
            id: docRef.id,
            ...ordenFirebase
          },
          message: 'Orden de producción creada correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PRODUCCIÓN] Error al crear orden:', error);
        res.status(500).json({
          success: false,
          message: 'Error al crear orden de producción',
          error: error.message
        });
        return true;
      }
    }
    
    // PATCH /produccion/:id/estado - Cambiar estado de orden
    if (req.method === 'PATCH' && pathParts.length === 3 && pathParts[2] === 'estado') {
      try {
        const ordenId = pathParts[1];
        const { estado, usuario_id, usuario_nombre } = req.body;
        
        console.log(`🏭 [PRODUCCIÓN] Cambiando estado de orden ${ordenId} a: ${estado}`);
        
        // Validar estado
        const estadosPermitidos = ['pendiente', 'en_proceso', 'completada', 'cancelada'];
        if (!estadosPermitidos.includes(estado)) {
          res.status(400).json({
            success: false,
            message: 'Estado inválido'
          });
          return true;
        }
        
        // Obtener orden actual
        const ordenDoc = await db.collection('ordenes_produccion').doc(ordenId).get();
        if (!ordenDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Orden de producción no encontrada'
          });
          return true;
        }
        
        const ordenActual = ordenDoc.data();
        
        // Validar transiciones de estado
        if (ordenActual.estado === 'completada' || ordenActual.estado === 'cancelada') {
          res.status(400).json({
            success: false,
            message: 'No se puede cambiar el estado de una orden completada o cancelada'
          });
          return true;
        }
        
        // Preparar actualización
        const actualizacion = {
          estado,
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (estado === 'en_proceso') {
          actualizacion.fecha_produccion = admin.firestore.FieldValue.serverTimestamp();
        } else if (estado === 'completada') {
          actualizacion.fecha_completada = admin.firestore.FieldValue.serverTimestamp();
        }
        
        // USAR TRANSACCIÓN PARA OPERACIONES CRÍTICAS
        const resultado = await db.runTransaction(async (transaction) => {
          // Actualizar orden
          transaction.update(ordenDoc.ref, actualizacion);
          
          // Si se completa la orden, ejecutar la producción
          if (estado === 'completada') {
            console.log('🏭 [PRODUCCIÓN] Ejecutando producción - Actualizando stocks...');
            
            // Obtener sucursal
            const sucursalId = ordenActual.sucursal_id;
            if (!sucursalId) {
              throw new Error('Orden sin sucursal asignada');
            }
            
            // Obtener ingredientes de la receta
            const ingredientesSnapshot = await db.collection('recetas_detalles')
              .where('receta_id', '==', ordenActual.receta_id)
              .get();
            
            // Obtener datos de la receta
            const recetaDoc = await db.collection('recetas').doc(ordenActual.receta_id).get();
            const recetaData = recetaDoc.data();
            
            // DESCONTAR INGREDIENTES (productos tipo materia prima)
            for (const doc of ingredientesSnapshot.docs) {
              const ingrediente = doc.data();
              
              // MODIFICADO: Usar producto_id
              const productoId = ingrediente.producto_id || ingrediente.materia_prima_id;
              
              if (productoId && ingrediente.cantidad) {
                // Calcular cantidad a descontar
                const cantidadBase = parseFloat(ingrediente.cantidad);
                const rendimientoReceta = parseInt(recetaData.rendimiento || 1);
                const cantidadOrden = parseInt(ordenActual.cantidad);
                const cantidadADescontar = (cantidadBase * cantidadOrden) / rendimientoReceta;
                
                // Buscar stock en stock_sucursal
                const stockQuery = await db.collection('stock_sucursal')
                  .where('producto_id', '==', productoId)
                  .where('sucursal_id', '==', sucursalId)
                  .limit(1)
                  .get();
                
                if (!stockQuery.empty) {
                  const stockDoc = stockQuery.docs[0];
                  const stockData = stockDoc.data();
                  const stockActual = parseFloat(stockData.cantidad || 0);
                  const nuevoStock = Math.max(0, stockActual - cantidadADescontar);
                  
                  // Actualizar stock en stock_sucursal
                  transaction.update(stockDoc.ref, {
                    cantidad: nuevoStock,
                    ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
                  });
                  
                  // Obtener nombre del producto para log
                  const productoDoc = await db.collection('productos').doc(productoId).get();
                  const nombreProducto = productoDoc.exists ? productoDoc.data().nombre : 'Producto';
                  
                  console.log(`  📦 Descontando ${nombreProducto}: ${stockActual} - ${cantidadADescontar} = ${nuevoStock}`);
                  
                  // Registrar movimiento
                  const movimientoRef = db.collection('movimientos_stock').doc();
                  transaction.set(movimientoRef, {
                    sucursal_id: sucursalId,
                    producto_id: productoId,
                    tipo: 'salida',
                    cantidad: cantidadADescontar,
                    stock_anterior: stockActual,
                    stock_nuevo: nuevoStock,
                    motivo: 'Producción',
                    referencia_tipo: 'orden_produccion',
                    referencia_id: ordenId,
                    fecha: admin.firestore.FieldValue.serverTimestamp(),
                    usuario_id: usuario_id || 'sistema'
                  });
                } else {
                  console.warn(`⚠️ No se encontró stock para producto ${productoId} en sucursal ${sucursalId}`);
                }
              }
            }
            
            // AGREGAR PRODUCTO TERMINADO AL STOCK
            const productoId = ordenActual.producto_id;
            const cantidadProducida = parseInt(ordenActual.cantidad);
            
            // Buscar stock existente del producto en sucursal
            const stockProductoQuery = await db.collection('stock_sucursal')
              .where('producto_id', '==', productoId)
              .where('sucursal_id', '==', sucursalId)
              .limit(1)
              .get();
            
            if (stockProductoQuery.empty) {
              // Crear nuevo registro de stock
              const nuevoStockRef = db.collection('stock_sucursal').doc();
              transaction.set(nuevoStockRef, {
                producto_id: productoId,
                sucursal_id: sucursalId,
                cantidad: cantidadProducida,
                stock_minimo: 5,
                ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
              });
              
              console.log(`  📦 Creando stock de producto: ${cantidadProducida} unidades`);
            } else {
              // Actualizar stock existente
              const stockDoc = stockProductoQuery.docs[0];
              const stockData = stockDoc.data();
              const stockActual = parseInt(stockData.cantidad || 0);
              const nuevoStock = stockActual + cantidadProducida;
              
              transaction.update(stockDoc.ref, {
                cantidad: nuevoStock,
                ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
              });
              
              console.log(`  📦 Actualizando stock de producto: ${stockActual} + ${cantidadProducida} = ${nuevoStock}`);
            }
            
            // Registrar movimiento de producto terminado
            const movimientoProductoRef = db.collection('movimientos_stock').doc();
            transaction.set(movimientoProductoRef, {
              sucursal_id: sucursalId,
              producto_id: productoId,
              tipo: 'entrada',
              cantidad: cantidadProducida,
              motivo: 'Producción completada',
              referencia_tipo: 'orden_produccion',
              referencia_id: ordenId,
              fecha: admin.firestore.FieldValue.serverTimestamp(),
              usuario_id: usuario_id || 'sistema'
            });
            
            // Actualizar costo del producto si es necesario
            const productoDoc = await db.collection('productos').doc(productoId).get();
            if (productoDoc.exists) {
              const costoUnitarioProduccion = parseFloat(ordenActual.costo_unitario || 0);
              
              transaction.update(productoDoc.ref, {
                costo_produccion: costoUnitarioProduccion,
                fecha_ultimo_costo: admin.firestore.FieldValue.serverTimestamp()
              });
              
              console.log(`  💰 Actualizando costo de producto: $${costoUnitarioProduccion}`);
            }
          }
          
          return true;
        });
        
        // Crear notificación del cambio de estado
        try {
          let titulo, mensaje;
          
          if (estado === 'en_proceso') {
            titulo = '🏭 Producción Iniciada';
            mensaje = `La orden ${ordenActual.numero} ha iniciado producción`;
          } else if (estado === 'completada') {
            titulo = '✅ Producción Completada';
            mensaje = `La orden ${ordenActual.numero} ha sido completada. ${ordenActual.cantidad} unidades producidas.`;
          } else if (estado === 'cancelada') {
            titulo = '❌ Producción Cancelada';
            mensaje = `La orden ${ordenActual.numero} ha sido cancelada`;
          }
          
          if (titulo && mensaje) {
            await crearNotificacionProduccion({
              tipo: 'orden_produccion',
              titulo: titulo,
              mensaje: mensaje,
              usuario_id: ordenActual.usuario_id,
              usuario_nombre: ordenActual.usuario_nombre || 'Usuario',
              prioridad: estado === 'completada' ? 'alta' : 'media',
              datos: {
                orden_id: ordenId,
                numero_orden: ordenActual.numero,
                estado: estado,
                cantidad: ordenActual.cantidad,
                producto_id: ordenActual.producto_id
              },
              acciones: [
                {
                  texto: 'Ver Orden',
                  tipo: 'primary',
                  ruta: `/produccion/${ordenId}`
                }
              ]
            });
          }
        } catch (notifError) {
          console.error('❌ [PRODUCCIÓN] Error al crear notificación:', notifError);
        }
        
        console.log(`✅ [PRODUCCIÓN] Estado cambiado a: ${estado}`);
        
        res.json({
          success: true,
          data: {
            id: ordenId,
            estado,
            ...actualizacion
          },
          message: `Orden ${estado === 'completada' ? 'completada. Stock actualizado.' : 'actualizada correctamente'}`
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PRODUCCIÓN] Error al cambiar estado:', error);
        res.status(500).json({
          success: false,
          message: 'Error al cambiar estado de la orden',
          error: error.message
        });
        return true;
      }
    }
    
    // GET /produccion/pendientes - Obtener órdenes pendientes
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[1] === 'pendientes') {
      try {
        console.log('🏭 [PRODUCCIÓN] Obteniendo órdenes pendientes');
        
        const ordenesSnapshot = await db.collection('ordenes_produccion')
          .where('estado', '==', 'pendiente')
          .orderBy('fecha_orden', 'asc')
          .get();
        
        const ordenes = [];
        
        ordenesSnapshot.forEach(doc => {
          ordenes.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log(`✅ [PRODUCCIÓN] ${ordenes.length} órdenes pendientes`);
        
        res.json({
          success: true,
          data: ordenes,
          total: ordenes.length,
          message: 'Órdenes pendientes obtenidas correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PRODUCCIÓN] Error al obtener órdenes pendientes:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener órdenes pendientes',
          error: error.message
        });
        return true;
      }
    }
    
    // Si ninguna ruta coincide, devolver false
    console.log(`⚠️ [PRODUCCIÓN] Ruta no encontrada: ${req.method} ${path}`);
    return false;
    
  } catch (error) {
    console.error('❌ [PRODUCCIÓN] Error crítico en rutas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = produccionRoutes;