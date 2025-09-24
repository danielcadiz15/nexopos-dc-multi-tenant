// functions/routes/promociones.routes.js
const admin = require('firebase-admin');
const db = admin.firestore();

const promocionesRoutes = async (req, res, path) => {
  try {
    const pathParts = path.split('/').filter(p => p);
    
    // GET /promociones - Obtener todas las promociones
    if (req.method === 'GET' && pathParts.length === 1) {
      try {
        console.log('📋 [PROMOCIONES] Obteniendo todas las promociones');
        
        const promocionesSnapshot = await db.collection('promociones')
          .orderBy('fechaCreacion', 'desc')
          .get();
        
        const promociones = promocionesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`✅ [PROMOCIONES] ${promociones.length} promociones obtenidas`);
        
        res.json({
          success: true,
          data: promociones,
          message: 'Promociones obtenidas correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PROMOCIONES] Error:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener promociones',
          error: error.message
        });
        return true;
      }
    }
    
    // GET /promociones/activas - Obtener promociones activas
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[1] === 'activas') {
      try {
        console.log('📋 [PROMOCIONES] Obteniendo promociones activas');
        
        const hoy = new Date();
        const promocionesSnapshot = await db.collection('promociones')
          .where('activo', '==', true)
          .get();
        
        // Filtrar por fechas válidas
        const promociones = [];
        promocionesSnapshot.forEach(doc => {
          const data = doc.data();
          const inicio = new Date(data.fecha_inicio);
          const fin = new Date(data.fecha_fin);
          
          if (hoy >= inicio && hoy <= fin) {
            promociones.push({
              id: doc.id,
              ...data
            });
          }
        });
        
        console.log(`✅ [PROMOCIONES] ${promociones.length} promociones activas`);
        
        res.json({
          success: true,
          data: promociones,
          message: 'Promociones activas obtenidas correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PROMOCIONES] Error:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener promociones activas',
          error: error.message
        });
        return true;
      }
    }
    
    // GET /promociones/:id - Obtener promoción por ID
    if (req.method === 'GET' && pathParts.length === 2) {
      try {
        const promocionId = pathParts[1];
        console.log(`📋 [PROMOCIONES] Obteniendo promoción: ${promocionId}`);
        
        const promocionDoc = await db.collection('promociones').doc(promocionId).get();
        
        if (!promocionDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Promoción no encontrada'
          });
          return true;
        }
        
        const promocion = {
          id: promocionDoc.id,
          ...promocionDoc.data()
        };
        
        console.log(`✅ [PROMOCIONES] Promoción obtenida: ${promocion.nombre}`);
        
        res.json({
          success: true,
          data: promocion,
          message: 'Promoción obtenida correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PROMOCIONES] Error:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener promoción',
          error: error.message
        });
        return true;
      }
    }
    
    // POST /promociones - Crear promoción
    if (req.method === 'POST' && pathParts.length === 1) {
      try {
        const promocion = req.body;
        console.log('📋 [PROMOCIONES] Creando promoción:', promocion.nombre);
        
        // Validaciones
        if (!promocion.nombre) {
          res.status(400).json({
            success: false,
            message: 'El nombre es obligatorio'
          });
          return true;
        }
        
        // Preparar datos
        const nuevaPromocion = {
          ...promocion,
          fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Crear documento
        const docRef = await db.collection('promociones').add(nuevaPromocion);
        
        console.log(`✅ [PROMOCIONES] Promoción creada con ID: ${docRef.id}`);
        
        res.status(201).json({
          success: true,
          data: {
            id: docRef.id,
            ...nuevaPromocion
          },
          message: 'Promoción creada correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PROMOCIONES] Error al crear:', error);
        res.status(500).json({
          success: false,
          message: 'Error al crear promoción',
          error: error.message
        });
        return true;
      }
    }
    
    // POST /promociones/aplicar - Aplicar promociones a items
    if (req.method === 'POST' && pathParts.length === 2 && pathParts[1] === 'aplicar') {
      try {
        const { items } = req.body;
        console.log('📋 [PROMOCIONES] Aplicando promociones a carrito');
        console.log('📦 [PROMOCIONES] Items recibidos:', JSON.stringify(items, null, 2));
        
        if (!items || !Array.isArray(items)) {
          res.status(400).json({
            success: false,
            message: 'Items inválidos'
          });
          return true;
        }
        
        // Obtener promociones activas
        const hoy = new Date();
        const promocionesSnapshot = await db.collection('promociones')
          .where('activo', '==', true)
          .get();
        
        const promocionesActivas = [];
        promocionesSnapshot.forEach(doc => {
          const data = doc.data();
          const inicio = new Date(data.fecha_inicio);
          const fin = new Date(data.fecha_fin);
          
          if (hoy >= inicio && hoy <= fin) {
            promocionesActivas.push({
              id: doc.id,
              ...data
            });
          }
        });
        
        console.log('🎁 [PROMOCIONES] Promociones activas encontradas:', promocionesActivas.length);
        console.log('🎁 [PROMOCIONES] Detalles de promociones activas:', JSON.stringify(promocionesActivas, null, 2));
        console.log('🎁 [PROMOCIONES] Productos IDs en items:', items.map(item => item.producto_id || item.id));
        console.log('🎁 [PROMOCIONES] Productos IDs en promociones:', promocionesActivas.map(p => p.productos_ids));
        console.log('🔧 [PROMOCIONES] FORZANDO DEPLOY - CAMBIOS APLICADOS - VERSION 3');
        console.log('🎁 [PROMOCIONES] Items recibidos:', JSON.stringify(items, null, 2));
        console.log('🎁 [PROMOCIONES] Promociones activas:', JSON.stringify(promocionesActivas, null, 2));
        
        // Aplicar promociones a cada item
        const itemsConPromociones = items.map(item => {
          let mejorPromocion = null;
          let mejorDescuento = 0;
          
                      // Buscar la mejor promoción aplicable
            let mejorUnidadesGratis = 0;
            let mejorMensajePromocion = '';
            
            console.log(`🔍 [PROMOCIONES] Procesando item: ${item.nombre} (ID: ${item.producto_id}, cantidad: ${item.cantidad})`);
            
            promocionesActivas.forEach(promo => {
              console.log(`🔍 [PROMOCIONES] Verificando promoción ${promo.nombre} para producto ${item.producto_id}`);
              console.log(`🔍 [PROMOCIONES] Promoción productos_ids:`, promo.productos_ids);
              console.log(`🔍 [PROMOCIONES] Item producto_id:`, item.producto_id);
            
            // Verificar si la promoción aplica al producto
            // Si productos_ids está vacío o no existe, la promoción aplica a todos los productos
            if (promo.productos_ids && promo.productos_ids.length > 0) {
              if (!promo.productos_ids.includes(item.producto_id)) {
                console.log(`❌ [PROMOCIONES] Producto ${item.producto_id} no está en la promoción ${promo.nombre}`);
                return;
              }
            } else {
              console.log(`✅ [PROMOCIONES] Promoción ${promo.nombre} aplica a todos los productos`);
            }
            
            console.log(`✅ [PROMOCIONES] Producto ${item.producto_id} aplica para promoción ${promo.nombre}`);
            
            // Calcular descuento según tipo
            let descuento = 0;
            let unidadesGratis = 0;
            let mensajePromocion = '';
            
			if (promo.tipo === 'porcentaje') {
			  // Asegurar que el valor sea numérico
			  const valorNumerico = parseFloat(promo.valor) || 0;
			  descuento = item.precio * (valorNumerico / 100);
			  mensajePromocion = `¡${promo.nombre}! ${valorNumerico}% de descuento`;
			} else if (promo.tipo === 'monto_fijo') {
			  // Asegurar que el valor sea numérico
			  const valorNumerico = parseFloat(promo.valor) || 0;
			  descuento = Math.min(valorNumerico, item.precio);
			  mensajePromocion = `¡${promo.nombre}! -$${valorNumerico.toFixed(2)}`;
			} else if (promo.tipo === 'nxm') {
			  // Promoción X+Y (compra X, lleva X+Y)
			  const x = promo.condiciones?.x || 5;
			  const y = promo.condiciones?.y || 1;
			  
			  // Calcular cuántos grupos completos de X se pueden formar
			  const gruposCompletos = Math.floor(item.cantidad / x);
			  
			  if (gruposCompletos > 0) {
				// Calcular unidades gratis (Y por cada grupo completo de X)
				unidadesGratis = gruposCompletos * y;
				
				// Calcular descuento (precio por unidades gratis)
				descuento = item.precio * unidadesGratis;
				
				mensajePromocion = `¡${promo.nombre}! ${unidadesGratis} unidad(es) gratis por comprar ${x}`;
			  }
			}
            
            if (descuento > mejorDescuento) {
              mejorDescuento = descuento;
              mejorPromocion = promo;
              mejorUnidadesGratis = unidadesGratis;
              mejorMensajePromocion = mensajePromocion;
            }
          });
          
          // Aplicar la mejor promoción encontrada
          if (mejorPromocion) {
            return {
              ...item,
              promociones: [{
                id: mejorPromocion.id,
                nombre: mejorPromocion.nombre,
                descuento: mejorDescuento,
                unidadesGratis: mejorUnidadesGratis,
                mensaje: mejorMensajePromocion
              }],
              descuento: mejorDescuento,
              precio_final: item.precio - mejorDescuento,
              tienePromocion: true,
              // Agregar información adicional para el frontend
              cantidadTotal: item.cantidad + mejorUnidadesGratis,
              cantidadOriginal: item.cantidad,
              unidadesGratis: mejorUnidadesGratis
            };
          }
          
          return {
            ...item,
            promociones: [],
            descuento: 0,
            precio_final: item.precio,
            tienePromocion: false
          };
        });
        
        console.log(`✅ [PROMOCIONES] Promociones aplicadas a ${items.length} items`);
        console.log('📦 [PROMOCIONES] Items con promociones:', JSON.stringify(itemsConPromociones, null, 2));
        
        res.json({
          success: true,
          data: itemsConPromociones,
          message: 'Promociones aplicadas correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PROMOCIONES] Error al aplicar promociones:', error);
        res.status(500).json({
          success: false,
          message: 'Error al aplicar promociones',
          error: error.message
        });
        return true;
      }
    }
    
    // PUT /promociones/:id - Actualizar promoción
    if (req.method === 'PUT' && pathParts.length === 2) {
      try {
        const promocionId = pathParts[1];
        const datosActualizados = req.body;
        
        console.log(`📋 [PROMOCIONES] Actualizando promoción: ${promocionId}`);
        
        await db.collection('promociones').doc(promocionId).update({
          ...datosActualizados,
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ [PROMOCIONES] Promoción actualizada`);
        
        res.json({
          success: true,
          message: 'Promoción actualizada correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PROMOCIONES] Error al actualizar:', error);
        res.status(500).json({
          success: false,
          message: 'Error al actualizar promoción',
          error: error.message
        });
        return true;
      }
    }
    
    // PUT /promociones/:id/estado - Cambiar estado
    if (req.method === 'PUT' && pathParts.length === 3 && pathParts[2] === 'estado') {
      try {
        const promocionId = pathParts[1];
        const { activo } = req.body;
        
        console.log(`📋 [PROMOCIONES] Cambiando estado de promoción: ${promocionId}`);
        
        await db.collection('promociones').doc(promocionId).update({
          activo,
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ [PROMOCIONES] Estado cambiado a: ${activo}`);
        
        res.json({
          success: true,
          message: 'Estado actualizado correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PROMOCIONES] Error al cambiar estado:', error);
        res.status(500).json({
          success: false,
          message: 'Error al cambiar estado',
          error: error.message
        });
        return true;
      }
    }
    
    // DELETE /promociones/:id - Eliminar promoción
    if (req.method === 'DELETE' && pathParts.length === 2) {
      try {
        const promocionId = pathParts[1];
        console.log(`📋 [PROMOCIONES] Eliminando promoción: ${promocionId}`);
        
        await db.collection('promociones').doc(promocionId).delete();
        
        console.log(`✅ [PROMOCIONES] Promoción eliminada`);
        
        res.json({
          success: true,
          message: 'Promoción eliminada correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [PROMOCIONES] Error al eliminar:', error);
        res.status(500).json({
          success: false,
          message: 'Error al eliminar promoción',
          error: error.message
        });
        return true;
      }
    }
    
    // Si ninguna ruta coincide
    console.log(`⚠️ [PROMOCIONES] Ruta no encontrada: ${req.method} ${path}`);
    return false;
    
  } catch (error) {
    console.error('❌ [PROMOCIONES] Error crítico:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = promocionesRoutes;