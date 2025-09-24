// functions/routes/sucursales.routes.js
const admin = require('firebase-admin');
const db = admin.firestore();

// Función para crear sucursal principal por defecto para una empresa específica
async function crearSucursalPrincipal(companyId) {
  try {
    console.log(`🏢 Verificando si existe sucursal principal para empresa: ${companyId}`);
    
    let query = db.collection('sucursales');
    
    // Filtrar por companyId si está disponible
    if (companyId) {
      query = query.where('orgId', '==', companyId);
    }
    
    const sucursalesSnapshot = await query.limit(1).get();
    
    if (sucursalesSnapshot.empty) {
      console.log(`📝 Creando sucursal principal por defecto para empresa: ${companyId}`);
      
      const sucursalPrincipal = {
        nombre: 'Sucursal Principal',
        direccion: '',
        telefono: '',
        email: '',
        responsable: '',
        activa: true,
        es_principal: true,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
        observaciones: 'Sucursal principal creada automáticamente por el sistema',
        ...(companyId ? { orgId: companyId } : {})
      };
      
      const docRef = await db.collection('sucursales').add(sucursalPrincipal);
      console.log(`✅ Sucursal principal creada con ID: ${docRef.id} para empresa: ${companyId}`);
      
      return {
        id: docRef.id,
        ...sucursalPrincipal
      };
    } else {
      console.log(`✅ Ya existe sucursal principal para empresa: ${companyId}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error al crear sucursal principal:', error);
    throw error;
  }
}

// Función para manejar todas las rutas de sucursales
const sucursalesRoutes = async (req, res, path) => {
  try {
    // Obtener companyId para filtrado multi-tenant
    const companyId = req.companyId || req.user?.companyId || null;
    
    // SUCURSALES - GET todas
    if (path === '/sucursales' && req.method === 'GET') {
      // Verificar si existe al menos una sucursal para esta empresa, si no, crear la principal
      await crearSucursalPrincipal(companyId);
      
      let query = db.collection('sucursales');
      
      // Filtrar por companyId si está disponible
      if (companyId) {
        query = query.where('orgId', '==', companyId);
        console.log(`🔍 [MULTI-TENANT] Obteniendo sucursales por companyId: ${companyId}`);
      } else {
        console.log('⚠️ [MULTI-TENANT] No hay companyId, mostrando todas las sucursales');
      }
      
      const sucursalesSnapshot = await query.get();
      const sucursales = [];
      
      sucursalesSnapshot.forEach(doc => {
        sucursales.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Sucursales encontradas: ${sucursales.length}`);
      
      res.json({
        success: true,
        data: sucursales,
        total: sucursales.length,
        message: 'Sucursales obtenidas correctamente'
      });
      return true;
    }

    // SUCURSALES - GET activas
    else if (path === '/sucursales/activas' && req.method === 'GET') {
      console.log(`🔍 [SUCURSALES] Obteniendo sucursales activas para companyId: ${companyId}`);
      
      const sucursales = [];
      
      if (companyId) {
        // Buscar en la colección principal con orgId
        let query = db.collection('sucursales').where('orgId', '==', companyId);
        const sucursalesSnapshot = await query.get();
        
        sucursalesSnapshot.forEach(doc => {
          sucursales.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Si no se encontraron sucursales en la colección principal, buscar en la subcolección del tenant
        if (sucursales.length === 0) {
          console.log(`🔍 [SUCURSALES] No se encontraron sucursales en colección principal, buscando en subcolección del tenant`);
          
          const tenantSucursalesSnapshot = await db.collection('tenants').doc(companyId).collection('sucursales').get();
          
          tenantSucursalesSnapshot.forEach(doc => {
            sucursales.push({
              id: doc.id,
              ...doc.data(),
              orgId: companyId // Asegurar que tenga orgId
            });
          });
          
          // Si se encontraron en la subcolección, crear espejo en la colección principal
          if (sucursales.length > 0) {
            console.log(`📝 [SUCURSALES] Creando espejo de ${sucursales.length} sucursales en colección principal`);
            const batch = db.batch();
            
            sucursales.forEach(sucursal => {
              const docRef = db.collection('sucursales').doc(sucursal.id);
              batch.set(docRef, {
                ...sucursal,
                orgId: companyId,
                activa: true,
                tipo: sucursal.tipo || 'principal'
              });
            });
            
            await batch.commit();
            console.log(`✅ [SUCURSALES] Espejo creado exitosamente`);
          }
        }
      } else {
        // Seguridad multi-tenant: nunca devolver sucursales fuera de un contexto de empresa
        console.warn('⚠️ [SUCURSALES] companyId ausente; retornando lista vacía para evitar fuga de datos');
        return res.json({ success: true, data: [], total: 0, message: 'Sin contexto de empresa' });
      }
      
      console.log(`✅ [SUCURSALES] Sucursales activas encontradas: ${sucursales.length}`);
      
      res.json({
        success: true,
        data: sucursales,
        total: sucursales.length,
        message: 'Sucursales activas obtenidas correctamente'
      });
      return true;
    }

    // SUCURSALES - GET por usuario
    else if (path.match(/^\/sucursales\/usuario\/[^\/]+$/) && req.method === 'GET') {
      const usuarioId = path.split('/usuario/')[1];
      
      // Primero obtener el usuario
      const usuarioDoc = await db.collection('usuarios').doc(usuarioId).get();
      
      if (!usuarioDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
        return true;
      }
      
      const usuario = usuarioDoc.data();
      
      // Si es administrador, devolver todas las sucursales
      if (usuario.rol === 'Administrador') {
        const sucursalesSnapshot = await db.collection('sucursales')
          .where('activa', '==', true)
          .get();
        
        const sucursales = [];
        sucursalesSnapshot.forEach(doc => {
          sucursales.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        res.json({
          success: true,
          data: sucursales,
          message: 'Todas las sucursales (usuario administrador)'
        });
        return true;
      }
      
      // Si no es admin, devolver solo sus sucursales asignadas
      const sucursalIds = usuario.sucursales || [];
      
      if (sucursalIds.length === 0) {
        res.json({
          success: true,
          data: [],
          message: 'Usuario sin sucursales asignadas'
        });
        return true;
      }
      
      // Obtener las sucursales asignadas
      const sucursales = [];
      for (const sucursalId of sucursalIds) {
        const sucursalDoc = await db.collection('sucursales').doc(sucursalId).get();
        if (sucursalDoc.exists && sucursalDoc.data().activa) {
          sucursales.push({
            id: sucursalDoc.id,
            ...sucursalDoc.data()
          });
        }
      }
      
      res.json({
        success: true,
        data: sucursales,
        message: 'Sucursales del usuario obtenidas correctamente'
      });
      return true;
    }

    // SUCURSALES - GET stock de una sucursal
    else if (path.match(/^\/sucursales\/[^\/]+\/stock$/) && req.method === 'GET') {
      const sucursalId = path.split('/')[2];
      
      // Verificar que la sucursal existe
      const sucursalDoc = await db.collection('sucursales').doc(sucursalId).get();
      
      if (!sucursalDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Sucursal no encontrada'
        });
        return true;
      }
      
      // Obtener stock de la sucursal
      const stockSnapshot = await db.collection('stock_sucursal')
        .where('sucursal_id', '==', sucursalId)
        .get();
      
      const stock = [];
      
      // Para cada item de stock, obtener información del producto
      for (const doc of stockSnapshot.docs) {
        const stockData = doc.data();
        
        // Obtener información del producto
        const productoDoc = await db.collection('productos').doc(stockData.producto_id).get();
        
        if (productoDoc.exists) {
          const productoData = productoDoc.data();
          stock.push({
            id: doc.id,
            ...stockData,
            producto: {
              id: productoDoc.id,
              codigo: productoData.codigo,
              nombre: productoData.nombre,
              descripcion: productoData.descripcion,
              categoria_id: productoData.categoria_id
            }
          });
        }
      }
      
      res.json({
        success: true,
        data: stock,
        total: stock.length,
        message: 'Stock de sucursal obtenido correctamente'
      });
      return true;
    }

    // SUCURSAL - GET por ID
    else if (path.match(/^\/sucursales\/[^\/]+$/) && req.method === 'GET') {
      const sucursalId = path.split('/sucursales/')[1];
      
      // Verificar si no es una ruta especial
      if (['activas', 'usuario'].includes(sucursalId)) {
        return false; // Ya manejado arriba
      }
      
      const sucursalDoc = await db.collection('sucursales').doc(sucursalId).get();
      
      if (!sucursalDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Sucursal no encontrada'
        });
        return true;
      }
      
      res.json({
        success: true,
        data: {
          id: sucursalDoc.id,
          ...sucursalDoc.data()
        },
        message: 'Sucursal obtenida correctamente'
      });
      return true;
    }

    // SUCURSALES - POST crear nueva
    else if (path === '/sucursales' && req.method === 'POST') {
      const nuevaSucursal = req.body;
      
      // Validación básica
      if (!nuevaSucursal.nombre) {
        res.status(400).json({
          success: false,
          message: 'El nombre de la sucursal es requerido'
        });
        return true;
      }
      
      // Estructura para Firebase
      const sucursalFirebase = {
        ...nuevaSucursal,
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        activa: nuevaSucursal.activa !== false,
        ...(companyId ? { orgId: companyId } : {})
      };
      
      const docRef = await db.collection('sucursales').add(sucursalFirebase);
      
      res.status(201).json({
        success: true,
        data: {
          id: docRef.id,
          ...sucursalFirebase
        },
        message: 'Sucursal creada correctamente'
      });
      return true;
    }

    // SUCURSALES - PUT actualizar
    else if (path.match(/^\/sucursales\/[^\/]+$/) && req.method === 'PUT') {
      const sucursalId = path.split('/sucursales/')[1];
      const datosActualizacion = req.body;
      
      // Agregar timestamp de actualización
      datosActualizacion.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();
      
      await db.collection('sucursales').doc(sucursalId).update(datosActualizacion);
      
      res.json({
        success: true,
        data: {
          id: sucursalId,
          ...datosActualizacion
        },
        message: 'Sucursal actualizada correctamente'
      });
      return true;
    }

    // SUCURSALES - DELETE eliminar
    else if (path.match(/^\/sucursales\/[^\/]+$/) && req.method === 'DELETE') {
      const sucursalId = path.split('/sucursales/')[1];
      
      // Verificar que no sea la sucursal principal
      const sucursalDoc = await db.collection('sucursales').doc(sucursalId).get();
      
      if (!sucursalDoc.exists) {
        res.status(404).json({
          success: false,
          message: 'Sucursal no encontrada'
        });
        return true;
      }
      
      const sucursal = sucursalDoc.data();
      
      if (sucursal.tipo === 'principal') {
        res.status(400).json({
          success: false,
          message: 'No se puede eliminar la sucursal principal'
        });
        return true;
      }
      
      // Verificar que no tenga stock
      const stockSnapshot = await db.collection('stock_sucursal')
        .where('sucursal_id', '==', sucursalId)
        .where('cantidad', '>', 0)
        .limit(1)
        .get();
      
      if (!stockSnapshot.empty) {
        res.status(400).json({
          success: false,
          message: 'No se puede eliminar una sucursal con stock'
        });
        return true;
      }
      
      await db.collection('sucursales').doc(sucursalId).delete();
      
      res.json({
        success: true,
        message: 'Sucursal eliminada correctamente'
      });
      return true;
    }
    
    // Si ninguna ruta coincide, devolver false
    return false;
    
  } catch (error) {
    console.error('❌ Error en rutas de sucursales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = sucursalesRoutes;