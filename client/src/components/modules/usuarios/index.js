// functions/src/usuarios/index.js
const admin = require('firebase-admin');
const functions = require('firebase-functions');

const db = admin.firestore();
const auth = admin.auth();

/**
 * Crear nuevo usuario
 * Solo administradores pueden crear usuarios
 */
exports.crearUsuario = functions.https.onCall(async (data, context) => {
  // Verificar que sea admin
  if (!context.auth || context.auth.token.rol !== 'Administrador') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden crear usuarios'
    );
  }

  const { email, password, nombre, apellido, rol, sucursales, activo } = data;

  try {
    // Validaciones
    if (!email || !password) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Email y contraseña son requeridos'
      );
    }

    if (password.length < 6) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'La contraseña debe tener al menos 6 caracteres'
      );
    }

    console.log(`🆕 Creando usuario: ${email}`);

    // Crear usuario en Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: `${nombre} ${apellido}`.trim() || email,
      disabled: !activo
    });

    // Preparar custom claims
    const customClaims = {
      rol: rol || 'Empleado',
      sucursales: sucursales || [],
      activo: activo !== false
    };

    // Asignar custom claims
    await auth.setCustomUserClaims(userRecord.uid, customClaims);

    // Guardar datos adicionales en Firestore
    await db.collection('usuarios').doc(userRecord.uid).set({
      email: email,
      nombre: nombre || '',
      apellido: apellido || '',
      rol: rol || 'Empleado',
      sucursales: sucursales || [],
      activo: activo !== false,
      fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
      creado_por: context.auth.uid,
      ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Usuario creado: ${userRecord.uid}`);

    return {
      success: true,
      uid: userRecord.uid,
      email: userRecord.email,
      message: 'Usuario creado correctamente'
    };

  } catch (error) {
    console.error('❌ Error al crear usuario:', error);
    
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError(
        'already-exists',
        'El email ya está registrado'
      );
    }
    
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Actualizar usuario
 * Administradores pueden actualizar cualquier usuario
 * Usuarios pueden actualizar su propio perfil (limitado)
 */
exports.actualizarUsuario = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuario no autenticado'
    );
  }

  const { uid, nombre, apellido, email, rol, sucursales, activo, password } = data;
  const esAdmin = context.auth.token.rol === 'Administrador';
  const esPropio = context.auth.uid === uid;

  // Verificar permisos
  if (!esAdmin && !esPropio) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'No tienes permisos para actualizar este usuario'
    );
  }

  try {
    console.log(`🔄 Actualizando usuario: ${uid}`);

    const updateData = {};
    const firestoreUpdate = {
      ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
      actualizado_por: context.auth.uid
    };

    // Campos que puede actualizar cualquiera (su propio perfil)
    if (nombre !== undefined) {
      firestoreUpdate.nombre = nombre;
    }
    if (apellido !== undefined) {
      firestoreUpdate.apellido = apellido;
    }

    // Actualizar displayName si cambió nombre o apellido
    if (nombre !== undefined || apellido !== undefined) {
      const userRecord = await auth.getUser(uid);
      const nuevoNombre = nombre !== undefined ? nombre : userRecord.customClaims?.nombre || '';
      const nuevoApellido = apellido !== undefined ? apellido : userRecord.customClaims?.apellido || '';
      updateData.displayName = `${nuevoNombre} ${nuevoApellido}`.trim();
    }

    // Campos que solo puede actualizar un admin
    if (esAdmin) {
      if (email !== undefined && email !== '') {
        updateData.email = email;
        firestoreUpdate.email = email;
      }
      
      if (password !== undefined && password !== '') {
        updateData.password = password;
      }
      
      if (rol !== undefined) {
        firestoreUpdate.rol = rol;
      }
      
      if (sucursales !== undefined) {
        firestoreUpdate.sucursales = sucursales;
      }
      
      if (activo !== undefined) {
        updateData.disabled = !activo;
        firestoreUpdate.activo = activo;
      }
    }

    // Actualizar en Firebase Auth si hay cambios
    if (Object.keys(updateData).length > 0) {
      await auth.updateUser(uid, updateData);
    }

    // Actualizar custom claims si cambió rol o sucursales
    if (esAdmin && (rol !== undefined || sucursales !== undefined || activo !== undefined)) {
      const userRecord = await auth.getUser(uid);
      const currentClaims = userRecord.customClaims || {};
      
      const newClaims = {
        ...currentClaims,
        ...(rol !== undefined && { rol }),
        ...(sucursales !== undefined && { sucursales }),
        ...(activo !== undefined && { activo })
      };
      
      await auth.setCustomUserClaims(uid, newClaims);
    }

    // Actualizar en Firestore
    await db.collection('usuarios').doc(uid).update(firestoreUpdate);

    console.log(`✅ Usuario actualizado: ${uid}`);

    return {
      success: true,
      message: 'Usuario actualizado correctamente'
    };

  } catch (error) {
    console.error('❌ Error al actualizar usuario:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cambiar contraseña
 * Usuarios pueden cambiar su propia contraseña (requiere contraseña actual)
 * Administradores pueden cambiar cualquier contraseña
 */
exports.cambiarPassword = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuario no autenticado'
    );
  }

  const { uid, passwordActual, passwordNueva, esUsuarioActual } = data;
  const esAdmin = context.auth.token.rol === 'Administrador';
  const esPropio = context.auth.uid === uid;

  // Verificar permisos
  if (!esAdmin && !esPropio) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'No tienes permisos para cambiar esta contraseña'
    );
  }

  try {
    console.log(`🔐 Cambiando contraseña del usuario: ${uid}`);

    // Si es el propio usuario y no es admin, verificar contraseña actual
    // (Por ahora Firebase no permite verificar la contraseña actual directamente)
    // TODO: Implementar verificación de contraseña actual si es necesario

    // Cambiar contraseña
    await auth.updateUser(uid, {
      password: passwordNueva
    });

    // Registrar en Firestore
    await db.collection('usuarios').doc(uid).update({
      ultima_cambio_password: admin.firestore.FieldValue.serverTimestamp(),
      password_cambiada_por: context.auth.uid
    });

    console.log(`✅ Contraseña cambiada: ${uid}`);

    return {
      success: true,
      message: 'Contraseña cambiada correctamente'
    };

  } catch (error) {
    console.error('❌ Error al cambiar contraseña:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Cambiar estado de usuario (activar/desactivar)
 * Solo administradores
 */
exports.cambiarEstadoUsuario = functions.https.onCall(async (data, context) => {
  // Verificar que sea admin
  if (!context.auth || context.auth.token.rol !== 'Administrador') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden cambiar el estado de usuarios'
    );
  }

  const { uid, activo } = data;

  try {
    console.log(`🔄 Cambiando estado del usuario ${uid} a: ${activo}`);

    // Actualizar en Firebase Auth
    await auth.updateUser(uid, {
      disabled: !activo
    });

    // Actualizar custom claims
    const userRecord = await auth.getUser(uid);
    const currentClaims = userRecord.customClaims || {};
    await auth.setCustomUserClaims(uid, {
      ...currentClaims,
      activo: activo
    });

    // Actualizar en Firestore
    await db.collection('usuarios').doc(uid).update({
      activo: activo,
      ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
      estado_cambiado_por: context.auth.uid
    });

    console.log(`✅ Estado cambiado: ${uid}`);

    return {
      success: true,
      message: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente`
    };

  } catch (error) {
    console.error('❌ Error al cambiar estado:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Asignar sucursales a un usuario
 * Solo administradores
 */
exports.asignarSucursales = functions.https.onCall(async (data, context) => {
  // Verificar que sea admin
  if (!context.auth || context.auth.token.rol !== 'Administrador') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Solo administradores pueden asignar sucursales'
    );
  }

  const { uid, sucursales } = data;

  try {
    console.log(`🏢 Asignando sucursales al usuario ${uid}:`, sucursales);

    // Actualizar custom claims
    const userRecord = await auth.getUser(uid);
    const currentClaims = userRecord.customClaims || {};
    await auth.setCustomUserClaims(uid, {
      ...currentClaims,
      sucursales: sucursales || []
    });

    // Actualizar en Firestore
    await db.collection('usuarios').doc(uid).update({
      sucursales: sucursales || [],
      ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
      sucursales_asignadas_por: context.auth.uid
    });

    console.log(`✅ Sucursales asignadas: ${uid}`);

    return {
      success: true,
      message: 'Sucursales asignadas correctamente'
    };

  } catch (error) {
    console.error('❌ Error al asignar sucursales:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Endpoints HTTP para el API REST
 */

// GET /api/usuarios
exports.obtenerUsuarios = functions.https.onRequest(async (req, res) => {
  // Habilitar CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  try {
    console.log('📋 Obteniendo lista de usuarios');

    // Obtener usuarios de Firestore
    const snapshot = await db.collection('usuarios')
      .orderBy('fecha_creacion', 'desc')
      .get();

    const usuarios = [];
    snapshot.forEach(doc => {
      usuarios.push({
        id: doc.id,
        ...doc.data(),
        // Convertir timestamps a ISO strings
        fecha_creacion: doc.data().fecha_creacion?.toDate?.()?.toISOString() || null,
        ultima_actualizacion: doc.data().ultima_actualizacion?.toDate?.()?.toISOString() || null,
        ultima_sesion: doc.data().ultima_sesion?.toDate?.()?.toISOString() || null
      });
    });

    console.log(`✅ Usuarios obtenidos: ${usuarios.length}`);

    res.json({
      success: true,
      data: usuarios
    });

  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/usuarios/:id
exports.obtenerUsuario = functions.https.onRequest(async (req, res) => {
  // Habilitar CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  try {
    const uid = req.path.split('/').pop();
    console.log(`📋 Obteniendo usuario: ${uid}`);

    const doc = await db.collection('usuarios').doc(uid).get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const usuario = {
      id: doc.id,
      ...doc.data(),
      fecha_creacion: doc.data().fecha_creacion?.toDate?.()?.toISOString() || null,
      ultima_actualizacion: doc.data().ultima_actualizacion?.toDate?.()?.toISOString() || null,
      ultima_sesion: doc.data().ultima_sesion?.toDate?.()?.toISOString() || null
    };

    console.log(`✅ Usuario obtenido: ${uid}`);

    res.json({
      success: true,
      data: usuario
    });

  } catch (error) {
    console.error('❌ Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Exportar todas las funciones
module.exports = {
  crearUsuario: exports.crearUsuario,
  actualizarUsuario: exports.actualizarUsuario,  
  cambiarPassword: exports.cambiarPassword,
  cambiarEstadoUsuario: exports.cambiarEstadoUsuario,
  asignarSucursales: exports.asignarSucursales,
  obtenerUsuarios: exports.obtenerUsuarios,
  obtenerUsuario: exports.obtenerUsuario
};