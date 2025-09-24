// Script para ejecutar una vez en Firebase Functions o localmente
// Limpia los tipos de datos incorrectos en la colección de clientes

const admin = require('firebase-admin');
const db = admin.firestore();

async function limpiarDatosClientes() {
  console.log('🧹 Iniciando limpieza de datos de clientes...');
  
  try {
    const clientesSnapshot = await db.collection('clientes').get();
    let actualizados = 0;
    let errores = 0;
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const doc of clientesSnapshot.docs) {
      const data = doc.data();
      let necesitaActualizacion = false;
      const actualizaciones = {};
      
      // Verificar y convertir campos que deben ser strings
      if (typeof data.telefono === 'number') {
        actualizaciones.telefono = String(data.telefono);
        necesitaActualizacion = true;
      }
      
      if (typeof data.dni_cuit === 'number') {
        actualizaciones.dni_cuit = String(data.dni_cuit);
        necesitaActualizacion = true;
      }
      
      if (typeof data.nombre === 'number') {
        actualizaciones.nombre = String(data.nombre);
        necesitaActualizacion = true;
      }
      
      if (typeof data.apellido === 'number') {
        actualizaciones.apellido = String(data.apellido);
        necesitaActualizacion = true;
      }
      
      if (typeof data.email === 'number') {
        actualizaciones.email = String(data.email);
        necesitaActualizacion = true;
      }
      
      // Si hay actualizaciones pendientes
      if (necesitaActualizacion) {
        try {
          batch.update(doc.ref, actualizaciones);
          actualizados++;
          batchCount++;
          
          console.log(`✅ Cliente ${doc.id} programado para actualización:`, actualizaciones);
          
          // Firestore tiene un límite de 500 operaciones por batch
          if (batchCount >= 400) {
            await batch.commit();
            console.log(`💾 Batch de ${batchCount} actualizaciones guardado`);
            batchCount = 0;
            // Crear nuevo batch
            batch = db.batch();
          }
        } catch (error) {
          console.error(`❌ Error actualizando cliente ${doc.id}:`, error);
          errores++;
        }
      }
    }
    
    // Guardar el último batch si tiene operaciones pendientes
    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Último batch de ${batchCount} actualizaciones guardado`);
    }
    
    console.log(`
✅ Limpieza completada:
- Total clientes revisados: ${clientesSnapshot.size}
- Clientes actualizados: ${actualizados}
- Errores: ${errores}
    `);
    
    return {
      total: clientesSnapshot.size,
      actualizados,
      errores
    };
    
  } catch (error) {
    console.error('❌ Error en limpieza de datos:', error);
    throw error;
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  // Inicializar admin si no está inicializado
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  
  limpiarDatosClientes()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { limpiarDatosClientes };