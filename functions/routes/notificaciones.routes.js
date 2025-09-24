// functions/routes/notificaciones.routes.js - NUEVO ARCHIVO

const admin = require('firebase-admin');
const db = admin.firestore();

// Función para manejar todas las rutas de notificaciones
const notificacionesRoutes = async (req, res, path) => {
  try {
    console.log(`🔔 [NOTIFICACIONES] Procesando: ${req.method} ${path}`);

    // GET /notificaciones - Obtener notificaciones del usuario
    if (path === '/notificaciones' && req.method === 'GET') {
      try {
        const { usuario_id } = req.query;
        
        if (!usuario_id) {
          res.status(400).json({
            success: false,
            message: 'El parámetro usuario_id es requerido'
          });
          return true;
        }
        
        // Obtener notificaciones del usuario, ordenadas por fecha
        const notificacionesSnapshot = await db.collection('notificaciones')
          .where('usuario_id', '==', usuario_id)
          .where('activa', '==', true)
          .orderBy('fechaCreacion', 'desc')
          .limit(50)
          .get();
        
        const notificaciones = [];
        
        notificacionesSnapshot.forEach(doc => {
          const notif = doc.data();
          notificaciones.push({
            id: doc.id,
            ...notif,
            // Convertir timestamp a string si es necesario
            fecha: notif.fechaCreacion && notif.fechaCreacion.toDate 
              ? notif.fechaCreacion.toDate().toISOString()
              : notif.fechaCreacion || new Date().toISOString()
          });
        });
        
        console.log(`✅ [NOTIFICACIONES] ${notificaciones.length} notificaciones obtenidas para usuario ${usuario_id}`);
        
        res.json({
          success: true,
          data: notificaciones,
          total: notificaciones.length,
          message: 'Notificaciones obtenidas correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [NOTIFICACIONES] Error al obtener notificaciones:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener notificaciones',
          error: error.message
        });
        return true;
      }
    }

    // PUT /notificaciones/:id/leida - Marcar notificación como leída
    if (path.match(/^\/notificaciones\/[^\/]+\/leida$/) && req.method === 'PUT') {
      const notificacionId = path.split('/')[2];
      
      try {
        const notificacionDoc = await db.collection('notificaciones').doc(notificacionId).get();
        
        if (!notificacionDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Notificación no encontrada'
          });
          return true;
        }
        
        // Marcar como leída
        await notificacionDoc.ref.update({
          leida: true,
          fechaLeida: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ [NOTIFICACIONES] Notificación ${notificacionId} marcada como leída`);
        
        res.json({
          success: true,
          message: 'Notificación marcada como leída'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [NOTIFICACIONES] Error al marcar como leída:', error);
        res.status(500).json({
          success: false,
          message: 'Error al marcar notificación como leída',
          error: error.message
        });
        return true;
      }
    }

    // PUT /notificaciones/marcar-todas-leidas - Marcar todas como leídas
    if (path === '/notificaciones/marcar-todas-leidas' && req.method === 'PUT') {
      const { usuario_id } = req.body;
      
      if (!usuario_id) {
        res.status(400).json({
          success: false,
          message: 'El parámetro usuario_id es requerido'
        });
        return true;
      }
      
      try {
        // Obtener todas las notificaciones no leídas del usuario
        const notificacionesSnapshot = await db.collection('notificaciones')
          .where('usuario_id', '==', usuario_id)
          .where('leida', '==', false)
          .get();
        
        if (notificacionesSnapshot.empty) {
          res.json({
            success: true,
            message: 'No hay notificaciones por marcar'
          });
          return true;
        }
        
        // Marcar todas como leídas en lote
        const batch = db.batch();
        
        notificacionesSnapshot.forEach(doc => {
          batch.update(doc.ref, {
            leida: true,
            fechaLeida: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        
        await batch.commit();
        
        console.log(`✅ [NOTIFICACIONES] ${notificacionesSnapshot.size} notificaciones marcadas como leídas para usuario ${usuario_id}`);
        
        res.json({
          success: true,
          message: `${notificacionesSnapshot.size} notificaciones marcadas como leídas`,
          count: notificacionesSnapshot.size
        });
        return true;
        
      } catch (error) {
        console.error('❌ [NOTIFICACIONES] Error al marcar todas como leídas:', error);
        res.status(500).json({
          success: false,
          message: 'Error al marcar notificaciones como leídas',
          error: error.message
        });
        return true;
      }
    }

    // GET /notificaciones/count - Obtener conteo de notificaciones no leídas
    if (path === '/notificaciones/count' && req.method === 'GET') {
      const { usuario_id } = req.query;
      
      if (!usuario_id) {
        res.status(400).json({
          success: false,
          message: 'El parámetro usuario_id es requerido'
        });
        return true;
      }
      
      try {
        const conteoSnapshot = await db.collection('notificaciones')
          .where('usuario_id', '==', usuario_id)
          .where('leida', '==', false)
          .where('activa', '==', true)
          .get();
        
        const conteo = conteoSnapshot.size;
        
        res.json({
          success: true,
          data: { count: conteo },
          message: 'Conteo obtenido correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [NOTIFICACIONES] Error al obtener conteo:', error);
        res.status(500).json({
          success: false,
          message: 'Error al obtener conteo de notificaciones',
          error: error.message
        });
        return true;
      }
    }
    
    // Si ninguna ruta coincide, devolver false
    console.log(`⚠️ [NOTIFICACIONES] Ruta no encontrada: ${req.method} ${path}`);
    return false;
    
  } catch (error) {
    console.error('❌ [NOTIFICACIONES] Error crítico:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = notificacionesRoutes;