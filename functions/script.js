// scripts/crearAdmin.js - Script local
const admin = require('firebase-admin');

// Necesitas descargar una clave de servicio desde Firebase Console
// Proyecto -> Configuración -> Cuentas de servicio -> Generar nueva clave privada
const serviceAccount = require('./serviceAccountKey.json');

// Inicializar admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://la-fabrica-1.firebaseio.com" // Reemplaza con tu URL
});

async function crearAdministrador() {
  try {
    const email = 'danielcadiz15@gmail.com';
    const password = 'admin123'; // CAMBIA ESTO
    
    let userRecord;
    
    try {
      // Crear usuario
      userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: 'Daniel Cadiz',
        emailVerified: true
      });
      console.log('✅ Usuario creado:', userRecord.uid);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        userRecord = await admin.auth().getUserByEmail(email);
        console.log('⚠️ Usuario ya existe:', userRecord.uid);
      } else {
        throw error;
      }
    }
    
    // Asignar custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      rol: 'Administrador',
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
      activo: true,
      fecha_creacion: admin.firestore.Timestamp.now(),
      es_propietario: true
    }, { merge: true });
    
    console.log('✅ Administrador configurado correctamente');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🆔 UID:', userRecord.uid);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Ejecutar
crearAdministrador();