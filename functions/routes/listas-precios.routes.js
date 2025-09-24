// functions/routes/listas-precios.routes.js - CORREGIDO
const admin = require('firebase-admin');
const db = admin.firestore();

const listasPreciosRoutes = async (req, res, path) => {
  try {
    // PUT /listas-precios/producto/:id - Actualizar precios de un producto
    if (path.match(/^\/listas-precios\/producto\/[^\/]+$/) && req.method === 'PUT') {
      const productoId = path.split('/')[3];
      const { precio_costo, listas_precios, motivo, usuario_id } = req.body;
      
      try {
        console.log(`📝 Actualizando precios del producto ${productoId}`);
        
        // Obtener producto actual para historial
        const productoDoc = await db.collection('productos').doc(productoId).get();
        
        if (!productoDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Producto no encontrado'
          });
          return true;
        }
        
        const productoActual = productoDoc.data();
        
        // Preparar cambios para historial
        const cambios = {
          precio_costo: {
            anterior: productoActual.precio_costo || 0,
            nuevo: parseFloat(precio_costo || 0)
          },
          listas_precios: {}
        };
        
        // Registrar cambios en listas
        ['mayorista', 'interior', 'posadas'].forEach(lista => {
          cambios.listas_precios[lista] = {
            anterior: productoActual.listas_precios?.[lista] || productoActual.precio_venta || 0,
            nuevo: parseFloat(listas_precios[lista] || 0)
          };
        });
        
        // Crear registro en historial
        await db.collection('historial_precios').add({
          producto_id: productoId,
          fecha: admin.firestore.FieldValue.serverTimestamp(),
          usuario_id: usuario_id || 'sistema',
          cambios,
          motivo: motivo || 'Actualización manual'
        });
        
        // Actualizar producto - CORREGIDO para persistir correctamente
        const actualizacion = {
          precio_costo: parseFloat(precio_costo || 0),
          listas_precios: {
            mayorista: parseFloat(listas_precios.mayorista || 0),
            interior: parseFloat(listas_precios.interior || 0),
            posadas: parseFloat(listas_precios.posadas || 0)
          },
          precio_venta: parseFloat(listas_precios.posadas || 0), // Posadas como default
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('📝 Datos a actualizar:', actualizacion);
        
        await db.collection('productos').doc(productoId).update(actualizacion);
        
        // Verificar que se guardó correctamente
        const productoActualizado = await db.collection('productos').doc(productoId).get();
        console.log('✅ Producto después de actualizar:', productoActualizado.data());
        
        console.log('✅ Precios actualizados correctamente');
        
        res.json({
          success: true,
          message: 'Precios actualizados correctamente'
        });
        
      } catch (error) {
        console.error('❌ Error al actualizar precios:', error);
        res.status(500).json({
          success: false,
          message: 'Error al actualizar precios',
          error: error.message
        });
      }
      
      return true;
    }
    
    // GET /listas-precios/historial/:productoId - Obtener historial
    if (path.match(/^\/listas-precios\/historial\/[^\/]+$/) && req.method === 'GET') {
      const productoId = path.split('/')[3];
      
      try {
        const historialSnapshot = await db.collection('historial_precios')
          .where('producto_id', '==', productoId)
          .orderBy('fecha', 'desc')
          .limit(50)
          .get();
        
        const historial = [];
        historialSnapshot.forEach(doc => {
          const data = doc.data();
          historial.push({
            id: doc.id,
            ...data,
            fecha: data.fecha?.toDate ? data.fecha.toDate().toISOString() : data.fecha
          });
        });
        
        res.json({
          success: true,
          data: historial,
          message: 'Historial obtenido correctamente'
        });
        
      } catch (error) {
        console.error('❌ Error al obtener historial:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener historial',
          error: error.message
        });
      }
      
      return true;
    }
    
    // PUT /listas-precios/masivo - Actualización masiva
    if (path === '/listas-precios/masivo' && req.method === 'PUT') {
      const { 
        tipo_actualizacion, 
        valor, 
        lista_precio, 
        categoria_id, 
        usuario_id,
        base_calculo = 'precio_venta',
        tipo_redondeo = 'sin_redondeo'
      } = req.body;
      
      try {
        console.log('🔄 Ejecutando actualización masiva de precios');
        console.log('📊 Configuración:', { tipo_actualizacion, valor, base_calculo, tipo_redondeo });
        
        // Función para redondear según el tipo seleccionado
        const aplicarRedondeo = (precio) => {
		  switch (tipo_redondeo) {
			case 'arriba':
			  return Math.ceil(precio);
			case 'abajo':
			  return Math.floor(precio);
			case 'multiplo_5':
			  return Math.round(precio / 5) * 5;
			case 'multiplo_10':
			  return Math.round(precio / 10) * 10;
			case 'centena':
			  return Math.round(precio / 100) * 100;
			case 'sin_redondeo':
			  return parseFloat(precio.toFixed(2));
			default:
			  return parseFloat(precio.toFixed(2));
		  }
		};
        
        const batch = db.batch();
        let query = db.collection('productos').where('activo', '==', true);
        
        // Si se especifica categoría, filtrar por ella
        if (categoria_id) {
          query = query.where('categoria_id', '==', categoria_id);
        }
        
        const productosSnapshot = await query.get();
        
        let actualizados = 0;
        
        productosSnapshot.forEach(doc => {
          const producto = doc.data();
          const nuevasListas = { ...producto.listas_precios };
          
          // Asegurar que existan las listas
          if (!nuevasListas.mayorista) nuevasListas.mayorista = producto.precio_venta || 0;
          if (!nuevasListas.interior) nuevasListas.interior = producto.precio_venta || 0;
          if (!nuevasListas.posadas) nuevasListas.posadas = producto.precio_venta || 0;
          
          // Determinar la base de cálculo
          const baseCalculo = base_calculo === 'precio_costo' 
            ? parseFloat(producto.precio_costo || 0)
            : null; // Si es null, usamos el precio actual de cada lista
          
          if (tipo_actualizacion === 'porcentaje') {
            // Aumentar/disminuir por porcentaje
            if (lista_precio === 'todas') {
              ['mayorista', 'interior', 'posadas'].forEach(lista => {
                const precioBase = baseCalculo || parseFloat(nuevasListas[lista] || producto.precio_venta || 0);
                const nuevoPrecio = precioBase * (1 + valor / 100);
                nuevasListas[lista] = aplicarRedondeo(nuevoPrecio);
              });
            } else {
              const precioBase = baseCalculo || parseFloat(nuevasListas[lista_precio] || producto.precio_venta || 0);
              const nuevoPrecio = precioBase * (1 + valor / 100);
              nuevasListas[lista_precio] = aplicarRedondeo(nuevoPrecio);
            }
          } else if (tipo_actualizacion === 'monto_fijo') {
            // Aumentar/disminuir por monto fijo
            if (lista_precio === 'todas') {
              ['mayorista', 'interior', 'posadas'].forEach(lista => {
                const precioBase = baseCalculo || parseFloat(nuevasListas[lista] || producto.precio_venta || 0);
                const nuevoPrecio = precioBase + valor;
                nuevasListas[lista] = aplicarRedondeo(nuevoPrecio);
              });
            } else {
              const precioBase = baseCalculo || parseFloat(nuevasListas[lista_precio] || producto.precio_venta || 0);
              const nuevoPrecio = precioBase + valor;
              nuevasListas[lista_precio] = aplicarRedondeo(nuevoPrecio);
            }
          }
          
          // Asegurar que los precios no sean negativos
          Object.keys(nuevasListas).forEach(lista => {
            nuevasListas[lista] = Math.max(0, nuevasListas[lista]);
          });
          
          batch.update(doc.ref, {
            listas_precios: nuevasListas,
            precio_venta: nuevasListas.posadas,
            fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
          });
          
          actualizados++;
        });
        
        await batch.commit();
        
        // Registrar en historial
        await db.collection('historial_precios').add({
          producto_id: 'MASIVO',
          fecha: admin.firestore.FieldValue.serverTimestamp(),
          usuario_id: usuario_id || 'sistema',
          cambios: {
            tipo: 'actualizacion_masiva',
            tipo_actualizacion,
            valor,
            lista_precio,
            categoria_id: categoria_id || 'todas',
            productos_afectados: actualizados,
            base_calculo,
            tipo_redondeo
          },
          motivo: `Actualización masiva: ${tipo_actualizacion} ${valor}${tipo_actualizacion === 'porcentaje' ? '%' : '$'} en ${lista_precio} desde ${base_calculo}`
        });
        
        console.log(`✅ ${actualizados} productos actualizados`);
        
        res.json({
          success: true,
          message: `${actualizados} productos actualizados correctamente`,
          data: {
            actualizados
          }
        });
        
      } catch (error) {
        console.error('❌ Error en actualización masiva:', error);
        res.status(500).json({
          success: false,
          message: 'Error en actualización masiva',
          error: error.message
        });
      }
      
      return true;
    }
    
    // GET /listas-precios/generar-pdf - Generar PDF de lista de precios
    if (path === '/listas-precios/generar-pdf' && req.method === 'POST') {
      const { categoria_id, lista_tipo, incluir_stock } = req.body;
      
      try {
        // Este endpoint devuelve los datos necesarios para generar el PDF en el frontend
        let query = db.collection('productos').where('activo', '==', true);
        
        if (categoria_id) {
          query = query.where('categoria_id', '==', categoria_id);
        }
        
        const productosSnapshot = await query.orderBy('nombre').get();
        const productos = [];
        
        for (const doc of productosSnapshot.docs) {
          const producto = doc.data();
          
          // Obtener categoría
          let categoriaNombre = 'General';
          if (producto.categoria_id) {
            const categoriaDoc = await db.collection('categorias').doc(producto.categoria_id).get();
            if (categoriaDoc.exists) {
              categoriaNombre = categoriaDoc.data().nombre;
            }
          }
          
          const productoData = {
            id: doc.id,
            codigo: producto.codigo || '',
            nombre: producto.nombre || '',
            categoria: categoriaNombre,
            listas_precios: producto.listas_precios || {
              mayorista: producto.precio_venta || 0,
              interior: producto.precio_venta || 0,
              posadas: producto.precio_venta || 0
            }
          };
          
          if (incluir_stock) {
            productoData.stock_actual = producto.stock_actual || 0;
          }
          
          productos.push(productoData);
        }
        
        res.json({
          success: true,
          data: {
            productos,
            fecha_generacion: new Date().toISOString(),
            tipo_lista: lista_tipo || 'todas'
          },
          message: 'Datos para PDF generados correctamente'
        });
        
      } catch (error) {
        console.error('❌ Error al generar datos para PDF:', error);
        res.status(500).json({
          success: false,
          message: 'Error al generar datos para PDF',
          error: error.message
        });
      }
      
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de listas de precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = listasPreciosRoutes;