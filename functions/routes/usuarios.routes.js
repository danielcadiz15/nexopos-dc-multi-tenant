// functions/routes/usuarios.routes.js - CORREGIDO PARA DB
const admin = require('firebase-admin');

// Asegurar que admin esté inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const MODULOS_VALIDOS = [
  'productos', 'categorias', 'compras', 'ventas', 'stock', 
  'reportes', 'promociones', 'usuarios', 'sucursales',
  'materias_primas', 'recetas', 'produccion',
  // NUEVOS MÓDULOS
  'clientes', 'caja', 'gastos', 'devoluciones', 
  'listas_precios', 'transferencias', 'auditoria'
];
// Función para manejar todas las rutas de usuarios
const usuariosRoutes = async (req, res, path) => {
  try {
    console.log('🎭 [USUARIOS] Procesando ruta:', { method: req.method, path });
    
    const pathParts = path.split('/').filter(p => p);
    
    // GET /api/usuarios - Obtener todos los usuarios
    if (req.method === 'GET' && pathParts.length === 1) {
      try {
        console.log('📋 [USUARIOS] Obteniendo todos los usuarios de Firestore...');
        
        const snapshot = await db.collection('usuarios').get();
        const usuarios = [];
        
        snapshot.forEach(doc => {
          usuarios.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log(`✅ [USUARIOS] ${usuarios.length} usuarios encontrados en Firestore`);
        
        res.json({
          success: true,
          data: usuarios,
          total: usuarios.length,
          message: 'Usuarios obtenidos correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [USUARIOS] Error al obtener usuarios:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error al obtener usuarios'
        });
        return true;
      }
    }
    
    // GET /api/usuarios/:id - Obtener usuario específico
    if (req.method === 'GET' && pathParts.length === 2) {
      try {
        const userId = pathParts[1];
        console.log(`🔍 [USUARIOS] Obteniendo usuario ID: ${userId}`);
        
        const doc = await db.collection('usuarios').doc(userId).get();
        
        if (!doc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Usuario no encontrado',
            message: 'Usuario no encontrado'
          });
        }
        
        const usuario = {
          id: doc.id,
          ...doc.data()
        };
        
        console.log('✅ [USUARIOS] Usuario encontrado');
        
        res.json({
          success: true,
          data: usuario,
          message: 'Usuario obtenido correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [USUARIOS] Error al obtener usuario:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error al obtener usuario'
        });
        return true;
      }
    }
    
    // GET /api/usuarios/buscar?termino=xxx - Buscar usuarios
    if (req.method === 'GET' && pathParts[1] === 'buscar') {
      try {
        const termino = req.query.termino || '';
        console.log(`🔍 [USUARIOS] Buscando usuarios con término: "${termino}"`);
        
        const snapshot = await db.collection('usuarios').get();
        
        const usuarios = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const nombre = (data.nombre || '').toLowerCase();
          const apellido = (data.apellido || '').toLowerCase();
          const email = (data.email || '').toLowerCase();
          const terminoLower = termino.toLowerCase();
          
          if (nombre.includes(terminoLower) || 
              apellido.includes(terminoLower) || 
              email.includes(terminoLower)) {
            usuarios.push({
              id: doc.id,
              ...data
            });
          }
        });
        
        console.log(`✅ [USUARIOS] ${usuarios.length} usuarios encontrados en búsqueda`);
        
        res.json({
          success: true,
          data: usuarios,
          total: usuarios.length,
          termino: termino,
          message: 'Búsqueda de usuarios completada'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [USUARIOS] Error en búsqueda:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error en la búsqueda de usuarios'
        });
        return true;
      }
    }
    
    // GET /api/usuarios/:id/sucursales - Sucursales de un usuario
    if (req.method === 'GET' && pathParts.length === 3 && pathParts[2] === 'sucursales') {
      try {
        const uid = pathParts[1];
        console.log(`🏢 [USUARIOS] Obteniendo sucursales del usuario: ${uid}`);
        
        const userDoc = await db.collection('usuarios').doc(uid).get();
        
        if (!userDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Usuario no encontrado',
            message: 'Usuario no encontrado'
          });
        }
        
        const sucursales = userDoc.data().sucursales || [];
        
        // Obtener detalles de las sucursales
        const sucursalesDetalle = [];
        for (const sucursalId of sucursales) {
          try {
            const sucDoc = await db.collection('sucursales').doc(sucursalId).get();
            
            if (sucDoc.exists) {
              sucursalesDetalle.push({
                id: sucDoc.id,
                ...sucDoc.data()
              });
            }
          } catch (error) {
            console.warn(`⚠️ Error al obtener sucursal ${sucursalId}:`, error.message);
          }
        }
        
        console.log(`✅ [USUARIOS] ${sucursalesDetalle.length} sucursales obtenidas`);
        
        res.json({
          success: true,
          data: sucursalesDetalle,
          total: sucursalesDetalle.length,
          message: 'Sucursales del usuario obtenidas correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [USUARIOS] Error al obtener sucursales:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error al obtener sucursales del usuario'
        });
        return true;
      }
    }
    // PUT /api/usuarios/:id - Actualizar usuario completo
    if (req.method === 'PUT' && pathParts.length === 2) {
      try {
        const uid = pathParts[1];
        const datosActualizacion = req.body;
        
        console.log(`🔄 [USUARIOS] Actualizando usuario completo ${uid}:`, {
          nombre: datosActualizacion.nombre,
          rol: datosActualizacion.rol,
          permisos: datosActualizacion.permisos ? 'Sí' : 'No'
        });
        
        // Validación básica
        if (!datosActualizacion.email && !datosActualizacion.nombre) {
          res.status(400).json({
            success: false,
            message: 'Email o nombre son requeridos para actualización'
          });
          return true;
        }
        
        // Validar permisos si se envían
        if (datosActualizacion.permisos) {
          const modulosEnviados = Object.keys(datosActualizacion.permisos);
          const modulosInvalidos = modulosEnviados.filter(mod => !MODULOS_VALIDOS.includes(mod));
          
          if (modulosInvalidos.length > 0) {
            res.status(400).json({
              success: false,
              message: `Módulos inválidos: ${modulosInvalidos.join(', ')}`
            });
            return true;
          }
        }
        
        // Verificar que el usuario existe
        const usuarioDoc = await db.collection('usuarios').doc(uid).get();
        if (!usuarioDoc.exists) {
          res.status(404).json({
            success: false,
            message: 'Usuario no encontrado'
          });
          return true;
        }
        
        // Preparar datos para Firestore (sin password)
        const datosFirestore = { ...datosActualizacion };
        delete datosFirestore.password; // No guardar password en Firestore
        
        // Agregar timestamp de actualización
        datosFirestore.fechaActualizacion = admin.firestore.FieldValue.serverTimestamp();
        
        // Actualizar en Firestore
        await db.collection('usuarios').doc(uid).update(datosFirestore);
        console.log('✅ [USUARIOS] Usuario actualizado en Firestore');
        
        // Preparar datos para Firebase Auth
        const authUpdateData = {};
        
        if (datosActualizacion.email) {
          authUpdateData.email = datosActualizacion.email;
        }
        
        if (datosActualizacion.nombre || datosActualizacion.apellido) {
          authUpdateData.displayName = `${datosActualizacion.nombre || ''} ${datosActualizacion.apellido || ''}`.trim();
        }
        
        if (datosActualizacion.password && datosActualizacion.password.length >= 6) {
          authUpdateData.password = datosActualizacion.password;
        }
        
        if (datosActualizacion.activo !== undefined) {
          authUpdateData.disabled = !datosActualizacion.activo;
        }
        
        // Actualizar en Firebase Auth si hay cambios
        if (Object.keys(authUpdateData).length > 0) {
          await admin.auth().updateUser(uid, authUpdateData);
          console.log('✅ [USUARIOS] Usuario actualizado en Firebase Auth');
        }
        
        // Obtener datos actualizados para custom claims
        const usuarioActualizado = await db.collection('usuarios').doc(uid).get();
        const datosCompletos = usuarioActualizado.data();
        
        // Actualizar custom claims
        const customClaims = {
		  rol: datosCompletos.rol || 'Empleado',
		  activo: datosCompletos.activo !== false
		};
        
        await admin.auth().setCustomUserClaims(uid, customClaims);
        console.log('✅ [USUARIOS] Custom claims actualizados');
        
        // Preparar respuesta
        const respuesta = {
          id: uid,
          ...datosCompletos,
          // No incluir timestamps de Firestore en la respuesta
          fechaCreacion: undefined,
          fechaActualizacion: undefined
        };
        
        console.log('✅ [USUARIOS] Usuario actualizado completamente');
        
        res.json({
          success: true,
          data: respuesta,
          message: 'Usuario actualizado correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [USUARIOS] Error al actualizar usuario:', error);
        
        // Mensajes de error más específicos
        let mensajeError = 'Error al actualizar usuario';
        
        if (error.code === 'auth/email-already-exists') {
          mensajeError = 'El email ya está en uso por otro usuario';
        } else if (error.code === 'auth/invalid-email') {
          mensajeError = 'El formato del email es inválido';
        } else if (error.code === 'auth/user-not-found') {
          mensajeError = 'Usuario no encontrado en Firebase Auth';
        } else if (error.code === 'auth/weak-password') {
          mensajeError = 'La contraseña es muy débil (mínimo 6 caracteres)';
        } else if (error.message) {
          mensajeError = error.message;
        }
        
        res.status(500).json({
          success: false,
          message: mensajeError,
          error: error.message
        });
        return true;
      }
    }
    // GET /api/usuarios/roles - Obtener roles disponibles
    if (req.method === 'GET' && pathParts[1] === 'roles') {
      try {
        console.log('🎭 [USUARIOS] Obteniendo roles disponibles');
        
        // Retornar roles predefinidos
        const roles = [
          {
            id: 'admin',
            nombre: 'Administrador',
            descripcion: 'Acceso total al sistema'
          },
          {
            id: 'empleado', 
            nombre: 'Empleado',
            descripcion: 'Acceso a ventas y productos'
          },
          {
            id: 'gerente',
            nombre: 'Gerente', 
            descripcion: 'Acceso a reportes y gestión'
          }
        ];
        
        console.log(`✅ [USUARIOS] ${roles.length} roles disponibles`);
        
        res.json({
          success: true,
          data: roles,
          total: roles.length,
          message: 'Roles obtenidos correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [USUARIOS] Error al obtener roles:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error al obtener roles'
        });
        return true;
      }
    }
    
    // POST /api/usuarios - Crear usuario
    if (req.method === 'POST' && pathParts.length === 1) {
      try {
        const nuevoUsuario = req.body;
        console.log('🆕 [USUARIOS] Creando usuario:', {
          email: nuevoUsuario.email,
          nombre: nuevoUsuario.nombre,
          rol: nuevoUsuario.rol
        });
        
        // Validación básica
        if (!nuevoUsuario.email || !nuevoUsuario.nombre) {
          res.status(400).json({
            success: false,
            message: 'Email y nombre son requeridos'
          });
          return true;
        }
        
        // Crear usuario en Firebase Auth
        const userRecord = await admin.auth().createUser({
          email: nuevoUsuario.email,
          password: nuevoUsuario.password || 'Temp123!',
          displayName: `${nuevoUsuario.nombre} ${nuevoUsuario.apellido || ''}`.trim()
        });
        
        // Guardar en Firestore
        const usuarioFirestore = {
          ...nuevoUsuario,
          uid: userRecord.uid,
          fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
          activo: nuevoUsuario.activo !== false
        };
        
        delete usuarioFirestore.password; // No guardar password en Firestore
        
        await db.collection('usuarios').doc(userRecord.uid).set(usuarioFirestore);
        
        // Establecer custom claims
        await admin.auth().setCustomUserClaims(userRecord.uid, {
          rol: nuevoUsuario.rol || 'Empleado',
          rolId: nuevoUsuario.rol_id || '2',
          permisos: nuevoUsuario.permisos || {},
          activo: usuarioFirestore.activo
        });
        
        console.log('✅ [USUARIOS] Usuario creado correctamente');
        
        res.status(201).json({
          success: true,
          data: {
            id: userRecord.uid,
            ...usuarioFirestore
          },
          message: 'Usuario creado correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [USUARIOS] Error al crear usuario:', error);
        res.status(500).json({
          success: false,
          message: 'Error al crear usuario',
          error: error.message
        });
        return true;
      }
    }
    
    // PUT /api/usuarios/:id - Actualizar usuario
    if (datosActualizacion.permisos) {
	  // Validar que todos los módulos sean válidos
	  const modulosEnviados = Object.keys(datosActualizacion.permisos);
	  const modulosInvalidos = modulosEnviados.filter(mod => !MODULOS_VALIDOS.includes(mod));
	  
	  if (modulosInvalidos.length > 0) {
		res.status(400).json({
		  success: false,
		  message: `Módulos inválidos: ${modulosInvalidos.join(', ')}`
		});
		return true;
	  }
	}
    
    // PATCH /api/usuarios/:id/password - Cambiar contraseña
    if (req.method === 'PATCH' && pathParts.length === 3 && pathParts[2] === 'password') {
      try {
        const uid = pathParts[1];
        const { nuevaPassword } = req.body;
        
        console.log(`🔐 [USUARIOS] Cambiando contraseña del usuario: ${uid}`);
        
        if (!nuevaPassword || nuevaPassword.length < 6) {
          res.status(400).json({
            success: false,
            message: 'La contraseña debe tener al menos 6 caracteres'
          });
          return true;
        }
        
        await admin.auth().updateUser(uid, {
          password: nuevaPassword
        });
        
        console.log('✅ [USUARIOS] Contraseña actualizada correctamente');
        
        res.json({
          success: true,
          message: 'Contraseña actualizada correctamente'
        });
        return true;
        
      } catch (error) {
        console.error('❌ [USUARIOS] Error al cambiar contraseña:', error);
        res.status(500).json({
          success: false,
          message: 'Error al cambiar contraseña',
          error: error.message
        });
        return true;
      }
    }
    
    // PATCH /api/usuarios/:id/estado - Cambiar estado activo/inactivo
    if (req.method === 'PATCH' && pathParts.length === 3 && pathParts[2] === 'estado') {
      try {
        const uid = pathParts[1];
        const { activo } = req.body;
        
        console.log(`🔄 [USUARIOS] Cambiando estado del usuario ${uid} a:`, activo);
        
        // Actualizar en Firestore
        await db.collection('usuarios').doc(uid).update({
          activo: activo,
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Actualizar en Firebase Auth
        await admin.auth().updateUser(uid, {
          disabled: !activo
        });
        
        // Actualizar custom claims
        const userDoc = await db.collection('usuarios').doc(uid).get();
        const userData = userDoc.data();
        
        const customClaims = {
		  rol: userData.rol || 'Empleado',
		  activo: userData.activo !== false
		};
        
        console.log('✅ [USUARIOS] Estado actualizado correctamente');
        
        res.json({
          success: true,
          message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente`
        });
        return true;
        
      } catch (error) {
        console.error('❌ [USUARIOS] Error al cambiar estado:', error);
        res.status(500).json({
          success: false,
          message: 'Error al cambiar estado de usuario',
          error: error.message
        });
        return true;
      }
    }
    
    // Si ninguna ruta coincide, devolver false
    console.log('⚠️ [USUARIOS] Ruta no encontrada:', { method: req.method, pathParts });
    return false;
    
  } catch (error) {
    console.error('❌ [USUARIOS] Error crítico en rutas de usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
    return true;
  }
};

module.exports = usuariosRoutes;