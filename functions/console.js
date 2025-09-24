// Script temporal para crear el primer administrador
// Ejecutar desde Firebase Console o como Cloud Function temporal

const admin = require('firebase-admin');

async function crearAdminInicial() {
  try {
    // Email del propietario
    const email = 'danielcadiz15@gmail.com';
    const password = 'TuContraseñaSegura123!'; // CAMBIAR ESTO
    
    // Crear usuario en Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: 'Daniel Cadiz',
      emailVerified: true
    });
    
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
    });
    
    console.log('✅ Administrador creado:', userRecord.uid);
    return { success: true, uid: userRecord.uid };
    
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      // Si ya existe, actualizar sus permisos
      const user = await admin.auth().getUserByEmail(email);
      
      await admin.auth().setCustomUserClaims(user.uid, {
        rol: 'Administrador',
        sucursales: [],
        activo: true,
        permisos: { /* ... todos los permisos ... */ }
      });
      
      console.log('✅ Permisos actualizados para:', user.uid);
      return { success: true, uid: user.uid, updated: true };
    }
    
    throw error;
  }
}

// Si ejecutas como función temporal:
exports.inicializarAdmin = functions.https.onRequest(async (req, res) => {
  try {
    const result = await crearAdminInicial();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});