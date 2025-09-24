// functions/routes/recetas.routes.js - MODIFICADO PARA USAR PRODUCTOS
const admin = require('firebase-admin');
const db = admin.firestore();

const recetasRoutes = async (req, res, path) => {
  try {
    const pathParts = path.split('/').filter(p => p);
    
    // GET /recetas - Obtener todas las recetas
    if (req.method === 'GET' && pathParts.length === 1) {
      try {
        console.log('📋 [RECETAS] Obteniendo todas las recetas');
        
        const recetasSnapshot = await db.collection('recetas')
          .orderBy('nombre', 'asc')
          .get();
        
        const recetas = [];
        
        // Procesar cada receta y enriquecer con información del producto
        for (const doc of recetasSnapshot.docs) {
          const receta = {
            id: doc.id,
            ...doc.data()
          };
          
          // Enriquecer con información del producto
          if (receta.producto_id) {
            try {
              const productoDoc = await db.collection('productos').doc(receta.producto_id).get();
              if (productoDoc.exists) {
                const productoData = productoDoc.data();
                receta.producto_info = {
                  id: productoDoc.id,
                  codigo: productoData.codigo,
                  nombre: productoData.nombre,
                  descripcion: productoData.descripcion,
                  precio_venta: productoData.precio_venta
                };
                receta.producto_nombre = productoData.nombre;
                receta.producto_codigo = productoData.codigo;
              }
            } catch (productoError) {
              console.warn(`⚠️ Error al obtener producto ${receta.producto_id}:`, productoError.message);
            }
          }
          
          recetas.push(receta);
        }
        
        console.log(`✅ [RECETAS] ${recetas.length} recetas obtenidas`);
        
        res.json({
          success: true,
          data: recetas,
          total: recetas.length,
          message: 'Recetas obtenidas correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [RECETAS] Error al obtener recetas:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener recetas',
          error: error.message
        });
        return true;
      }
    }
    
    // GET /recetas/activas - Obtener solo recetas activas
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[1] === 'activas') {
      try {
        console.log('📋 [RECETAS] Obteniendo recetas activas');
        
        const recetasSnapshot = await db.collection('recetas')
          .where('activo', '==', true)
          .orderBy('nombre', 'asc')
          .get();
        
        const recetas = [];
        
        for (const doc of recetasSnapshot.docs) {
          const receta = {
            id: doc.id,
            ...doc.data()
          };
          
          // Enriquecer con producto
          if (receta.producto_id) {
            try {
              const productoDoc = await db.collection('productos').doc(receta.producto_id).get();
              if (productoDoc.exists) {
                receta.producto_nombre = productoDoc.data().nombre;
                receta.producto_codigo = productoDoc.data().codigo;
              }
            } catch (error) {
              console.warn(`⚠️ Error al obtener producto:`, error.message);
            }
          }
          
          recetas.push(receta);
        }
        
        console.log(`✅ [RECETAS] ${recetas.length} recetas activas`);
        
        res.json({
          success: true,
          data: recetas,
          total: recetas.length,
          message: 'Recetas activas obtenidas correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [RECETAS] Error al obtener recetas activas:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener recetas activas',
          error: error.message
        });
        return true;
      }
    }
    
    // NUEVO ENDPOINT - GET /recetas/materias-primas
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[1] === 'materias-primas') {
	  try {
		console.log('🧪 [RECETAS] Obteniendo productos tipo materia prima con stock');
		
		// Obtener sucursal del query param si se proporciona
		const { sucursal_id } = req.query;
		console.log('📍 Sucursal solicitada:', sucursal_id || 'ninguna');
		
		// Primero obtener el ID de la categoría "Materias Primas"
		const categoriasSnapshot = await db.collection('categorias')
		  .where('nombre', '==', 'Materias Primas')
		  .limit(1)
		  .get();
		
		if (categoriasSnapshot.empty) {
		  res.status(404).json({
			success: false,
			message: 'Categoría "Materias Primas" no encontrada'
		  });
		  return true;
		}
		
		const categoriaMP = categoriasSnapshot.docs[0].id;
		
		// Obtener todos los productos de esa categoría
		const productosSnapshot = await db.collection('productos').get();
		
		const materiasPrimas = [];
		
		// Filtrar y enriquecer con stock por sucursal
		for (const doc of productosSnapshot.docs) {
		  const producto = doc.data();
		  
		  // Filtrar por categoría y activo
		  if (producto.categoria_id === categoriaMP && producto.activo !== false) {
			let stockActual = 0;
			let stockMinimo = producto.stock_minimo || 5;
			
			// Si se especificó sucursal, obtener stock de esa sucursal
			if (sucursal_id) {
			  const stockQuery = await db.collection('stock_sucursal')
				.where('producto_id', '==', doc.id)
				.where('sucursal_id', '==', sucursal_id)
				.limit(1)
				.get();
			  
			  if (!stockQuery.empty) {
				const stockData = stockQuery.docs[0].data();
				stockActual = parseFloat(stockData.cantidad || 0);
				stockMinimo = parseFloat(stockData.stock_minimo || stockMinimo);
				
				console.log(`📦 Stock de ${producto.nombre}: ${stockActual}`);
			  }
			} else {
			  // Si no hay sucursal, usar el stock global del producto
			  stockActual = parseFloat(producto.stock_actual || 0);
			}
			
			materiasPrimas.push({
			  id: doc.id,
			  ...producto,
			  stock_actual: stockActual, // Stock específico de la sucursal
			  stock_sucursal: stockActual, // Campo adicional para claridad
			  stock_minimo: stockMinimo,
			  sucursal_id: sucursal_id || null
			});
		  }
		}
		
		// Ordenar por nombre
		materiasPrimas.sort((a, b) => {
		  const nombreA = a.nombre || '';
		  const nombreB = b.nombre || '';
		  return nombreA.localeCompare(nombreB);
		});
		
		console.log(`✅ [RECETAS] ${materiasPrimas.length} materias primas encontradas con stock`);
		
		res.json({
		  success: true,
		  data: materiasPrimas,
		  total: materiasPrimas.length,
		  sucursal_id: sucursal_id || null,
		  message: 'Materias primas obtenidas correctamente con stock'
		});
		return true;
		
	  } catch (error) {
		console.error('❌ [RECETAS] Error al obtener materias primas:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al obtener materias primas',
		  error: error.message
		});
		return true;
	  }
	}
    
    // GET /recetas/:id - Obtener receta por ID
    if (req.method === 'GET' && pathParts.length === 2 && !['activas', 'buscar', 'materias-primas'].includes(pathParts[1])) {
      try {
        const recetaId = pathParts[1];
        console.log(`📋 [RECETAS] Obteniendo receta: ${recetaId}`);
        
        const recetaDoc = await db.collection('recetas').doc(recetaId).get();
        
        if (!recetaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Receta no encontrada'
          });
          return true;
        }
        
        const receta = {
          id: recetaDoc.id,
          ...recetaDoc.data()
        };
        
        // Enriquecer con información del producto
        if (receta.producto_id) {
          try {
            const productoDoc = await db.collection('productos').doc(receta.producto_id).get();
            if (productoDoc.exists) {
              const productoData = productoDoc.data();
              receta.producto_info = {
                id: productoDoc.id,
                codigo: productoData.codigo,
                nombre: productoData.nombre,
                descripcion: productoData.descripcion,
                precio_venta: productoData.precio_venta
              };
            }
          } catch (error) {
            console.warn(`⚠️ Error al obtener producto:`, error.message);
          }
        }
        
        console.log(`✅ [RECETAS] Receta obtenida: ${receta.nombre}`);
        
        res.json({
          success: true,
          data: receta,
          message: 'Receta obtenida correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [RECETAS] Error al obtener receta:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener receta',
          error: error.message
        });
        return true;
      }
    }
    
    // GET /recetas/:id/detalle - Obtener ingredientes de una receta
    if (req.method === 'GET' && pathParts.length === 3 && pathParts[2] === 'detalle') {
      try {
        const recetaId = pathParts[1];
        console.log(`📋 [RECETAS] Obteniendo ingredientes de receta: ${recetaId}`);
        
        // Verificar que la receta existe
        const recetaDoc = await db.collection('recetas').doc(recetaId).get();
        if (!recetaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Receta no encontrada'
          });
          return true;
        }
        
        // Obtener ingredientes
        const ingredientesSnapshot = await db.collection('recetas_detalles')
          .where('receta_id', '==', recetaId)
          .orderBy('orden', 'asc')
          .get();
        
        const ingredientes = [];
        
        // Enriquecer cada ingrediente con información del producto (antes materia prima)
        for (const doc of ingredientesSnapshot.docs) {
          const ingrediente = {
            id: doc.id,
            ...doc.data()
          };
          
          // MODIFICADO: Buscar en productos, con compatibilidad temporal
          const productoId = ingrediente.producto_id || ingrediente.materia_prima_id;
          
          if (productoId) {
            try {
              const productoDoc = await db.collection('productos').doc(productoId).get();
              if (productoDoc.exists) {
                const productoData = productoDoc.data();
                
                ingrediente.materia_prima_info = {
                  id: productoDoc.id,
                  codigo: productoData.codigo,
                  nombre: productoData.nombre,
                  unidad_medida: productoData.unidad_medida || 'unidad',
                  precio_unitario: productoData.precio_costo || productoData.precio_unitario,
                  stock_actual: productoData.stock_actual
                };
                
                ingrediente.materia_prima_nombre = productoData.nombre;
                ingrediente.unidad_medida = productoData.unidad_medida || 'unidad';
                ingrediente.precio_unitario = productoData.precio_costo || productoData.precio_unitario;
                
                // Calcular subtotal
                const cantidad = parseFloat(ingrediente.cantidad || 0);
                const precio = parseFloat(productoData.precio_costo || productoData.precio_unitario || 0);
                ingrediente.subtotal = cantidad * precio;
              }
            } catch (error) {
              console.warn(`⚠️ Error al obtener producto ${productoId}:`, error.message);
            }
          }
          
          ingredientes.push(ingrediente);
        }
        
        console.log(`✅ [RECETAS] ${ingredientes.length} ingredientes obtenidos`);
        
        res.json({
          success: true,
          data: ingredientes,
          total: ingredientes.length,
          receta_id: recetaId,
          message: 'Ingredientes de receta obtenidos correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [RECETAS] Error al obtener ingredientes:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener ingredientes de la receta',
          error: error.message
        });
        return true;
      }
    }
    
    // GET /recetas/:id/costo - Calcular costo de una receta
    if (req.method === 'GET' && pathParts.length === 3 && pathParts[2] === 'costo') {
      try {
        const recetaId = pathParts[1];
        console.log(`📋 [RECETAS] Calculando costo de receta: ${recetaId}`);
        
        // Obtener receta
        const recetaDoc = await db.collection('recetas').doc(recetaId).get();
        if (!recetaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Receta no encontrada'
          });
          return true;
        }
        
        const recetaData = recetaDoc.data();
        
        // Obtener ingredientes con costos
        const ingredientesSnapshot = await db.collection('recetas_detalles')
          .where('receta_id', '==', recetaId)
          .get();
        
        let costoMateriasPrimas = 0;
        
        // Calcular costo de materias primas (ahora productos)
        for (const doc of ingredientesSnapshot.docs) {
          const ingrediente = doc.data();
          
          // MODIFICADO: Buscar en productos
          const productoId = ingrediente.producto_id || ingrediente.materia_prima_id;
          
          if (productoId && ingrediente.cantidad) {
            try {
              const productoDoc = await db.collection('productos').doc(productoId).get();
              if (productoDoc.exists) {
                const producto = productoDoc.data();
                const cantidad = parseFloat(ingrediente.cantidad);
                const precio = parseFloat(producto.precio_costo || producto.precio_unitario || 0);
                costoMateriasPrimas += cantidad * precio;
              }
            } catch (error) {
              console.warn(`⚠️ Error al calcular costo de ${productoId}:`, error.message);
            }
          }
        }
        
        // Obtener costos adicionales de la receta
        const costoManoObra = parseFloat(recetaData.costo_mano_obra || 0);
        const costoAdicional = parseFloat(recetaData.costo_adicional || 0);
        const rendimiento = parseInt(recetaData.rendimiento || 1);
        
        // Calcular totales
        const costoTotal = costoMateriasPrimas + costoManoObra + costoAdicional;
        const costoUnitario = costoTotal / rendimiento;
        
        const calculoCostos = {
          costo_materias_primas: costoMateriasPrimas,
          costo_mano_obra: costoManoObra,
          costo_adicional: costoAdicional,
          costo_total: costoTotal,
          costo_unitario: costoUnitario,
          rendimiento: rendimiento,
          fecha_calculo: new Date().toISOString()
        };
        
        console.log(`✅ [RECETAS] Costo calculado - Total: $${costoTotal.toFixed(2)}, Unitario: $${costoUnitario.toFixed(2)}`);
        
        res.json({
          success: true,
          data: calculoCostos,
          message: 'Costo de receta calculado correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [RECETAS] Error al calcular costo:', error);
        res.status(500).json({
          success: false,
          message: 'Error al calcular costo de la receta',
          error: error.message
        });
        return true;
      }
    }
    
    // POST /recetas - Crear nueva receta
    if (req.method === 'POST' && pathParts.length === 1) {
      try {
        const { receta, ingredientes } = req.body;
        
        console.log('📋 [RECETAS] Creando nueva receta:', receta?.nombre);
        
        // Validaciones
        if (!receta || !receta.producto_id) {
          res.status(400).json({
            success: false,
            message: 'El producto es obligatorio'
          });
          return true;
        }
        
        if (!receta.nombre || !receta.nombre.trim()) {
          res.status(400).json({
            success: false,
            message: 'El nombre de la receta es obligatorio'
          });
          return true;
        }
        
        if (!receta.rendimiento || parseInt(receta.rendimiento) < 1) {
          res.status(400).json({
            success: false,
            message: 'El rendimiento debe ser al menos 1'
          });
          return true;
        }
        
        if (!ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) {
          res.status(400).json({
            success: false,
            message: 'La receta debe tener al menos un ingrediente'
          });
          return true;
        }
        
        // Verificar que el producto existe
        const productoDoc = await db.collection('productos').doc(receta.producto_id).get();
        if (!productoDoc.exists) {
          res.status(400).json({
            success: false,
            message: 'El producto especificado no existe'
          });
          return true;
        }
        
        // Verificar que no existe otra receta para el mismo producto
        const recetaExistenteSnapshot = await db.collection('recetas')
          .where('producto_id', '==', receta.producto_id)
          .where('activo', '==', true)
          .limit(1)
          .get();
        
        if (!recetaExistenteSnapshot.empty) {
          res.status(400).json({
            success: false,
            message: 'Ya existe una receta activa para este producto'
          });
          return true;
        }
        
        // Usar transacción para crear receta e ingredientes
        const resultado = await db.runTransaction(async (transaction) => {
          // Crear receta
          const recetaFirebase = {
            producto_id: receta.producto_id,
            nombre: receta.nombre.trim(),
            nombre_lower: receta.nombre.toLowerCase().trim(),
            descripcion: receta.descripcion || '',
            rendimiento: parseInt(receta.rendimiento),
            tiempo_preparacion: parseInt(receta.tiempo_preparacion) || null,
            instrucciones: receta.instrucciones || '',
            costo_mano_obra: parseFloat(receta.costo_mano_obra || 0),
            costo_adicional: parseFloat(receta.costo_adicional || 0),
            activo: receta.activo !== false,
            fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
            fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
          };
          
          const recetaRef = db.collection('recetas').doc();
          transaction.set(recetaRef, recetaFirebase);
          
          // Crear ingredientes
          let orden = 1;
          for (const ingrediente of ingredientes) {
            // MODIFICADO: Usar producto_id
            if (!ingrediente.producto_id || !ingrediente.cantidad) {
              throw new Error('Todos los ingredientes deben tener producto y cantidad');
            }
            
            // Verificar que el producto existe
            const productoDoc = await db.collection('productos').doc(ingrediente.producto_id).get();
            if (!productoDoc.exists) {
              throw new Error(`Producto ${ingrediente.producto_id} no encontrado`);
            }
            
            const ingredienteFirebase = {
              receta_id: recetaRef.id,
              producto_id: ingrediente.producto_id, // CAMBIO: Ya no materia_prima_id
              cantidad: parseFloat(ingrediente.cantidad),
              orden: orden++,
              notas: ingrediente.notas || '',
              fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
            };
            
            const ingredienteRef = db.collection('recetas_detalles').doc();
            transaction.set(ingredienteRef, ingredienteFirebase);
          }
          
          return recetaRef.id;
        });
        
        console.log(`✅ [RECETAS] Receta creada: ${resultado}`);
        
        res.status(201).json({
          success: true,
          data: {
            id: resultado,
            ...receta,
            ingredientes_count: ingredientes.length
          },
          message: 'Receta creada correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [RECETAS] Error al crear receta:', error);
        res.status(500).json({
          success: false,
          message: 'Error al crear receta',
          error: error.message
        });
        return true;
      }
    }
    
    // PUT /recetas/:id - Actualizar receta
    if (req.method === 'PUT' && pathParts.length === 2) {
      try {
        const recetaId = pathParts[1];
        const { receta, ingredientes } = req.body;
        
        console.log(`📋 [RECETAS] Actualizando receta: ${recetaId}`);
        
        // Verificar que la receta existe
        const recetaDoc = await db.collection('recetas').doc(recetaId).get();
        if (!recetaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Receta no encontrada'
          });
          return true;
        }
        
        // Usar transacción para actualizar receta e ingredientes
        await db.runTransaction(async (transaction) => {
          // Actualizar receta
          const actualizacion = {
            ...receta,
            fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // Actualizar campos numéricos
          if (receta.rendimiento !== undefined) {
            actualizacion.rendimiento = parseInt(receta.rendimiento);
          }
          if (receta.tiempo_preparacion !== undefined) {
            actualizacion.tiempo_preparacion = parseInt(receta.tiempo_preparacion) || null;
          }
          if (receta.costo_mano_obra !== undefined) {
            actualizacion.costo_mano_obra = parseFloat(receta.costo_mano_obra);
          }
          if (receta.costo_adicional !== undefined) {
            actualizacion.costo_adicional = parseFloat(receta.costo_adicional);
          }
          
          transaction.update(recetaDoc.ref, actualizacion);
          
          // Si se enviaron ingredientes, actualizar todos
          if (ingredientes && Array.isArray(ingredientes)) {
            // Eliminar ingredientes existentes
            const ingredientesExistentesSnapshot = await db.collection('recetas_detalles')
              .where('receta_id', '==', recetaId)
              .get();
            
            ingredientesExistentesSnapshot.forEach(doc => {
              transaction.delete(doc.ref);
            });
            
            // Crear nuevos ingredientes
            let orden = 1;
            for (const ingrediente of ingredientes) {
              // MODIFICADO: Usar producto_id
              if (ingrediente.producto_id && ingrediente.cantidad) {
                const ingredienteFirebase = {
                  receta_id: recetaId,
                  producto_id: ingrediente.producto_id,
                  cantidad: parseFloat(ingrediente.cantidad),
                  orden: orden++,
                  notas: ingrediente.notas || '',
                  fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
                };
                
                const ingredienteRef = db.collection('recetas_detalles').doc();
                transaction.set(ingredienteRef, ingredienteFirebase);
              }
            }
          }
        });
        
        console.log(`✅ [RECETAS] Receta actualizada: ${recetaId}`);
        
        res.json({
          success: true,
          data: {
            id: recetaId,
            ...receta
          },
          message: 'Receta actualizada correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [RECETAS] Error al actualizar receta:', error);
        res.status(500).json({
          success: false,
          message: 'Error al actualizar receta',
          error: error.message
        });
        return true;
      }
    }
    
    // DELETE /recetas/:id - Eliminar receta (desactivar)
    if (req.method === 'DELETE' && pathParts.length === 2) {
      try {
        const recetaId = pathParts[1];
        
        console.log(`📋 [RECETAS] Eliminando receta: ${recetaId}`);
        
        // Verificar que existe
        const recetaDoc = await db.collection('recetas').doc(recetaId).get();
        if (!recetaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Receta no encontrada'
          });
          return true;
        }
        
        // Verificar si está siendo usada en producción
        const produccionSnapshot = await db.collection('ordenes_produccion')
          .where('receta_id', '==', recetaId)
          .where('estado', 'in', ['pendiente', 'en_proceso'])
          .limit(1)
          .get();
        
        if (!produccionSnapshot.empty) {
          res.status(400).json({
            success: false,
            message: 'No se puede eliminar la receta porque tiene órdenes de producción activas'
          });
          return true;
        }
        
        // Desactivar en lugar de eliminar
        await recetaDoc.ref.update({
          activo: false,
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
          fechaEliminacion: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ [RECETAS] Receta desactivada: ${recetaId}`);
        
        res.json({
          success: true,
          message: 'Receta eliminada correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [RECETAS] Error al eliminar receta:', error);
        res.status(500).json({
          success: false,
          message: 'Error al eliminar receta',
          error: error.message
        });
        return true;
      }
    }
    
    // Si ninguna ruta coincide, devolver false
    console.log(`⚠️ [RECETAS] Ruta no encontrada: ${req.method} ${path}`);
	// POST /recetas/:id/verificar-stock - Verificar stock disponible para producción
	if (req.method === 'POST' && pathParts.length === 3 && pathParts[2] === 'verificar-stock') {
	  try {
		const recetaId = pathParts[1];
		const { cantidad, sucursal_id } = req.body;
		
		console.log(`🔍 [RECETAS] Verificando stock para receta ${recetaId}, cantidad: ${cantidad}, sucursal: ${sucursal_id}`);
		
		// Validaciones
		if (!cantidad || cantidad < 1) {
		  res.status(400).json({
			success: false,
			message: 'La cantidad debe ser mayor a 0'
		  });
		  return true;
		}
		
		if (!sucursal_id) {
		  res.status(400).json({
			success: false,
			message: 'Debe especificar la sucursal'
		  });
		  return true;
		}
		
		// Obtener receta
		const recetaDoc = await db.collection('recetas').doc(recetaId).get();
		if (!recetaDoc.exists) {
		  res.status(404).json({
			success: false,
			message: 'Receta no encontrada'
		  });
		  return true;
		}
		
		const receta = recetaDoc.data();
		
		// Obtener ingredientes
		const ingredientesSnapshot = await db.collection('recetas_detalles')
		  .where('receta_id', '==', recetaId)
		  .orderBy('orden', 'asc')
		  .get();
		
		const verificacionStock = [];
		let stockSuficiente = true;
		
		// Verificar cada ingrediente
		for (const doc of ingredientesSnapshot.docs) {
		  const ingrediente = doc.data();
		  const productoId = ingrediente.producto_id || ingrediente.materia_prima_id;
		  
		  if (!productoId) continue;
		  
		  // Calcular cantidad necesaria
		  const cantidadBase = parseFloat(ingrediente.cantidad || 0);
		  const rendimiento = parseInt(receta.rendimiento || 1);
		  const cantidadNecesaria = (cantidadBase * cantidad) / rendimiento;
		  
		  // Obtener información del producto
		  let nombreProducto = 'Producto desconocido';
		  let unidadMedida = 'unidad';
		  
		  try {
			const productoDoc = await db.collection('productos').doc(productoId).get();
			if (productoDoc.exists) {
			  const productoData = productoDoc.data();
			  nombreProducto = productoData.nombre;
			  unidadMedida = productoData.unidad_medida || 'unidad';
			}
		  } catch (error) {
			console.warn(`⚠️ Error al obtener producto ${productoId}:`, error.message);
		  }
		  
		  // CRÍTICO: Buscar stock en stock_sucursal, NO en productos
		  let stockActual = 0;
		  const stockQuery = await db.collection('stock_sucursal')
			.where('producto_id', '==', productoId)
			.where('sucursal_id', '==', sucursal_id)
			.limit(1)
			.get();
		  
		  if (!stockQuery.empty) {
			const stockData = stockQuery.docs[0].data();
			stockActual = parseFloat(stockData.cantidad || 0);
		  }
		  
		  // Verificar si hay suficiente stock
		  const suficiente = stockActual >= cantidadNecesaria;
		  if (!suficiente) {
			stockSuficiente = false;
		  }
		  
		  verificacionStock.push({
			producto_id: productoId,
			nombre: nombreProducto,
			cantidad_necesaria: cantidadNecesaria,
			stock_actual: stockActual,
			suficiente: suficiente,
			faltante: suficiente ? 0 : cantidadNecesaria - stockActual,
			unidad_medida: unidadMedida
		  });
		  
		  console.log(`📦 ${nombreProducto}: necesario=${cantidadNecesaria}, stock=${stockActual}, suficiente=${suficiente}`);
		}
		
		console.log(`✅ [RECETAS] Verificación completada - Stock suficiente: ${stockSuficiente}`);
		
		res.json({
		  success: true,
		  stock_suficiente: stockSuficiente,
		  data: verificacionStock,
		  message: stockSuficiente ? 'Stock suficiente para producir' : 'Stock insuficiente'
		});
		
		return true;
		
	  } catch (error) {
		console.error('❌ [RECETAS] Error al verificar stock:', error);
		res.status(500).json({
		  success: false,
		  message: 'Error al verificar stock',
		  error: error.message
		});
		return true;
	  }
	}
    return false;
    
  } catch (error) {
    console.error('❌ [RECETAS] Error crítico en rutas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = recetasRoutes;