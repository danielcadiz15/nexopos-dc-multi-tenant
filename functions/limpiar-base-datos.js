// limpiar-base-datos.js - Script para eliminar todos los clientes y datos relacionados
// ⚠️ SOLO PARA ENTORNO DE PRUEBA - ELIMINA DATOS PERMANENTEMENTE

const admin = require('firebase-admin');

// Configurar Firebase Admin (asegúrate de tener las credenciales)
// Si ya tienes Firebase inicializado en otro lugar, comenta estas líneas
/*
const serviceAccount = require('./path/to/your/service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
*/

const db = admin.firestore();

/**
 * Elimina todos los documentos de una colección en lotes
 * @param {string} collectionName - Nombre de la colección
 * @param {number} batchSize - Tamaño del lote (máximo 500)
 */
async function eliminarColeccion(collectionName, batchSize = 100) {
  const collectionRef = db.collection(collectionName);
  
  try {
    console.log(`🔄 Iniciando eliminación de colección: ${collectionName}`);
    let totalEliminados = 0;
    
    while (true) {
      // Obtener un lote de documentos
      const snapshot = await collectionRef.limit(batchSize).get();
      
      if (snapshot.size === 0) {
        console.log(`✅ Colección ${collectionName} completamente eliminada. Total: ${totalEliminados} documentos`);
        break;
      }
      
      // Crear batch para eliminar
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Ejecutar batch
      await batch.commit();
      totalEliminados += snapshot.size;
      
      console.log(`   Eliminados ${snapshot.size} documentos de ${collectionName} (Total: ${totalEliminados})`);
      
      // Pausa pequeña para no sobrecargar
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error(`❌ Error eliminando colección ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Elimina todas las subcolecciones de una colección
 * @param {string} collectionName - Nombre de la colección padre
 * @param {string} subCollectionName - Nombre de la subcolección
 */
async function eliminarSubcolecciones(collectionName, subCollectionName) {
  try {
    console.log(`🔄 Eliminando subcolecciones ${subCollectionName} de ${collectionName}`);
    
    const parentDocs = await db.collection(collectionName).get();
    let totalEliminadas = 0;
    
    for (const parentDoc of parentDocs.docs) {
      const subCollectionRef = parentDoc.ref.collection(subCollectionName);
      const subDocs = await subCollectionRef.get();
      
      if (subDocs.size > 0) {
        const batch = db.batch();
        subDocs.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        totalEliminadas += subDocs.size;
      }
    }
    
    console.log(`✅ Eliminadas ${totalEliminadas} subcolecciones ${subCollectionName}`);
  } catch (error) {
    console.error(`❌ Error eliminando subcolecciones:`, error);
  }
}

/**
 * Script principal de limpieza
 */
async function limpiarBaseDatos() {
  console.log('🚀 INICIANDO LIMPIEZA COMPLETA DE BASE DE DATOS');
  console.log('⚠️  ADVERTENCIA: Esta operación eliminará TODOS los datos de clientes y relacionados');
  console.log('⚠️  Solo usar en entorno de PRUEBA');
  console.log('');
  
  const inicioTiempo = Date.now();
  
  try {
    // 1. Eliminar pagos de ventas (subcolecciones)
    console.log('📝 Paso 1: Eliminando pagos de ventas...');
    await eliminarSubcolecciones('ventas', 'pagos');
    
    // 2. Eliminar ventas
    console.log('📝 Paso 2: Eliminando ventas...');
    await eliminarColeccion('ventas');
    
    // 3. Eliminar movimientos de stock relacionados con ventas de clientes
    console.log('📝 Paso 3: Eliminando movimientos de stock...');
    await eliminarColeccion('movimientos_stock');
    
    // 4. Eliminar clientes
    console.log('📝 Paso 4: Eliminando clientes...');
    await eliminarColeccion('clientes');
    
    // 5. Limpiar contadores relacionados (opcional)
    console.log('📝 Paso 5: Limpiando contadores...');
    try {
      await db.collection('contadores').doc('ventas').delete();
      console.log('   ✅ Contador de ventas eliminado');
    } catch (error) {
      console.log('   ⚠️  Contador de ventas no existía');
    }
    
    const tiempoTotal = ((Date.now() - inicioTiempo) / 1000).toFixed(2);
    
    console.log('');
    console.log('🎉 LIMPIEZA COMPLETADA EXITOSAMENTE');
    console.log(`⏱️  Tiempo total: ${tiempoTotal} segundos`);
    console.log('');
    console.log('✅ Datos eliminados:');
    console.log('   • Todos los clientes');
    console.log('   • Todas las ventas');
    console.log('   • Todos los pagos');
    console.log('   • Movimientos de stock');
    console.log('   • Contadores relacionados');
    console.log('');
    console.log('🚀 Base de datos lista para nueva importación');
    
  } catch (error) {
    console.error('❌ ERROR DURANTE LA LIMPIEZA:', error);
    console.log('');
    console.log('🔧 La limpieza puede haberse completado parcialmente.');
    console.log('   Puedes ejecutar el script nuevamente para continuar.');
    process.exit(1);
  }
}

/**
 * Función para confirmar la eliminación
 */
async function confirmarEliminacion() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('¿Estás seguro de eliminar TODOS los clientes y datos relacionados? (escribe "ELIMINAR TODO" para confirmar): ', (respuesta) => {
      rl.close();
      resolve(respuesta === 'ELIMINAR TODO');
    });
  });
}

/**
 * Ejecutar script
 */
async function ejecutar() {
  try {
    console.log('⚠️  SCRIPT DE LIMPIEZA DE BASE DE DATOS ⚠️');
    console.log('');
    console.log('Este script eliminará PERMANENTEMENTE:');
    console.log('• Todos los clientes');
    console.log('• Todas las ventas');
    console.log('• Todos los pagos');
    console.log('• Movimientos de stock');
    console.log('');
    
    // Confirmar eliminación
    const confirmado = await confirmarEliminacion();
    
    if (!confirmado) {
      console.log('❌ Operación cancelada por el usuario');
      process.exit(0);
    }
    
    // Esperar 3 segundos para que el usuario pueda cancelar
    console.log('⏳ Iniciando en 3 segundos... (Ctrl+C para cancelar)');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('⏳ 2...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('⏳ 1...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Ejecutar limpieza
    await limpiarBaseDatos();
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Solo ejecutar si es llamado directamente
if (require.main === module) {
  ejecutar();
}

module.exports = {
  limpiarBaseDatos,
  eliminarColeccion,
  eliminarSubcolecciones
};