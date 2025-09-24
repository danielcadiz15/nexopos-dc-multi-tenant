// functions/routes/transferencias.routes.js - CON SISTEMA DE NOTIFICACIONES

const admin = require('firebase-admin');
const db = admin.firestore();

// Función helper para crear notificaciones
async function crearNotificacion(datos) {
  try {
    const notificacion = {
      ...datos,
      fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
      leida: false,
      activa: true
    };
    
    const docRef = await db.collection('notificaciones').add(notificacion);
    console.log(`✅ [NOTIFICACIONES] Notificación creada: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('❌ [NOTIFICACIONES] Error al crear notificación:', error);
    return null;
  }
}

// Función para manejar todas las rutas de transferencias
const transferenciasRoutes = async (req, res, path) => {
  try {
    console.log(`🔄 [TRANSFERENCIAS] Procesando: ${req.method} ${path}`);

    // GET /transferencias - Obtener todas las transferencias
    if (path === '/transferencias' && req.method === 'GET') {
      try {
        const { estado, sucursal_id } = req.query;
        
        let query = db.collection('transferencias').orderBy('fecha_solicitud', 'desc');
        
        // Aplicar filtros si se proporcionan
        if (estado) {
          query = query.where('estado', '==', estado);
        }
        
        const transferenciasSnapshot = await query.get();
        const transferencias = [];
        
        // Procesar cada transferencia
        for (const doc of transferenciasSnapshot.docs) {
          const transferencia = {
            id: doc.id,
            ...doc.data()
          };
          
          // Enriquecer con información de sucursales
          try {
            const [sucursalOrigen, sucursalDestino] = await Promise.all([
              db.collection('sucursales').doc(transferencia.sucursal_origen_id).get(),
              db.collection('sucursales').doc(transferencia.sucursal_destino_id).get()
            ]);
            
            transferencia.sucursal_origen = sucursalOrigen.exists ? {
              id: sucursalOrigen.id,
              nombre: sucursalOrigen.data().nombre,
              tipo: sucursalOrigen.data().tipo
            } : null;
            
            transferencia.sucursal_destino = sucursalDestino.exists ? {
              id: sucursalDestino.id,
              nombre: sucursalDestino.data().nombre,
              tipo: sucursalDestino.data().tipo
            } : null;
            
            // Enriquecer productos con información completa
            if (transferencia.productos && Array.isArray(transferencia.productos)) {
              transferencia.productos = await Promise.all(
                transferencia.productos.map(async (item) => {
                  try {
                    const productoDoc = await db.collection('productos').doc(item.producto_id).get();
                    return {
                      ...item,
                      producto: productoDoc.exists ? {
                        id: productoDoc.id,
                        codigo: productoDoc.data().codigo,
                        nombre: productoDoc.data().nombre,
                        descripcion: productoDoc.data().descripcion
                      } : null
                    };
                  } catch (error) {
                    console.warn(`⚠️ Error al obtener producto ${item.producto_id}:`, error.message);
                    return item;
                  }
                })
              );
            }
            
            // Filtrar por sucursal si se especifica
            if (!sucursal_id || 
                transferencia.sucursal_origen_id === sucursal_id || 
                transferencia.sucursal_destino_id === sucursal_id) {
              transferencias.push(transferencia);
            }
            
          } catch (error) {
            console.warn(`⚠️ Error al enriquecer transferencia ${doc.id}:`, error.message);
            transferencias.push(transferencia);
          }
        }
        
        console.log(`✅ [TRANSFERENCIAS] ${transferencias.length} transferencias obtenidas`);
        
        res.json({
          success: true,
          data: transferencias,
          total: transferencias.length,
          filtros: { estado, sucursal_id },
          message: 'Transferencias obtenidas correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [TRANSFERENCIAS] Error al obtener transferencias:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener transferencias',
          error: error.message
        });
        return true;
      }
    }

    // GET /transferencias/pendientes - Obtener transferencias pendientes
    if (path === '/transferencias/pendientes' && req.method === 'GET') {
      try {
        const transferenciasSnapshot = await db.collection('transferencias')
          .where('estado', '==', 'pendiente')
          .orderBy('fecha_solicitud', 'desc')
          .get();
        
        const transferencias = [];
        
        for (const doc of transferenciasSnapshot.docs) {
          const transferencia = {
            id: doc.id,
            ...doc.data()
          };
          
          // Enriquecer con información básica de sucursales
          try {
            const [sucursalOrigen, sucursalDestino] = await Promise.all([
              db.collection('sucursales').doc(transferencia.sucursal_origen_id).get(),
              db.collection('sucursales').doc(transferencia.sucursal_destino_id).get()
            ]);
            
            transferencia.sucursal_origen = sucursalOrigen.exists ? {
              id: sucursalOrigen.id,
              nombre: sucursalOrigen.data().nombre
            } : null;
            
            transferencia.sucursal_destino = sucursalDestino.exists ? {
              id: sucursalDestino.id,
              nombre: sucursalDestino.data().nombre
            } : null;
            
            transferencias.push(transferencia);
          } catch (error) {
            console.warn(`⚠️ Error al enriquecer transferencia pendiente ${doc.id}:`, error.message);
            transferencias.push(transferencia);
          }
        }
        
        console.log(`✅ [TRANSFERENCIAS] ${transferencias.length} transferencias pendientes`);
        
        res.json({
          success: true,
          data: transferencias,
          total: transferencias.length,
          message: 'Transferencias pendientes obtenidas correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [TRANSFERENCIAS] Error al obtener transferencias pendientes:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener transferencias pendientes',
          error: error.message
        });
        return true;
      }
    }

    // PUT /transferencias/:id/estado - Aprobar o rechazar transferencia (CON NOTIFICACIONES)
    if (path.match(/^\/transferencias\/[^\/]+\/estado$/) && req.method === 'PUT') {
      const transferenciaId = path.split('/')[2];
      const { estado, motivo_rechazo, usuario_aprueba_id } = req.body;
      
      try {
        // Validar estado
        if (!['aprobada', 'rechazada'].includes(estado)) {
          res.status(400).json({
            success: false,
            message: 'Estado inválido. Debe ser "aprobada" o "rechazada"'
          });
          return true;
        }
        
        // Obtener transferencia
        const transferenciaDoc = await db.collection('transferencias').doc(transferenciaId).get();
        
        if (!transferenciaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Transferencia no encontrada'
          });
          return true;
        }
        
        const transferencia = transferenciaDoc.data();
        
        // Verificar que esté pendiente
        if (transferencia.estado !== 'pendiente') {
          res.status(400).json({
            success: false,
            message: 'Solo se pueden procesar transferencias pendientes'
          });
          return true;
        }
        
        console.log(`🔄 [TRANSFERENCIAS] ${estado === 'aprobada' ? 'Aprobando' : 'Rechazando'} transferencia ${transferenciaId}`);
        
        // Obtener información de sucursales para notificaciones
        const [sucursalOrigen, sucursalDestino] = await Promise.all([
          db.collection('sucursales').doc(transferencia.sucursal_origen_id).get(),
          db.collection('sucursales').doc(transferencia.sucursal_destino_id).get()
        ]);
        
        // Actualizar estado
        const actualizacion = {
          estado,
          usuario_aprueba_id: usuario_aprueba_id || 'sistema',
          fecha_aprobacion: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (estado === 'rechazada' && motivo_rechazo) {
          actualizacion.motivo_rechazo = motivo_rechazo;
        }
        
        await transferenciaDoc.ref.update(actualizacion);
        
        // 🔔 CREAR NOTIFICACIÓN para el usuario que solicitó la transferencia
        try {
          const mensaje = estado === 'aprobada' 
            ? `Su transferencia de ${sucursalOrigen.exists ? sucursalOrigen.data().nombre : 'sucursal'} a ${sucursalDestino.exists ? sucursalDestino.data().nombre : 'sucursal'} ha sido APROBADA`
            : `Su transferencia de ${sucursalOrigen.exists ? sucursalOrigen.data().nombre : 'sucursal'} a ${sucursalDestino.exists ? sucursalDestino.data().nombre : 'sucursal'} ha sido RECHAZADA${motivo_rechazo ? `: ${motivo_rechazo}` : ''}`;
          
          await crearNotificacion({
            tipo: 'transferencia_procesada',
            titulo: estado === 'aprobada' ? '✅ Transferencia Aprobada' : '❌ Transferencia Rechazada',
            mensaje: mensaje,
            usuario_id: transferencia.usuario_solicita_id,
            usuario_nombre: transferencia.usuario_solicita_nombre || 'Usuario',
            prioridad: estado === 'aprobada' ? 'alta' : 'media',
            datos: {
              transferencia_id: transferenciaId,
              estado: estado,
              sucursal_origen: sucursalOrigen.exists ? sucursalOrigen.data().nombre : 'Sucursal',
              sucursal_destino: sucursalDestino.exists ? sucursalDestino.data().nombre : 'Sucursal',
              productos_count: transferencia.productos?.length || 0,
              ...(motivo_rechazo && { motivo_rechazo })
            },
            acciones: [
              {
                texto: 'Ver Transferencia',
                tipo: 'primary',
                ruta: `/stock/transferencias`
              }
            ]
          });
          
          console.log(`🔔 [NOTIFICACIONES] Notificación enviada al usuario ${transferencia.usuario_solicita_id}`);
        } catch (notifError) {
          console.error('❌ [NOTIFICACIONES] Error al crear notificación:', notifError);
          // No fallar toda la operación por un error de notificación
        }
        
        // Si se aprueba, ejecutar la transferencia
        if (estado === 'aprobada') {
          console.log(`📦 [TRANSFERENCIAS] Ejecutando transferencia de stock...`);
          const batch = db.batch();
          
          for (const producto of transferencia.productos) {
            // Reducir stock en origen
            const stockOrigenQuery = await db.collection('stock_sucursal')
              .where('producto_id', '==', producto.producto_id)
              .where('sucursal_id', '==', transferencia.sucursal_origen_id)
              .limit(1)
              .get();
            
            if (!stockOrigenQuery.empty) {
              const stockOrigenDoc = stockOrigenQuery.docs[0];
              const stockOrigenData = stockOrigenDoc.data();
              const nuevoStockOrigen = Math.max(0, stockOrigenData.cantidad - producto.cantidad);
              
              batch.update(stockOrigenDoc.ref, {
                cantidad: nuevoStockOrigen,
                ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
              });
              
              // Registrar movimiento de salida
              const movimientoSalida = db.collection('movimientos_stock').doc();
              batch.set(movimientoSalida, {
                sucursal_id: transferencia.sucursal_origen_id,
                producto_id: producto.producto_id,
                tipo: 'salida',
                cantidad: producto.cantidad,
                stock_anterior: stockOrigenData.cantidad,
                stock_nuevo: nuevoStockOrigen,
                motivo: `Transferencia a sucursal`,
                referencia_tipo: 'transferencia',
                referencia_id: transferenciaId,
                fecha: admin.firestore.FieldValue.serverTimestamp(),
                usuario_id: usuario_aprueba_id || 'sistema'
              });
            }
            
            // Aumentar stock en destino
            const stockDestinoQuery = await db.collection('stock_sucursal')
              .where('producto_id', '==', producto.producto_id)
              .where('sucursal_id', '==', transferencia.sucursal_destino_id)
              .limit(1)
              .get();
            
            let stockDestinoAnterior = 0;
            let stockDestinoNuevo = producto.cantidad;
            
            if (stockDestinoQuery.empty) {
              // Crear nuevo registro
              const nuevoStock = db.collection('stock_sucursal').doc();
              batch.set(nuevoStock, {
                producto_id: producto.producto_id,
                sucursal_id: transferencia.sucursal_destino_id,
                cantidad: producto.cantidad,
                stock_minimo: 5,
                ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
              });
            } else {
              const stockDestinoDoc = stockDestinoQuery.docs[0];
              const stockDestinoData = stockDestinoDoc.data();
              stockDestinoAnterior = stockDestinoData.cantidad;
              stockDestinoNuevo = stockDestinoData.cantidad + producto.cantidad;
              
              batch.update(stockDestinoDoc.ref, {
                cantidad: stockDestinoNuevo,
                ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
              });
            }
            
            // Registrar movimiento de entrada
            const movimientoEntrada = db.collection('movimientos_stock').doc();
            batch.set(movimientoEntrada, {
              sucursal_id: transferencia.sucursal_destino_id,
              producto_id: producto.producto_id,
              tipo: 'entrada',
              cantidad: producto.cantidad,
              stock_anterior: stockDestinoAnterior,
              stock_nuevo: stockDestinoNuevo,
              motivo: `Transferencia desde sucursal`,
              referencia_tipo: 'transferencia',
              referencia_id: transferenciaId,
              fecha: admin.firestore.FieldValue.serverTimestamp(),
              usuario_id: usuario_aprueba_id || 'sistema'
            });
          }
          
          await batch.commit();
          console.log(`✅ [TRANSFERENCIAS] Stock transferido correctamente`);
        }
        
        res.json({
          success: true,
          data: {
            id: transferenciaId,
            estado,
            ...actualizacion
          },
          message: estado === 'aprobada' 
            ? 'Transferencia aprobada y ejecutada correctamente. Notificación enviada al usuario.'
            : 'Transferencia rechazada. Notificación enviada al usuario.'
        });
      } catch (error) {
        console.error('❌ [TRANSFERENCIAS] Error al procesar transferencia:', error);
        res.status(500).json({
          success: false,
          message: 'Error al procesar transferencia',
          error: error.message
        });
      }
      return true;
    }

    // POST /transferencias/:id/devolver - Registrar devolución de productos de una transferencia
    if (path.match(/^\/transferencias\/[^\/]+\/devolver$/) && req.method === 'POST') {
      const transferenciaId = path.split('/')[2];
      const { devoluciones } = req.body; // [{ producto_id, cantidad }]

      try {
        const transferenciaRef = db.collection('transferencias').doc(transferenciaId);
        const transferenciaDoc = await transferenciaRef.get();
        if (!transferenciaDoc.exists) {
          res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
          return true;
        }
        const transferencia = transferenciaDoc.data();
        if (!Array.isArray(transferencia.productos)) {
          res.status(400).json({ success: false, message: 'Transferencia sin productos' });
          return true;
        }
        // Inicializar campo devueltos si no existe
        let devueltos = transferencia.devueltos || {};
        let cambios = false;
        let productosActualizados = transferencia.productos.map(prod => {
          const devolucion = devoluciones.find(d => d.producto_id === prod.producto_id);
          if (devolucion) {
            const yaDevuelto = devueltos[prod.producto_id] || 0;
            const maxDevolver = prod.cantidad - yaDevuelto;
            const cantidadADevolver = Math.max(0, Math.min(devolucion.cantidad, maxDevolver));
            if (cantidadADevolver > 0) {
              devueltos[prod.producto_id] = yaDevuelto + cantidadADevolver;
              cambios = true;
            }
          }
          return prod;
        });
        if (!cambios) {
          res.status(400).json({ success: false, message: 'No hay productos pendientes de devolución o ya se devolvió todo.' });
          return true;
        }
        await transferenciaRef.update({ devueltos });
        // Devolver el documento actualizado
        const transferenciaActualizadaDoc = await transferenciaRef.get();
        const transferenciaActualizada = transferenciaActualizadaDoc.data();
        res.json({ success: true, message: 'Devolución registrada', devueltos: transferenciaActualizada.devueltos, transferencia: transferenciaActualizada });
      } catch (error) {
        console.error('❌ [TRANSFERENCIAS] Error al registrar devolución:', error);
        res.status(500).json({ success: false, message: 'Error al registrar devolución', error: error.message });
      }
      return true;
    }

    // POST /transferencias/:id/cancelar - Cancelar transferencia aprobada y devolver stock
    if (path.match(/^\/transferencias\/[^\/]+\/cancelar$/) && req.method === 'POST') {
      const transferenciaId = path.split('/')[2];
      const { motivo, usuario_id } = req.body;
      try {
        const transferenciaRef = db.collection('transferencias').doc(transferenciaId);
        const transferenciaDoc = await transferenciaRef.get();
        if (!transferenciaDoc.exists) {
          res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
          return true;
        }
        const transferencia = transferenciaDoc.data();
        if (transferencia.estado !== 'aprobada') {
          res.status(400).json({ success: false, message: 'Solo se pueden cancelar transferencias aprobadas' });
          return true;
        }
        if (transferencia.cancelada) {
          res.status(400).json({ success: false, message: 'La transferencia ya fue cancelada' });
          return true;
        }
        if (!motivo || !motivo.trim()) {
          res.status(400).json({ success: false, message: 'El motivo de la cancelación es obligatorio' });
          return true;
        }
        // Devolver stock a la sucursal de origen y restar en destino
        const batch = db.batch();
        for (const prod of transferencia.productos) {
          // Sumar stock en origen
          const stockOrigenQuery = await db.collection('stock_sucursal')
            .where('producto_id', '==', prod.producto_id)
            .where('sucursal_id', '==', transferencia.sucursal_origen_id)
            .limit(1)
            .get();
          if (!stockOrigenQuery.empty) {
            const stockOrigenDoc = stockOrigenQuery.docs[0];
            const stockOrigenData = stockOrigenDoc.data();
            const nuevoStockOrigen = (stockOrigenData.cantidad || 0) + prod.cantidad;
            batch.update(stockOrigenDoc.ref, {
              cantidad: nuevoStockOrigen,
              ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
            });
          }
          // Restar stock en destino
          const stockDestinoQuery = await db.collection('stock_sucursal')
            .where('producto_id', '==', prod.producto_id)
            .where('sucursal_id', '==', transferencia.sucursal_destino_id)
            .limit(1)
            .get();
          if (!stockDestinoQuery.empty) {
            const stockDestinoDoc = stockDestinoQuery.docs[0];
            const stockDestinoData = stockDestinoDoc.data();
            const nuevoStockDestino = Math.max(0, (stockDestinoData.cantidad || 0) - prod.cantidad);
            batch.update(stockDestinoDoc.ref, {
              cantidad: nuevoStockDestino,
              ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
        // Marcar transferencia como cancelada
        batch.update(transferenciaRef, {
          cancelada: true,
          estado: 'cancelada',
          motivo_cancelacion: motivo,
          usuario_cancela_id: usuario_id || 'sistema',
          fecha_cancelacion: admin.firestore.FieldValue.serverTimestamp()
        });
        await batch.commit();
        res.json({ success: true, message: 'Transferencia cancelada y stock devuelto a la sucursal de origen' });
      } catch (error) {
        console.error('❌ [TRANSFERENCIAS] Error al cancelar transferencia:', error);
        res.status(500).json({ success: false, message: 'Error al cancelar transferencia', error: error.message });
      }
      return true;
    }

    // GET /transferencias/:id - Obtener transferencia por ID
    if (path.match(/^\/transferencias\/[^\/]+$/) && req.method === 'GET') {
      const transferenciaId = path.split('/transferencias/')[1];
      
      // Verificar que no sea una ruta especial
      if (['sucursal', 'pendientes'].includes(transferenciaId)) {
        return false; // Ya manejado en otra ruta
      }
      
      try {
        const transferenciaDoc = await db.collection('transferencias').doc(transferenciaId).get();
        
        if (!transferenciaDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Transferencia no encontrada'
          });
          return true;
        }
        
        const transferencia = {
          id: transferenciaDoc.id,
          ...transferenciaDoc.data()
        };
        
        // Enriquecer con información de sucursales y productos
        const [sucursalOrigen, sucursalDestino] = await Promise.all([
          db.collection('sucursales').doc(transferencia.sucursal_origen_id).get(),
          db.collection('sucursales').doc(transferencia.sucursal_destino_id).get()
        ]);
        
        // Enriquecer productos con información completa
        const productosEnriquecidos = await Promise.all(
          (transferencia.productos || []).map(async (item) => {
            const productoDoc = await db.collection('productos').doc(item.producto_id).get();
            return {
              ...item,
              producto: productoDoc.exists ? {
                id: productoDoc.id,
                codigo: productoDoc.data().codigo,
                nombre: productoDoc.data().nombre,
                descripcion: productoDoc.data().descripcion
              } : null
            };
          })
        );
        
        const transferenciaEnriquecida = {
          ...transferencia,
          sucursal_origen: sucursalOrigen.exists ? {
            id: sucursalOrigen.id,
            nombre: sucursalOrigen.data().nombre,
            tipo: sucursalOrigen.data().tipo
          } : null,
          sucursal_destino: sucursalDestino.exists ? {
            id: sucursalDestino.id,
            nombre: sucursalDestino.data().nombre,
            tipo: sucursalDestino.data().tipo
          } : null,
          productos: productosEnriquecidos
        };
        
        res.json({
          success: true,
          data: transferenciaEnriquecida,
          message: 'Transferencia obtenida correctamente'
        });
      } catch (error) {
        console.error('❌ [TRANSFERENCIAS] Error al obtener transferencia:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener transferencia',
          error: error.message
        });
      }
      return true;
    }

    // GET /transferencias/sucursal/:id - Transferencias por sucursal
    if (path.match(/^\/transferencias\/sucursal\/[^\/]+$/) && req.method === 'GET') {
      const sucursalId = path.split('/sucursal/')[1];
      
      try {
        // Obtener transferencias donde la sucursal es origen o destino
        const [transferenciasOrigenSnapshot, transferenciasDestinoSnapshot] = await Promise.all([
          db.collection('transferencias')
            .where('sucursal_origen_id', '==', sucursalId)
            .orderBy('fecha_solicitud', 'desc')
            .limit(50)
            .get(),
          db.collection('transferencias')
            .where('sucursal_destino_id', '==', sucursalId)
            .orderBy('fecha_solicitud', 'desc')
            .limit(50)
            .get()
        ]);
        
        // Combinar y eliminar duplicados
        const todasTransferencias = new Map();
        
        // Agregar transferencias de origen
        for (const doc of transferenciasOrigenSnapshot.docs) {
          todasTransferencias.set(doc.id, {
            id: doc.id,
            ...doc.data(),
            tipo_relacion: 'origen'
          });
        }
        
        // Agregar transferencias de destino
        for (const doc of transferenciasDestinoSnapshot.docs) {
          if (todasTransferencias.has(doc.id)) {
            // Si ya existe, marcar como ambos
            todasTransferencias.get(doc.id).tipo_relacion = 'ambos';
          } else {
            todasTransferencias.set(doc.id, {
              id: doc.id,
              ...doc.data(),
              tipo_relacion: 'destino'
            });
          }
        }
        
        // Convertir a array y enriquecer
        const transferencias = [];
        
        for (const [id, transferencia] of todasTransferencias) {
          // Enriquecer con información de sucursales
          const [sucursalOrigen, sucursalDestino] = await Promise.all([
            db.collection('sucursales').doc(transferencia.sucursal_origen_id).get(),
            db.collection('sucursales').doc(transferencia.sucursal_destino_id).get()
          ]);
          
          transferencias.push({
            ...transferencia,
            sucursal_origen: sucursalOrigen.exists ? {
              id: sucursalOrigen.id,
              nombre: sucursalOrigen.data().nombre
            } : null,
            sucursal_destino: sucursalDestino.exists ? {
              id: sucursalDestino.id,
              nombre: sucursalDestino.data().nombre
            } : null
          });
        }
        
        // Ordenar por fecha
        transferencias.sort((a, b) => {
          const fechaA = new Date(a.fecha_solicitud);
          const fechaB = new Date(b.fecha_solicitud);
          return fechaB - fechaA;
        });
        
        res.json({
          success: true,
          data: transferencias,
          total: transferencias.length,
          message: 'Transferencias de la sucursal obtenidas correctamente'
        });
      } catch (error) {
        console.error('❌ [TRANSFERENCIAS] Error al obtener transferencias de sucursal:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener transferencias de sucursal',
          error: error.message
        });
      }
      return true;
    }
    
    // Si ninguna ruta coincide, devolver false
    console.log(`⚠️ [TRANSFERENCIAS] Ruta no encontrada: ${req.method} ${path}`);
    return false;
    
  } catch (error) {
    console.error('❌ [TRANSFERENCIAS] Error crítico en rutas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = transferenciasRoutes;