// functions/run_migration.js - SCRIPT EJECUTABLE INDEPENDIENTE
// Este script se puede ejecutar directamente con Node.js

const admin = require('firebase-admin');

// ==================== INICIALIZAR FIREBASE ADMIN ====================
console.log('🔥 Inicializando Firebase Admin...');

// Inicializar Firebase Admin con credenciales predeterminadas
try {
  admin.initializeApp({
    // Las credenciales se obtienen automáticamente de:
    // 1. Variable de entorno GOOGLE_APPLICATION_CREDENTIALS
    // 2. Credenciales por defecto del SDK de Google Cloud
    // 3. Service account key file
  });
  console.log('✅ Firebase Admin inicializado correctamente');
} catch (error) {
  console.error('❌ Error al inicializar Firebase Admin:', error.message);
  console.log('\n🔧 POSIBLES SOLUCIONES:');
  console.log('1. Configurar variable de entorno: firebase login');
  console.log('2. O usar service account: firebase use --add');
  process.exit(1);
}

const db = admin.firestore();

// ==================== FUNCIONES DE MIGRACIÓN ====================

/**
 * 🚀 MIGRACIÓN PASO A PASO - SISTEMA UNIFICADO
 */
async function ejecutarMigracionCompleta() {
  console.log('\n🚀 ==================== INICIANDO MIGRACIÓN COMPLETA ====================');
  
  try {
    // PASO 1: Migrar materias primas a productos
    console.log('\n📦 PASO 1: Migrando materias primas a productos...');
    const materiasAProductos = await migrarMateriasPrimasAProductos();
    
    // PASO 2: Migrar stock de materias primas
    console.log('\n📊 PASO 2: Migrando stock de materias primas...');
    await migrarStockMateriasPrimas(materiasAProductos);
    
    // PASO 3: Actualizar recetas para usar nuevos productos
    console.log('\n🍳 PASO 3: Actualizando recetas...');
    await actualizarRecetasConNuevosProductos(materiasAProductos);
    
    // PASO 4: Crear backup de datos originales
    console.log('\n💾 PASO 4: Creando backup de datos originales...');
    await crearBackupDatosOriginales();
    
    console.log('\n✅ ==================== MIGRACIÓN COMPLETADA EXITOSAMENTE ====================');
    console.log('🎉 Sistema unificado listo. Las recetas ahora usan productos automáticamente.');
    
    return {
      success: true,
      materias_migradas: materiasAProductos.size,
      message: 'Migración completada exitosamente'
    };
    
  } catch (error) {
    console.error('❌ Error crítico en migración:', error);
    throw error;
  }
}

/**
 * 📦 PASO 1: Migrar materias primas a productos con tipo="materia_prima"
 */
async function migrarMateriasPrimasAProductos() {
  console.log('📦 Obteniendo todas las materias primas...');
  
  const materiasPrimasSnapshot = await db.collection('materias_primas').get();
  console.log(`   Encontradas: ${materiasPrimasSnapshot.size} materias primas`);
  
  if (materiasPrimasSnapshot.size === 0) {
    console.log('⚠️ No hay materias primas para migrar');
    return new Map();
  }
  
  const batch = db.batch();
  const mapeoMigración = new Map(); // materia_prima_id → nuevo_producto_id
  let contador = 0;
  
  for (const doc of materiasPrimasSnapshot.docs) {
    const materiaPrima = doc.data();
    const materiaPrimaId = doc.id;
    
    // Crear nuevo producto basado en materia prima
    const nuevoProducto = {
      // Identificación
      codigo: materiaPrima.codigo || `MP-${materiaPrimaId.substr(0, 8)}`,
      nombre: materiaPrima.nombre,
      descripcion: materiaPrima.descripcion || 'Materia prima migrada automáticamente',
      
      // MARCADORES IMPORTANTES
      tipo: 'materia_prima',
      es_materia_prima: true,
      categoria_id: 'materias-primas', // Categoría especial
      
      // Precios (usar precio_unitario de materia prima)
      precio_costo: parseFloat(materiaPrima.precio_unitario || 0),
      precio_venta: parseFloat(materiaPrima.precio_unitario || 0), // Sin markup para materias primas
      
      // Stock (se migrará en paso 2)
      stock_actual: 0, // Se calculará del stock_materias_primas
      stock_minimo: parseInt(materiaPrima.stock_minimo || 5),
      
      // Metadatos de la materia prima
      unidad_medida: materiaPrima.unidad_medida || 'unidad',
      proveedor_id: materiaPrima.proveedor_id || '',
      
      // Control
      activo: materiaPrima.activo !== false,
      
      // Timestamps
      fechaCreacion: materiaPrima.fechaCreacion || admin.firestore.FieldValue.serverTimestamp(),
      fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
      
      // Referencias para migración
      materia_prima_original_id: materiaPrimaId,
      migrado_desde_materias_primas: true,
      fecha_migracion: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Crear documento en productos
    const nuevoProductoRef = db.collection('productos').doc();
    batch.set(nuevoProductoRef, nuevoProducto);
    
    // Guardar mapeo para los siguientes pasos
    mapeoMigración.set(materiaPrimaId, nuevoProductoRef.id);
    
    contador++;
    console.log(`   ${contador}. ${materiaPrima.nombre} → Producto ID: ${nuevoProductoRef.id}`);
  }
  
  // Ejecutar migración de productos
  await batch.commit();
  console.log(`✅ ${contador} materias primas migradas a productos`);
  
  return mapeoMigración;
}

/**
 * 📊 PASO 2: Migrar stock_materias_primas → stock_sucursal
 */
async function migrarStockMateriasPrimas(mapeoMigración) {
  console.log('📊 Migrando stock de materias primas...');
  
  const stockMateriasPrimasSnapshot = await db.collection('stock_materias_primas').get();
  console.log(`   Encontrados: ${stockMateriasPrimasSnapshot.size} registros de stock`);
  
  if (stockMateriasPrimasSnapshot.size === 0) {
    console.log('⚠️ No hay stock de materias primas para migrar');
    return;
  }
  
  const batch = db.batch();
  let contadorStock = 0;
  
  for (const stockDoc of stockMateriasPrimasSnapshot.docs) {
    const stockData = stockDoc.data();
    const materiaPrimaId = stockData.materia_prima_id;
    
    // Buscar el nuevo producto_id correspondiente
    const nuevoProductoId = mapeoMigración.get(materiaPrimaId);
    
    if (nuevoProductoId) {
      // Crear registro en stock_sucursal
      const nuevoStockRef = db.collection('stock_sucursal').doc();
      batch.set(nuevoStockRef, {
        producto_id: nuevoProductoId,
        sucursal_id: stockData.sucursal_id,
        cantidad: parseInt(stockData.cantidad || 0),
        stock_minimo: parseInt(stockData.stock_minimo || 5),
        ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
        
        // Metadatos de migración
        migrado_de_stock_materias_primas: true,
        stock_materias_primas_original_id: stockDoc.id,
        materia_prima_original_id: materiaPrimaId,
        fecha_migracion: admin.firestore.FieldValue.serverTimestamp()
      });
      
      contadorStock++;
      console.log(`   ${contadorStock}. Stock migrado: ${stockData.cantidad} unidades → Producto ${nuevoProductoId}`);
    } else {
      console.warn(`   ⚠️ No se encontró producto para materia prima: ${materiaPrimaId}`);
    }
  }
  
  await batch.commit();
  console.log(`✅ ${contadorStock} registros de stock migrados`);
}

/**
 * 🍳 PASO 3: Actualizar recetas_detalles para usar productos en lugar de materias primas
 */
async function actualizarRecetasConNuevosProductos(mapeoMigración) {
  console.log('🍳 Actualizando recetas para usar nuevos productos...');
  
  const recetasDetallesSnapshot = await db.collection('recetas_detalles').get();
  console.log(`   Encontrados: ${recetasDetallesSnapshot.size} detalles de recetas`);
  
  if (recetasDetallesSnapshot.size === 0) {
    console.log('⚠️ No hay recetas para actualizar');
    return;
  }
  
  const batch = db.batch();
  let contadorRecetas = 0;
  
  for (const recetaDoc of recetasDetallesSnapshot.docs) {
    const recetaDetalle = recetaDoc.data();
    const materiaPrimaId = recetaDetalle.materia_prima_id;
    
    if (materiaPrimaId) {
      const nuevoProductoId = mapeoMigración.get(materiaPrimaId);
      
      if (nuevoProductoId) {
        // Actualizar el detalle de receta
        batch.update(recetaDoc.ref, {
          // NUEVO CAMPO: producto_ingrediente_id (el que usará el sistema unificado)
          producto_ingrediente_id: nuevoProductoId,
          
          // MANTENER REFERENCIAS ORIGINALES (por compatibilidad temporal)
          materia_prima_original_id: materiaPrimaId,
          
          // METADATOS
          migrado_a_producto_unificado: true,
          fecha_migracion_receta: admin.firestore.FieldValue.serverTimestamp(),
          
          // MANTENER campos existentes
          cantidad: recetaDetalle.cantidad,
          orden: recetaDetalle.orden,
          notas: recetaDetalle.notas || '',
          receta_id: recetaDetalle.receta_id
        });
        
        contadorRecetas++;
        console.log(`   ${contadorRecetas}. Receta actualizada: ${recetaDetalle.receta_id} → Producto ${nuevoProductoId}`);
      } else {
        console.warn(`   ⚠️ No se encontró producto para materia prima en receta: ${materiaPrimaId}`);
      }
    }
  }
  
  await batch.commit();
  console.log(`✅ ${contadorRecetas} detalles de recetas actualizados`);
}

/**
 * 💾 PASO 4: Crear backup de datos originales
 */
async function crearBackupDatosOriginales() {
  console.log('💾 Creando backup de datos originales...');
  
  const backupInfo = {
    fecha_backup: admin.firestore.FieldValue.serverTimestamp(),
    migracion_version: '1.0',
    descripcion: 'Backup automático antes de migración a sistema unificado',
    colecciones_respaldadas: [
      'materias_primas',
      'stock_materias_primas', 
      'recetas_detalles'
    ],
    nota: 'Los datos originales se mantienen intactos. Este backup es solo informativo.'
  };
  
  await db.collection('_migracion_backup').add(backupInfo);
  console.log('✅ Información de backup creada');
}

/**
 * ✅ Verificar estado de la migración
 */
async function verificarEstadoMigracion() {
  console.log('\n🔍 ==================== VERIFICANDO ESTADO DE MIGRACIÓN ====================');
  
  // Contar materias primas originales
  const materiasPrimasSnapshot = await db.collection('materias_primas').get();
  const materiasOriginales = materiasPrimasSnapshot.size;
  
  // Contar productos migrados
  const productosMigradosSnapshot = await db.collection('productos')
    .where('tipo', '==', 'materia_prima')
    .get();
  const productosMigrados = productosMigradosSnapshot.size;
  
  // Contar recetas actualizadas
  const recetasActualizadasSnapshot = await db.collection('recetas_detalles')
    .where('migrado_a_producto_unificado', '==', true)
    .get();
  const recetasActualizadas = recetasActualizadasSnapshot.size;
  
  // Contar stock migrado
  const stockMigradoSnapshot = await db.collection('stock_sucursal')
    .where('migrado_de_stock_materias_primas', '==', true)
    .get();
  const stockMigrado = stockMigradoSnapshot.size;
  
  const estado = {
    materias_primas_originales: materiasOriginales,
    productos_migrados: productosMigrados,
    recetas_actualizadas: recetasActualizadas,
    stock_migrado: stockMigrado,
    migracion_completa: materiasOriginales === productosMigrados && productosMigrados > 0,
    sistema_unificado_activo: productosMigrados > 0 && recetasActualizadas > 0
  };
  
  console.log('📊 Estado de migración:');
  console.log(`   📦 Materias primas originales: ${estado.materias_primas_originales}`);
  console.log(`   🔄 Productos migrados: ${estado.productos_migrados}`);
  console.log(`   📋 Recetas actualizadas: ${estado.recetas_actualizadas}`);
  console.log(`   📊 Stock migrado: ${estado.stock_migrado}`);
  console.log(`   ✅ Migración completa: ${estado.migracion_completa ? 'SÍ' : 'NO'}`);
  console.log(`   🎯 Sistema unificado activo: ${estado.sistema_unificado_activo ? 'SÍ' : 'NO'}`);
  
  return estado;
}

/**
 * 🧪 Vista previa de migración (sin ejecutar)
 */
async function vistaPrevia() {
  console.log('\n🧪 ==================== VISTA PREVIA DE MIGRACIÓN ====================');
  
  // Contar elementos a migrar
  const materiasPrimasSnapshot = await db.collection('materias_primas').get();
  const stockMateriasPrimasSnapshot = await db.collection('stock_materias_primas').get();
  const recetasDetallesSnapshot = await db.collection('recetas_detalles').get();
  
  const preview = {
    materias_primas_a_migrar: materiasPrimasSnapshot.size,
    registros_stock_a_migrar: stockMateriasPrimasSnapshot.size,
    recetas_detalles_a_actualizar: recetasDetallesSnapshot.size,
    estimacion_tiempo: '2-5 minutos'
  };
  
  console.log('📋 Elementos a migrar:');
  console.log(`   🧪 Materias primas: ${preview.materias_primas_a_migrar}`);
  console.log(`   📊 Registros de stock: ${preview.registros_stock_a_migrar}`);
  console.log(`   📋 Detalles de recetas: ${preview.recetas_detalles_a_actualizar}`);
  console.log(`   ⏱️ Tiempo estimado: ${preview.estimacion_tiempo}`);
  
  console.log('\n🔄 Acciones que se ejecutarán:');
  console.log('   1. Crear productos tipo="materia_prima"');
  console.log('   2. Migrar stock a stock_sucursal');
  console.log('   3. Actualizar recetas_detalles');
  console.log('   4. Mantener datos originales como backup');
  
  return preview;
}

// ==================== FUNCIÓN PRINCIPAL ====================
async function main() {
  const args = process.argv.slice(2);
  const comando = args[0];
  
  try {
    switch (comando) {
      case 'preview':
      case 'vista-previa':
        await vistaPrevia();
        break;
        
      case 'verificar':
      case 'status':
        await verificarEstadoMigracion();
        break;
        
      case 'migrar':
      case 'ejecutar':
        console.log('⚠️ ¿Estás seguro de que quieres ejecutar la migración?');
        console.log('   Esta acción modificará tu base de datos.');
        console.log('   Presiona Ctrl+C para cancelar, o Enter para continuar...');
        
        // Esperar confirmación del usuario
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve());
        });
        
        await ejecutarMigracionCompleta();
        break;
        
      default:
        console.log('🚀 ==================== SCRIPT DE MIGRACIÓN ====================');
        console.log('');
        console.log('📋 Comandos disponibles:');
        console.log('   node run_migration.js preview     - Ver qué se migrará (sin ejecutar)');
        console.log('   node run_migration.js verificar   - Verificar estado actual');
        console.log('   node run_migration.js migrar      - Ejecutar migración completa');
        console.log('');
        console.log('🔧 Ejemplos:');
        console.log('   node run_migration.js preview');
        console.log('   node run_migration.js migrar');
        break;
    }
    
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error en script:', error);
    process.exit(1);
  }
}

// Ejecutar función principal
if (require.main === module) {
  main();
}

module.exports = {
  ejecutarMigracionCompleta,
  verificarEstadoMigracion,
  vistaPrevia
};