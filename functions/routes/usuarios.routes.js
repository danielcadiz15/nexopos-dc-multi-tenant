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

const ROLES_SISTEMA = [
  {
    id: 'admin',
    nombre: 'Administrador',
    descripcion: 'Acceso total al sistema'
  },
  {
    id: 'gerente',
    nombre: 'Gerente',
    descripcion: 'Administración operativa sin permisos críticos'
  },
  {
    id: 'cajero',
    nombre: 'Cajero',
    descripcion: 'Acceso al punto de venta y caja básica'
  },
  {
    id: 'empleado',
    nombre: 'Empleado',
    descripcion: 'Acceso operativo limitado'
  }
];

const PERMISOS_POR_ROL = {
  admin: {
    productos: { ver: true, crear: true, editar: true, eliminar: true },
    categorias: { ver: true, crear: true, editar: true, eliminar: true },
    compras: { ver: true, crear: true, editar: true, eliminar: true },
    ventas: { ver: true, crear: true, editar: true, eliminar: true },
    stock: { ver: true, crear: true, editar: true, eliminar: true },
    reportes: { ver: true, crear: true, editar: true, eliminar: true },
    promociones: { ver: true, crear: true, editar: true, eliminar: true },
    usuarios: { ver: true, crear: true, editar: true, eliminar: true, configurar_roles: true },
    sucursales: { ver: true, crear: true, editar: true, eliminar: true },
    clientes: { ver: true, crear: true, editar: true, eliminar: true },
    caja: { ver: true, crear: true, editar: true, eliminar: true },
    gastos: { ver: true, crear: true, editar: true, eliminar: true },
    devoluciones: { ver: true, crear: true, editar: true, eliminar: true },
    listas_precios: { ver: true, crear: true, editar: true, eliminar: true },
    transferencias: { ver: true, crear: true, editar: true, eliminar: true },
    auditoria: { ver: true, crear: true, editar: true, eliminar: true }
  },
  gerente: {
    productos: { ver: true, crear: true, editar: true, eliminar: false },
    compras: { ver: true, crear: true, editar: true, eliminar: false },
    ventas: { ver: true, crear: true, editar: true, eliminar: false },
    stock: { ver: true, crear: true, editar: true, eliminar: false },
    reportes: { ver: true, crear: true, editar: false, eliminar: false },
    usuarios: { ver: true, crear: false, editar: false, eliminar: false },
    clientes: { ver: true, crear: true, editar: true, eliminar: false },
    caja: { ver: true, crear: true, editar: true, eliminar: false },
    sucursales: { ver: true, crear: false, editar: false, eliminar: false }
  },
  cajero: {
    productos: { ver: true, crear: false, editar: false, eliminar: false },
    ventas: { ver: true, crear: true, editar: false, eliminar: false },
    clientes: { ver: true, crear: true, editar: false, eliminar: false },
    caja: { ver: true, crear: true, editar: false, eliminar: false },
    stock: { ver: true, crear: false, editar: false, eliminar: false },
    reportes: { ver: false, crear: false, editar: false, eliminar: false },
    usuarios: { ver: false, crear: false, editar: false, eliminar: false },
    sucursales: { ver: false, crear: false, editar: false, eliminar: false }
  },
  empleado: {
    productos: { ver: true, crear: false, editar: false, eliminar: false },
    ventas: { ver: true, crear: true, editar: false, eliminar: false },
    clientes: { ver: true, crear: false, editar: false, eliminar: false },
    stock: { ver: true, crear: false, editar: false, eliminar: false },
    usuarios: { ver: false, crear: false, editar: false, eliminar: false }
  }
};

const normalizarRolId = (rol) => {
  const value = String(rol || 'empleado').toLowerCase();
  if (value === 'administrador') return 'admin';
  if (value === 'vendedor' || value === 'viewer') return 'cajero';
  return ['admin', 'gerente', 'cajero', 'empleado'].includes(value) ? value : 'empleado';
};

const nombreRol = (rolId) => {
  const rol = ROLES_SISTEMA.find((item) => item.id === rolId);
  return rol?.nombre || 'Empleado';
};

const esAdminEmpresa = (req) => {
  const rol = String(req.user?.rol || '').toLowerCase();
  return ['admin', 'administrador', 'gerente'].includes(rol) ||
    req.user?.permisos?.usuarios?.crear === true ||
    req.user?.permisos?.usuarios?.editar === true;
};

const getCompanyId = (req) => req.companyId || req.user?.companyId || req.user?.orgId || req.query?.orgId || null;

const ensureRequesterUserDoc = async (req, companyId, usuariosRef) => {
  if (!req.user?.uid || !companyId || !usuariosRef) return;

  const requesterRef = usuariosRef.doc(req.user.uid);
  const requesterSnap = await requesterRef.get();
  if (requesterSnap.exists) return;

  const rolId = normalizarRolId(req.user.rol || req.user.role || 'admin');
  await requesterRef.set({
    uid: req.user.uid,
    email: req.user.email || '',
    nombre: req.user.nombre || req.user.email || 'Usuario',
    apellido: req.user.apellido || '',
    rol: nombreRol(rolId),
    rol_id: rolId,
    permisos: req.user.permisos || PERMISOS_POR_ROL[rolId] || {},
    sucursales: Array.isArray(req.user.sucursales) ? req.user.sucursales : [],
    activo: req.user.activo !== false,
    companyId,
    orgId: companyId,
    fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
    fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
};

// Función para manejar todas las rutas de usuarios
const usuariosRoutes = async (req, res, path) => {
  try {
    console.log('🎭 [USUARIOS] Procesando ruta:', { method: req.method, path });
    
    const pathParts = path.split('/').filter(p => p);
    const companyId = getCompanyId(req);
    const usuariosRef = companyId ? db.collection('companies').doc(companyId).collection('usuarios') : null;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'CompanyId requerido para gestionar usuarios'
      });
    }

    // GET /api/usuarios/roles - Obtener roles disponibles
    if (req.method === 'GET' && pathParts[1] === 'roles') {
      res.json({
        success: true,
        data: ROLES_SISTEMA.map((rol) => ({
          ...rol,
          permisos: PERMISOS_POR_ROL[rol.id] || {}
        })),
        total: ROLES_SISTEMA.length,
        message: 'Roles obtenidos correctamente'
      });
      return true;
    }

    // GET /api/usuarios/buscar?termino=xxx - Buscar usuarios dentro de la empresa
    if (req.method === 'GET' && pathParts[1] === 'buscar') {
      try {
        const termino = String(req.query.termino || '').toLowerCase();
        console.log(`🔍 [USUARIOS] Buscando usuarios en empresa ${companyId}: "${termino}"`);
        
        const snapshot = await usuariosRef.get();
        const usuarios = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const nombre = (data.nombre || '').toLowerCase();
          const apellido = (data.apellido || '').toLowerCase();
          const email = (data.email || '').toLowerCase();
          
          if (!termino || nombre.includes(termino) || apellido.includes(termino) || email.includes(termino)) {
            usuarios.push({
              id: doc.id,
              ...data
            });
          }
        });
        
        res.json({
          success: true,
          data: usuarios,
          total: usuarios.length,
          termino,
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
    
    // GET /api/usuarios - Obtener todos los usuarios
    if (req.method === 'GET' && pathParts.length === 1) {
      try {
        console.log('📋 [USUARIOS] Obteniendo usuarios de empresa:', companyId);
        await ensureRequesterUserDoc(req, companyId, usuariosRef);
        
        const snapshot = await usuariosRef.get();
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
    
    // GET /api/usuarios/:id - Obtener usuario específico dentro de la empresa
    if (req.method === 'GET' && pathParts.length === 2) {
      try {
        const userId = pathParts[1];
        console.log(`🔍 [USUARIOS] Obteniendo usuario ID: ${userId}`);
        
        const doc = await usuariosRef.doc(userId).get();
        
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
    
    // GET /api/usuarios/:id/sucursales - Sucursales de un usuario
    if (req.method === 'GET' && pathParts.length === 3 && pathParts[2] === 'sucursales') {
      try {
        const uid = pathParts[1];
        console.log(`🏢 [USUARIOS] Obteniendo sucursales del usuario: ${uid}`);
        
        const userDoc = await usuariosRef.doc(uid).get();
        
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
            let sucDoc = await db.collection('companies').doc(companyId).collection('sucursales').doc(sucursalId).get();
            if (!sucDoc.exists) {
              sucDoc = await db.collection('sucursales').doc(sucursalId).get();
            }
            
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
    // PUT /api/usuarios/:id - Actualizar usuario completo dentro de la empresa
    if (req.method === 'PUT' && pathParts.length === 2) {
      try {
        if (!esAdminEmpresa(req)) {
          return res.status(403).json({ success: false, message: 'Se requieren permisos para editar usuarios' });
        }

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
        const usuarioDoc = await usuariosRef.doc(uid).get();
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
        const rolId = normalizarRolId(datosFirestore.rol_id || datosFirestore.rol);
        datosFirestore.rol_id = rolId;
        datosFirestore.rol = nombreRol(rolId);
        datosFirestore.permisos = datosFirestore.permisos || PERMISOS_POR_ROL[rolId] || {};
        datosFirestore.companyId = companyId;
        datosFirestore.orgId = companyId;

        await usuariosRef.doc(uid).update(datosFirestore);
        await db.collection('usuariosOrg').doc(uid).set({
          uid,
          orgId: companyId,
          roles: rolId === 'admin' ? ['OWNER', 'admin'] : [rolId],
          sucursales: datosFirestore.sucursales || [],
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
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
        const usuarioActualizado = await usuariosRef.doc(uid).get();
        const datosCompletos = usuarioActualizado.data();
        
        // Actualizar custom claims
        const customClaims = {
		  rol: datosCompletos.rol || 'Empleado',
          role: datosCompletos.rol_id || rolId,
          rolId,
          companyId,
          permisos: datosCompletos.permisos || {},
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
    // POST /api/usuarios - Crear usuario
    if (req.method === 'POST' && pathParts.length === 1) {
      try {
        if (!esAdminEmpresa(req)) {
          return res.status(403).json({ success: false, message: 'Se requieren permisos para crear usuarios' });
        }

        const nuevoUsuario = req.body;
        const rolId = normalizarRolId(nuevoUsuario.rol_id || nuevoUsuario.rol);
        const permisosRol = PERMISOS_POR_ROL[rolId] || PERMISOS_POR_ROL.empleado;
        console.log('🆕 [USUARIOS] Creando usuario:', {
          email: nuevoUsuario.email,
          nombre: nuevoUsuario.nombre,
          rol: rolId,
          companyId
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
          displayName: `${nuevoUsuario.nombre} ${nuevoUsuario.apellido || ''}`.trim(),
          emailVerified: false
        });
        
        // Guardar en Firestore
        const usuarioFirestore = {
          ...nuevoUsuario,
          uid: userRecord.uid,
          companyId,
          orgId: companyId,
          rol: nombreRol(rolId),
          rol_id: rolId,
          permisos: nuevoUsuario.permisos || permisosRol,
          fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
          activo: nuevoUsuario.activo !== false
        };
        
        delete usuarioFirestore.password; // No guardar password en Firestore
        
        await usuariosRef.doc(userRecord.uid).set(usuarioFirestore);
        await db.collection('usuariosOrg').doc(userRecord.uid).set({
          uid: userRecord.uid,
          orgId: companyId,
          roles: rolId === 'admin' ? ['admin'] : [rolId],
          sucursales: usuarioFirestore.sucursales || [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        // Establecer custom claims
        await admin.auth().setCustomUserClaims(userRecord.uid, {
          companyId,
          rol: usuarioFirestore.rol,
          role: rolId,
          rolId,
          permisos: usuarioFirestore.permisos || {},
          activo: usuarioFirestore.activo
        });
        
        console.log('✅ [USUARIOS] Usuario creado correctamente');
        
        res.status(201).json({
          success: true,
          data: {
            id: userRecord.uid,
            ...usuarioFirestore
          },
          message:
            'Usuario creado. Debe iniciar sesión y verificar su correo electrónico (bandeja o spam): desde la app usará «Reenviar correo» hasta completar la verificación.'
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
    
    // PATCH /api/usuarios/:id/password - Cambiar contraseña
    if (req.method === 'PATCH' && pathParts.length === 3 && pathParts[2] === 'password') {
      try {
        if (!esAdminEmpresa(req)) {
          return res.status(403).json({ success: false, message: 'Se requieren permisos para cambiar contraseñas' });
        }

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
        if (!esAdminEmpresa(req)) {
          return res.status(403).json({ success: false, message: 'Se requieren permisos para cambiar estado de usuarios' });
        }

        const uid = pathParts[1];
        const { activo } = req.body;
        
        console.log(`🔄 [USUARIOS] Cambiando estado del usuario ${uid} a:`, activo);
        
        // Actualizar en Firestore
        await usuariosRef.doc(uid).update({
          activo: activo,
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Actualizar en Firebase Auth
        await admin.auth().updateUser(uid, {
          disabled: !activo
        });
        
        // Actualizar custom claims
        const userDoc = await usuariosRef.doc(uid).get();
        const userData = userDoc.data();
        
        const customClaims = {
          companyId,
		  rol: userData.rol || 'Empleado',
          role: userData.rol_id || normalizarRolId(userData.rol),
          rolId: userData.rol_id || normalizarRolId(userData.rol),
          permisos: userData.permisos || {},
		  activo: userData.activo !== false
		};

        await admin.auth().setCustomUserClaims(uid, customClaims);
        
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