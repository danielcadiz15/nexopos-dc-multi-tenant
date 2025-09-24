// functions/routes/proveedores.routes.js
const admin = require('firebase-admin');
const db = admin.firestore();

// Función para manejar todas las rutas de proveedores
const proveedoresRoutes = async (req, res, path) => {
  try {
    const companyId = req.companyId || req.user?.companyId || null;
    
    // PROVEEDORES - GET todos
    if (path === '/proveedores' && req.method === 'GET') {
      let query = db.collection('proveedores');
      if (companyId) query = query.where('orgId', '==', companyId);
      const proveedoresSnapshot = await query.get();
      const proveedores = [];
      
      proveedoresSnapshot.forEach(doc => {
        proveedores.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Proveedores encontrados: ${proveedores.length}`);
      
      res.json({
        success: true,
        data: proveedores,
        total: proveedores.length,
        message: 'Proveedores obtenidos correctamente'
      });
      return true;
    }
    
    // PROVEEDORES - GET activos
    else if (path === '/proveedores/activos' && req.method === 'GET') {
      let query = db.collection('proveedores').where('activo', '==', true);
      if (companyId) query = query.where('orgId', '==', companyId);
      const proveedoresSnapshot = await query.get();
      
      const proveedores = [];
      proveedoresSnapshot.forEach(doc => {
        proveedores.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      res.json({
        success: true,
        data: proveedores,
        total: proveedores.length,
        message: 'Proveedores activos obtenidos correctamente'
      });
      return true;
    }
    
    // PROVEEDOR - GET por ID
    else if (path.startsWith('/proveedores/') && req.method === 'GET') {
      const proveedorId = path.split('/proveedores/')[1];
      
      // Verificar si es una ruta especial
      if (proveedorId === 'activos') {
        return false; // Ya manejado arriba
      }
      
      const proveedorDoc = await db.collection('proveedores').doc(proveedorId).get();
      
      if (!proveedorDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Proveedor no encontrado'
        });
        return true;
      }
      
      res.json({
        success: true,
        data: {
          id: proveedorDoc.id,
          ...proveedorDoc.data()
        },
        message: 'Proveedor obtenido correctamente'
      });
      return true;
    }
    
    // PROVEEDORES - POST crear nuevo
    else if (path === '/proveedores' && req.method === 'POST') {
      const nuevoProveedor = req.body;
      
      // Validación básica
      if (!nuevoProveedor.nombre) {
        res.status(400).json({
          success: false,
          message: 'El nombre del proveedor es requerido'
        });
        return true;
      }
      
      // Estructura para Firebase
      const proveedorFirebase = {
        ...nuevoProveedor,
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        activo: nuevoProveedor.activo !== false,
        ...(companyId ? { orgId: companyId } : {})
      };
      
      const docRef = await db.collection('proveedores').add(proveedorFirebase);
      
      res.status(201).json({
        success: true,
        data: {
          id: docRef.id,
          ...proveedorFirebase
        },
        message: 'Proveedor creado correctamente'
      });
      return true;
    }
    
    // PROVEEDORES - PUT actualizar
    else if (path.startsWith('/proveedores/') && req.method === 'PUT') {
      const proveedorId = path.split('/proveedores/')[1];
      const datosActualizacion = req.body;
      
      // Agregar timestamp de actualización
      datosActualizacion.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();
      
      await db.collection('proveedores').doc(proveedorId).update(datosActualizacion);
      
      res.json({
        success: true,
        data: {
          id: proveedorId,
          ...datosActualizacion
        },
        message: 'Proveedor actualizado correctamente'
      });
      return true;
    }
    
    // PROVEEDORES - DELETE eliminar
    else if (path.startsWith('/proveedores/') && req.method === 'DELETE') {
      const proveedorId = path.split('/proveedores/')[1];
      
      await db.collection('proveedores').doc(proveedorId).delete();
      
      res.json({
        success: true,
        message: 'Proveedor eliminado correctamente'
      });
      return true;
    }
    
    // Si ninguna ruta coincide, devolver false
    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de proveedores:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = proveedoresRoutes;