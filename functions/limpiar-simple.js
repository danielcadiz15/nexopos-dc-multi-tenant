// limpiar-base-datos-simple.js - Script simplificado con variables de entorno
// ⚠️ SOLO PARA ENTORNO DE PRUEBA - ELIMINA DATOS PERMANENTEMENTE

const admin = require('firebase-admin');

// Inicializar Firebase Admin con variables de entorno del proyecto
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'la-fabrica-1'  // Tu project ID
  });
}

const db = admin.firestore();

/**
 * Script principal de limpieza
 */
async function limpiarBaseDatos() {
  console.log('🚀 INICIANDO LIMPIEZA RÁPIDA...');
  console.log('');
  
  try {
    let totalEliminados = 0;
    
    // 1. Eliminar clientes
    console.log('🧹 Eliminando clientes...');
    const clientesSnapshot = await db.collection('clientes').get();
    
    if (!clientesSnapshot.empty) {
      const batch1 = db.batch();
      clientesSnapshot.docs.forEach(doc => {
        batch1.delete(doc.ref);
      });
      await batch1.commit();
      console.log(`✅ ${clientesSnapshot.size} clientes eliminados`);
      totalEliminados += clientesSnapshot.size;
    } else {
      console.log('⚠️ No hay clientes para eliminar');
    }
    
    // 2. Eliminar ventas
    console.log('🧹 Eliminando ventas...');
    const ventasSnapshot = await db.collection('ventas').get();
    
    if (!ventasSnapshot.empty) {
      const batch2 = db.batch();
      ventasSnapshot.docs.forEach(doc => {
        batch2.delete(doc.ref);
      });
      await batch2.commit();
      console.log(`✅ ${ventasSnapshot.size} ventas eliminadas`);
      totalEliminados += ventasSnapshot.size;
    } else {
      console.log('⚠️ No hay ventas para eliminar');
    }
    
    // 3. Eliminar movimientos (si existen)
    console.log('🧹 Eliminando movimientos...');
    const movimientosSnapshot = await db.collection('movimientos_stock').get();
    
    if (!movimientosSnapshot.empty) {
      const batch3 = db.batch();
      movimientosSnapshot.docs.forEach(doc => {
        batch3.delete(doc.ref);
      });
      await batch3.commit();
      console.log(`✅ ${movimientosSnapshot.size} movimientos eliminados`);
      totalEliminados += movimientosSnapshot.size;
    } else {
      console.log('⚠️ No hay movimientos para eliminar');
    }
    
    console.log('');
    console.log('🎉 LIMPIEZA COMPLETADA!');
    console.log(`📊 Total eliminados: ${totalEliminados} documentos`);
    console.log('🚀 Base de datos lista para importación');
    console.log('');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    if (error.code === 7) {
      console.log('');
      console.log('💡 SOLUCIÓN:');
      console.log('1. Asegúrate de estar autenticado con Firebase CLI');
      console.log('2. Ejecuta: firebase login');
      console.log('3. Luego ejecuta nuevamente este script');
    }
  }
}

// Ejecutar sin confirmaciones (ya perdimos mucho tiempo 😅)
console.log('⚠️ ELIMINANDO TODOS LOS DATOS EN 3 SEGUNDOS...');
console.log('❌ Presiona Ctrl+C para cancelar');

setTimeout(() => {
  limpiarBaseDatos().then(() => {
    process.exit(0);
  });
}, 3000);