// functions/routes/control-stock.routes.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Obtener referencia a Firestore
const db = admin.firestore();

/**
 * Crear un nuevo control de inventario
 */
const crearControl = async (req, res) => {
  try {
    const { sucursal_id, usuario_id, tipo, categoria_id, observaciones } = req.body;

    if (!sucursal_id || !usuario_id) {
      return res.status(400).json({
        success: false,
        message: 'sucursal_id y usuario_id son requeridos'
      });
    }

    const control = {
      sucursal_id,
      usuario_id,
      fecha_inicio: new Date().toISOString(),
      tipo: tipo || 'completo',
      categoria_id: categoria_id || null,
      estado: 'en_proceso',
      observaciones: observaciones || '',
      fecha_creacion: new Date().toISOString()
    };

    const docRef = await db.collection('control-stock').add(control);
    
    res.json({
      success: true,
      id: docRef.id,
      ...control
    });

  } catch (error) {
    console.error('Error al crear control:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear control de inventario',
      error: error.message
    });
  }
};

/**
 * Obtener control activo de una sucursal
 */
const obtenerControlActivo = async (req, res) => {
  try {
    const { sucursal_id } = req.query;

    if (!sucursal_id) {
      return res.status(400).json({
        success: false,
        message: 'sucursal_id es requerido'
      });
    }

    const snapshot = await db.collection('control-stock')
      .where('sucursal_id', '==', sucursal_id)
      .where('estado', '==', 'en_proceso')
      .orderBy('fecha_inicio', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json({
        success: true,
        data: null
      });
    }

    const control = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };

    res.json({
      success: true,
      data: control
    });

  } catch (error) {
    console.error('Error al obtener control activo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener control activo',
      error: error.message
    });
  }
};

/**
 * Finalizar un control
 */
const finalizarControl = async (req, res) => {
  try {
    const { controlId } = req.params;
    const { productos_conteo, ajustes_aplicados, solicitud_ajuste_id } = req.body;

    if (!controlId) {
      return res.status(400).json({
        success: false,
        message: 'controlId es requerido'
      });
    }

    const controlRef = db.collection('control-stock').doc(controlId);
    
    // Actualizar estado del control
    await controlRef.update({
      estado: 'finalizado',
      fecha_fin: new Date().toISOString(),
      productos_conteo: productos_conteo || [],
      ajustes_aplicados: ajustes_aplicados || false,
      solicitud_ajuste_id: solicitud_ajuste_id || null
    });

    res.json({
      success: true,
      message: 'Control finalizado correctamente'
    });

  } catch (error) {
    console.error('Error al finalizar control:', error);
    res.status(500).json({
      success: false,
      message: 'Error al finalizar control',
      error: error.message
    });
  }
};

/**
 * Crear solicitud de ajuste
 */
const crearSolicitudAjuste = async (req, res) => {
  try {
    const { control_id, sucursal_id, usuario_id, ajustes, estado, fecha_solicitud, observaciones } = req.body;

    if (!control_id || !sucursal_id || !usuario_id || !ajustes) {
      return res.status(400).json({
        success: false,
        message: 'control_id, sucursal_id, usuario_id y ajustes son requeridos'
      });
    }

    const solicitud = {
      control_id,
      sucursal_id,
      usuario_id,
      ajustes,
      estado: estado || 'pendiente_autorizacion',
      fecha_solicitud: fecha_solicitud || new Date().toISOString(),
      observaciones: observaciones || '',
      fecha_creacion: new Date().toISOString()
    };

    const docRef = await db.collection('solicitudes-ajuste').add(solicitud);
    
    res.json({
      success: true,
      id: docRef.id,
      ...solicitud
    });

  } catch (error) {
    console.error('Error al crear solicitud de ajuste:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear solicitud de ajuste',
      error: error.message
    });
  }
};

/**
 * Obtener solicitudes de ajuste pendientes
 */
const obtenerSolicitudesPendientes = async (req, res) => {
  try {
    const { sucursal_id } = req.query;

    let query = db.collection('solicitudes-ajuste')
      .where('estado', '==', 'pendiente_autorizacion');

    if (sucursal_id) {
      query = query.where('sucursal_id', '==', sucursal_id);
    }

    const snapshot = await query.get();

    const solicitudes = [];
    snapshot.forEach(doc => {
      solicitudes.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Ordenar por fecha de solicitud (más reciente primero)
    solicitudes.sort((a, b) => new Date(b.fecha_solicitud) - new Date(a.fecha_solicitud));

    res.json({
      success: true,
      data: solicitudes
    });

  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener solicitudes de ajuste',
      error: error.message
    });
  }
};

/**
 * Autorizar solicitud de ajuste - FUNCIÓN ACTUALIZADA
 */
const autorizarSolicitud = async (req, res) => {
  try {
    const { solicitudId } = req.params;
    const { adminId } = req.body;

    console.log('🔍 [AUTORIZAR] Iniciando autorización de solicitud:', solicitudId);

    if (!solicitudId) {
      return res.status(400).json({
        success: false,
        message: 'solicitudId es requerido'
      });
    }

    const solicitudRef = db.collection('solicitudes-ajuste').doc(solicitudId);
    const solicitudDoc = await solicitudRef.get();

    if (!solicitudDoc.exists) {
      console.log('❌ [AUTORIZAR] Solicitud no encontrada:', solicitudId);
      return res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada'
      });
    }

    const solicitud = solicitudDoc.data();
    console.log('🔍 [AUTORIZAR] Datos de la solicitud:', solicitud);

    // Aplicar ajustes de stock
    if (solicitud.ajustes && solicitud.ajustes.length > 0) {
      console.log('🔍 [AUTORIZAR] Aplicando', solicitud.ajustes.length, 'ajustes');
      const batch = db.batch();
      
      for (const ajuste of solicitud.ajustes) {
        console.log('🔍 [AUTORIZAR] Procesando ajuste:', ajuste);
        
        // Buscar el stock en la sucursal
        console.log('🔍 [AUTORIZAR] Buscando stock para producto:', ajuste.producto_id, 'en sucursal:', solicitud.sucursal_id);
        
        const stockQuery = db.collection('stock-sucursal')
          .where('sucursal_id', '==', solicitud.sucursal_id)
          .where('producto_id', '==', ajuste.producto_id);
        
        console.log('🔍 [AUTORIZAR] Query construida:', stockQuery);
        
        const stockSnapshot = await stockQuery.get();
        console.log('🔍 [AUTORIZAR] Stock encontrado:', !stockSnapshot.empty);
        console.log('🔍 [AUTORIZAR] Cantidad de documentos encontrados:', stockSnapshot.size);
        
        if (!stockSnapshot.empty) {
          const stockDoc = stockSnapshot.docs[0];
          const stockActual = stockDoc.data().cantidad || 0;
          const nuevoStock = stockActual + ajuste.cantidad_ajuste;
          
          console.log('🔍 [AUTORIZAR] Stock actual:', stockActual, 'Nuevo stock:', nuevoStock);
          
          batch.update(stockDoc.ref, {
            cantidad: nuevoStock,
            fecha_actualizacion: new Date().toISOString()
          });
        } else {
          console.log('⚠️ [AUTORIZAR] No se encontró stock para producto:', ajuste.producto_id);
          
          // Verificar si el producto existe en la colección productos
          try {
            const productoDoc = await db.collection('productos').doc(ajuste.producto_id).get();
            console.log('🔍 [AUTORIZAR] Producto existe en colección productos:', productoDoc.exists);
            if (productoDoc.exists) {
              const productoData = productoDoc.data();
              console.log('🔍 [AUTORIZAR] Datos del producto:', productoData);
              
              // CREAR NUEVO REGISTRO DE STOCK para este producto en esta sucursal
              console.log('🔍 [AUTORIZAR] Creando nuevo registro de stock para producto:', ajuste.producto_id);
              
              const nuevoStockRef = db.collection('stock-sucursal').doc();
              const nuevoStockData = {
                producto_id: ajuste.producto_id,
                sucursal_id: solicitud.sucursal_id,
                cantidad: ajuste.cantidad_ajuste, // Stock inicial = cantidad del ajuste
                stock_minimo: productoData.stock_minimo || 0,
                stock_maximo: productoData.stockMaximo || 0,
                fecha_creacion: new Date().toISOString(),
                fecha_actualizacion: new Date().toISOString(),
                activo: true
              };
              
              console.log('🔍 [AUTORIZAR] Nuevo stock a crear:', nuevoStockData);
              batch.set(nuevoStockRef, nuevoStockData);
              
            }
          } catch (error) {
            console.log('⚠️ [AUTORIZAR] Error al verificar producto:', error.message);
          }
          
          // Verificar si hay algún registro en stock-sucursal para este producto
          try {
            const stockGeneralQuery = db.collection('stock-sucursal')
              .where('producto_id', '==', ajuste.producto_id);
            const stockGeneralSnapshot = await stockGeneralQuery.get();
            console.log('🔍 [AUTORIZAR] Registros de stock-sucursal para este producto:', stockGeneralSnapshot.size);
            
            if (!stockGeneralSnapshot.empty) {
              stockGeneralSnapshot.forEach(doc => {
                console.log('🔍 [AUTORIZAR] Stock encontrado en otra sucursal:', doc.data());
              });
            }
          } catch (error) {
            console.log('⚠️ [AUTORIZAR] Error al verificar stock general:', error.message);
          }
        }
      }
      
      console.log('🔍 [AUTORIZAR] Aplicando batch de actualizaciones...');
      await batch.commit();
      console.log('✅ [AUTORIZAR] Batch aplicado correctamente');
    } else {
      console.log('⚠️ [AUTORIZAR] No hay ajustes para aplicar');
    }

    // Actualizar estado de la solicitud
    await solicitudRef.update({
      estado: 'autorizada',
      admin_autoriza_id: adminId || 'admin',
      fecha_autorizacion: new Date().toISOString()
    });

    console.log('✅ [AUTORIZAR] Solicitud autorizada correctamente');

    res.json({
      success: true,
      message: 'Solicitud autorizada y ajustes aplicados'
    });

  } catch (error) {
    console.error('❌ [AUTORIZAR] Error al autorizar solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al autorizar solicitud',
      error: error.message
    });
  }
};

/**
 * Rechazar solicitud de ajuste
 */
const rechazarSolicitud = async (req, res) => {
  try {
    const { solicitudId } = req.params;
    const { adminId, motivo } = req.body;

    if (!solicitudId) {
      return res.status(400).json({
        success: false,
        message: 'solicitudId es requerido'
      });
    }

    const solicitudRef = db.collection('solicitudes-ajuste').doc(solicitudId);
    
    await solicitudRef.update({
      estado: 'rechazada',
      admin_rechaza_id: adminId || 'admin',
      fecha_rechazo: new Date().toISOString(),
      motivo_rechazo: motivo || 'Rechazada por administrador'
    });

    res.json({
      success: true,
      message: 'Solicitud rechazada'
    });

  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar solicitud',
      error: error.message
    });
  }
};

/**
 * Crea un registro de auditoría para ajustes de inventario
 */
const crearRegistroAuditoria = async (req, res) => {
  try {
    const registroAuditoria = req.body;
    
    console.log('🔧 Creando registro de auditoría:', registroAuditoria);
    
    // Agregar timestamp de creación
    registroAuditoria.fecha_creacion = new Date().toISOString();
    registroAuditoria.timestamp = Date.now();
    
    // Crear documento en colección de auditoría
    const docRef = await db.collection('auditoria-inventario').add(registroAuditoria);
    
    console.log('✅ Registro de auditoría creado con ID:', docRef.id);
    
    res.json({ 
      success: true, 
      message: 'Registro de auditoría creado correctamente',
      id: docRef.id,
      registro: registroAuditoria
    });
    
  } catch (error) {
    console.error('❌ Error al crear registro de auditoría:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear registro de auditoría',
      error: error.message 
    });
  }
};

module.exports = {
  crearControl,
  obtenerControlActivo,
  finalizarControl,
  crearSolicitudAjuste,
  obtenerSolicitudesPendientes,
  autorizarSolicitud,
  rechazarSolicitud,
  crearRegistroAuditoria
};
