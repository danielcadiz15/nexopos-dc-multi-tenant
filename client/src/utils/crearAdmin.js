// functions/src/utils/crearAdmin.js
const admin = require('firebase-admin');
const functions = require('firebase-functions');

// Función HTTP temporal para crear admin
exports.inicializarAdmin = functions.https.onRequest(async (req, res) => {
  try {
    // Por seguridad, verificar algún token secreto
    const secretToken = req.query.token;
    if (secretToken !== 'serviceAccountKey.json') {
      return res.status(403).json({ error: 'Token inválido' });
    }

    // Datos del administrador
    const email = 'danielcadiz15@gmail.com';
    const password = 'admin123!'; // CAMBIA ESTO POR UNA CONTRASEÑA SEGURA
    
    let userRecord;
    
    try {
      // Intentar crear el usuario
      userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: 'Daniel Cadiz',
        emailVerified: true
      });
      
      console.log('✅ Usuario creado:', userRecord.uid);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        // Si ya existe, obtenerlo
        userRecord = await admin.auth().getUserByEmail(email);
        console.log('⚠️ Usuario ya existe:', userRecord.uid);
      } else {
        throw error;
      }
    }
    
    // Asignar custom claims de administrador
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      rol: 'Administrador',
      sucursales: [],
      activo: true,
      permisos: {
        productos: { ver: true, crear: true, editar: true, eliminar: true },
        compras: { ver: true, crear: true, editar: true, eliminar: true },
        ventas: { ver: true, crear: true, editar: true, eliminar: true },
        stock: { ver: true, crear: true, editar: true, eliminar: true },
        reportes: { ver: true, crear: true, editar: true, eliminar: true },
        promociones: { ver: true, crear: true, editar: true, eliminar: true },
        usuarios: { ver: true, crear: true, editar: true, eliminar: true },
        sucursales: { ver: true, crear: true, editar: true, eliminar: true }
      }
    });
    
    // Guardar en Firestore
    await admin.firestore().collection('usuarios').doc(userRecord.uid).set({
      email: email,
      nombre: 'Daniel',
      apellido: 'Cadiz',
      rol: 'Administrador',
      sucursales: [],
      activo: true,
      fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
      es_propietario: true
    }, { merge: true }); // merge: true para no sobrescribir si ya existe
    
    console.log('✅ Administrador configurado correctamente');
    
    res.json({
      success: true,
      message: 'Administrador creado/actualizado correctamente',
      uid: userRecord.uid,
      email: email,
      instrucciones: 'Ahora puedes iniciar sesión con estas credenciales'
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code 
    });
  }
});