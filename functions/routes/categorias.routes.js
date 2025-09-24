// functions/routes/categorias.routes.js
const admin = require('firebase-admin');
const db = admin.firestore();

// Función para manejar todas las rutas de categorías
const categoriasRoutes = async (req, res, path) => {
  try {
    const companyId = req.companyId || req.user?.companyId || null;
    
    // CATEGORIAS - GET todas
    if (path === '/categorias' && req.method === 'GET') {
      let query = db.collection('categorias');
      if (companyId) query = query.where('orgId', '==', companyId);
      const categoriasSnapshot = await query.get();
      const categorias = [];
      
      categoriasSnapshot.forEach(doc => {
        categorias.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Categorías encontradas: ${categorias.length}`);
      
      res.json({
        success: true,
        data: categorias,
        total: categorias.length,
        message: 'Categorías obtenidas correctamente'
      });
      return true;
    }
    
    // CATEGORIAS - GET activas
    else if (path === '/categorias/activas' && req.method === 'GET') {
      let query = db.collection('categorias').where('activo', '==', true);
      if (companyId) query = query.where('orgId', '==', companyId);
      const categoriasSnapshot = await query.get();
      
      const categorias = [];
      categoriasSnapshot.forEach(doc => {
        categorias.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      res.json({
        success: true,
        data: categorias,
        total: categorias.length,
        message: 'Categorías activas obtenidas correctamente'
      });
      return true;
    }
    
    // CATEGORIA - GET por ID
    else if (path.startsWith('/categorias/') && req.method === 'GET') {
      const categoriaId = path.split('/categorias/')[1];
      
      // Verificar si es una ruta especial
      if (categoriaId === 'activas') {
        return false; // Ya manejado arriba
      }
      
      const categoriaDoc = await db.collection('categorias').doc(categoriaId).get();
      
      if (!categoriaDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Categoría no encontrada'
        });
        return true;
      }
      
      res.json({
        success: true,
        data: {
          id: categoriaDoc.id,
          ...categoriaDoc.data()
        },
        message: 'Categoría obtenida correctamente'
      });
      return true;
    }
    
    // CATEGORIAS - POST crear nueva
    else if (path === '/categorias' && req.method === 'POST') {
      const nuevaCategoria = req.body;
      
      // Validación básica
      if (!nuevaCategoria.nombre) {
        res.status(400).json({
          success: false,
          message: 'El nombre de la categoría es requerido'
        });
        return true;
      }
      
      // Estructura para Firebase
      const categoriaFirebase = {
        ...nuevaCategoria,
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        activo: nuevaCategoria.activo !== false,
        ...(companyId ? { orgId: companyId } : {})
      };
      
      const docRef = await db.collection('categorias').add(categoriaFirebase);
      
      res.status(201).json({
        success: true,
        data: {
          id: docRef.id,
          ...categoriaFirebase
        },
        message: 'Categoría creada correctamente'
      });
      return true;
    }
    
    // CATEGORIAS - PUT actualizar
    else if (path.startsWith('/categorias/') && req.method === 'PUT') {
      const categoriaId = path.split('/categorias/')[1];
      const datosActualizacion = req.body;
      
      // Agregar timestamp de actualización
      datosActualizacion.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();
      
      await db.collection('categorias').doc(categoriaId).update(datosActualizacion);
      
      res.json({
        success: true,
        data: {
          id: categoriaId,
          ...datosActualizacion
        },
        message: 'Categoría actualizada correctamente'
      });
      return true;
    }
    
    // CATEGORIAS - DELETE eliminar
    else if (path.startsWith('/categorias/') && req.method === 'DELETE') {
      const categoriaId = path.split('/categorias/')[1];
      
      // Verificar si hay productos asociados (opcional)
      const productosSnapshot = await db.collection('productos')
        .where('categoria_id', '==', categoriaId)
        .limit(1)
        .get();
      
      if (!productosSnapshot.empty) {
        res.status(400).json({
          success: false,
          message: 'No se puede eliminar la categoría porque tiene productos asociados'
        });
        return true;
      }
      
      await db.collection('categorias').doc(categoriaId).delete();
      
      res.json({
        success: true,
        message: 'Categoría eliminada correctamente'
      });
      return true;
    }
    
    // Si ninguna ruta coincide, devolver false
    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de categorías:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = categoriasRoutes;