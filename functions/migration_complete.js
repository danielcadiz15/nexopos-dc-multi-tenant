// ==================== MIGRACIÓN COMPLETA: SISTEMA UNIFICADO ====================
// Archivo: migration_complete.js
// Ejecutar en Firebase Functions

const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * 🚀 MIGRACIÓN PASO A PASO - SISTEMA UNIFICADO
 * 
 * PASO 1: Migrar materias primas → productos
 * PASO 2: Migrar stock_materias_primas → stock_sucursal  
 * PASO 3: Actualizar recetas_detalles (materia_prima_id → producto_ingrediente_id)
 * PASO 4: Crear endpoints de compatibilidad
 */

async function ejecutarMigracionCompleta() {
  console.log('🚀 ==================== INICIANDO MIGRACIÓN COMPLETA ====================');
  
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

// ==================== NUEVA LÓGICA DE PRODUCCIÓN UNIFICADA ====================

/**
 * 🏭 NUEVA FUNCIÓN: Procesar producción con descuento automático de materias primas
 * 
 * Esta función reemplaza la lógica antigua y usa el sistema unificado
 */
async function procesarProduccionUnificada(recetaId, cantidadAProducir, sucursalId, usuarioId = 'sistema') {
  console.log(`🏭 [PRODUCCIÓN UNIFICADA] Procesando: Receta ${recetaId}, Cantidad: ${cantidadAProducir}, Sucursal: ${sucursalId}`);
  
  try {
    // 1. Obtener detalles de la receta (YA MIGRADOS)
    const recetaDetallesSnapshot = await db.collection('recetas_detalles')
      .where('receta_id', '==', recetaId)
      .orderBy('orden', 'asc')
      .get();
    
    if (recetaDetallesSnapshot.empty) {
      throw new Error('Receta no encontrada o sin ingredientes');
    }
    
    // 2. Calcular ingredientes necesarios y verificar stock
    const ingredientesRequeridos = [];
    const stockInsuficiente = [];
    
    for (const detalleDoc of recetaDetallesSnapshot.docs) {
      const detalle = detalleDoc.data();
      
      // Usar el nuevo campo producto_ingrediente_id (sistema unificado)
      const productoIngredienteId = detalle.producto_ingrediente_id;
      
      if (!productoIngredienteId) {
        throw new Error(`Detalle de receta ${detalleDoc.id} no migrado correctamente. Falta producto_ingrediente_id.`);
      }
      
      const cantidadPorUnidad = parseFloat(detalle.cantidad || 0);
      const cantidadTotal = cantidadPorUnidad * cantidadAProducir;
      
      // Verificar stock disponible en la sucursal
      const stockQuery = await db.collection('stock_sucursal')
        .where('producto_id', '==', productoIngredienteId)
        .where('sucursal_id', '==', sucursalId)
        .limit(1)
        .get();
      
      let stockDisponible = 0;
      let stockDoc = null;
      
      if (!stockQuery.empty) {
        stockDoc = stockQuery.docs[0];
        stockDisponible = parseInt(stockDoc.data().cantidad || 0);
      }
      
      // Obtener nombre del producto para logs
      const productoDoc = await db.collection('productos').doc(productoIngredienteId).get();
      const nombreProducto = productoDoc.exists ? productoDoc.data().nombre : 'Producto desconocido';
      
      if (stockDisponible < cantidadTotal) {
        stockInsuficiente.push({
          nombre: nombreProducto,
          disponible: stockDisponible,
          requerido: cantidadTotal,
          faltante: cantidadTotal - stockDisponible
        });
      } else {
        ingredientesRequeridos.push({
          producto_id: productoIngredienteId,
          nombre: nombreProducto,
          cantidad_requerida: cantidadTotal,
          stock_doc: stockDoc,
          stock_disponible: stockDisponible
        });
      }
    }
    
    // 3. Verificar que hay stock suficiente
    if (stockInsuficiente.length > 0) {
      const detallesError = stockInsuficiente.map(item => 
        `${item.nombre}: Disponible ${item.disponible}, Requerido ${item.requerido} (Falta ${item.faltante})`
      ).join('; ');
      
      throw new Error(`Stock insuficiente para producción: ${detallesError}`);
    }
    
    // 4. Ejecutar producción con transacción (descontar materias primas automáticamente)
    const resultadoProduccion = await db.runTransaction(async (transaction) => {
      console.log('🔄 Ejecutando transacción de producción...');
      
      // Descontar ingredientes (materias primas)
      for (const ingrediente of ingredientesRequeridos) {
        const nuevoStock = ingrediente.stock_disponible - ingrediente.cantidad_requerida;
        
        console.log(`  📦 ${ingrediente.nombre}: ${ingrediente.stock_disponible} - ${ingrediente.cantidad_requerida} = ${nuevoStock}`);
        
        // Actualizar stock
        transaction.update(ingrediente.stock_doc.ref, {
          cantidad: nuevoStock,
          ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Registrar movimiento de stock (SALIDA - consumo de materia prima)
        const movimientoSalidaRef = db.collection('movimientos_stock').doc();
        transaction.set(movimientoSalidaRef, {
          sucursal_id: sucursalId,
          producto_id: ingrediente.producto_id,
          tipo: 'salida',
          cantidad: ingrediente.cantidad_requerida,
          stock_anterior: ingrediente.stock_disponible,
          stock_nuevo: nuevoStock,
          motivo: 'Producción - Consumo de materia prima',
          referencia_tipo: 'produccion',
          referencia_id: recetaId,
          detalle: `Producción de ${cantidadAProducir} unidades`,
          fecha: admin.firestore.FieldValue.serverTimestamp(),
          usuario_id: usuarioId
        });
      }
      
      // Registrar la orden de producción
      const ordenProduccionRef = db.collection('ordenes_produccion').doc();
      transaction.set(ordenProduccionRef, {
        receta_id: recetaId,
        sucursal_id: sucursalId,
        cantidad_producida: cantidadAProducir,
        estado: 'completada',
        ingredientes_consumidos: ingredientesRequeridos.map(ing => ({
          producto_id: ing.producto_id,
          nombre: ing.nombre,
          cantidad: ing.cantidad_requerida
        })),
        fecha_produccion: admin.firestore.FieldValue.serverTimestamp(),
        usuario_id: usuarioId,
        sistema_unificado: true
      });
      
      return {
        orden_produccion_id: ordenProduccionRef.id,
        ingredientes_consumidos: ingredientesRequeridos.length,
        cantidad_producida: cantidadAProducir
      };
    });
    
    console.log('✅ [PRODUCCIÓN UNIFICADA] Producción completada exitosamente');
    console.log(`   📊 Ingredientes procesados: ${resultadoProduccion.ingredientes_consumidos}`);
    console.log(`   🏭 Cantidad producida: ${resultadoProduccion.cantidad_producida}`);
    
    return {
      success: true,
      orden_produccion_id: resultadoProduccion.orden_produccion_id,
      cantidad_producida: cantidadAProducir,
      ingredientes_consumidos: ingredientesRequeridos.length,
      message: 'Producción completada. Materias primas descontadas automáticamente.'
    };
    
  } catch (error) {
    console.error('❌ [PRODUCCIÓN UNIFICADA] Error en producción:', error);
    throw error;
  }
}

// ==================== ENDPOINTS DE COMPATIBILIDAD ====================

/**
 * 🔧 Endpoint de compatibilidad: /materias-primas (mantener frontend funcionando)
 * 
 * Devuelve productos que son materias primas, con formato compatible
 */
async function obtenerMateriasPrimasCompatibilidad() {
  const productosSnapshot = await db.collection('productos')
    .where('tipo', '==', 'materia_prima')
    .where('activo', '==', true)
    .orderBy('nombre', 'asc')
    .get();
  
  const materiasPrimas = [];
  
  productosSnapshot.forEach(doc => {
    const producto = doc.data();
    
    // Formato compatible con frontend existente
    materiasPrimas.push({
      id: doc.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      unidad_medida: producto.unidad_medida,
      precio_unitario: producto.precio_costo, // Mapear a precio_unitario para compatibilidad
      stock_actual: producto.stock_actual,
      stock_minimo: producto.stock_minimo,
      proveedor_id: producto.proveedor_id,
      activo: producto.activo,
      
      // Campos adicionales del sistema unificado
      es_producto_unificado: true,
      tipo: producto.tipo
    });
  });
  
  return materiasPrimas;
}

// ==================== FUNCIONES DE VERIFICACIÓN ====================

/**
 * ✅ Verificar estado de la migración
 */
async function verificarEstadoMigracion() {
  console.log('🔍 Verificando estado de la migración...');
  
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
  
  const estado = {
    materias_primas_originales: materiasOriginales,
    productos_migrados: productosMigrados,
    recetas_actualizadas: recetasActualizadas,
    migracion_completa: materiasOriginales === productosMigrados,
    sistema_unificado_activo: productosMigrados > 0 && recetasActualizadas > 0
  };
  
  console.log('📊 Estado de migración:', estado);
  return estado;
}

// ==================== EXPORTAR FUNCIONES ====================

module.exports = {
  // Función principal
  ejecutarMigracionCompleta,
  
  // Funciones individuales
  migrarMateriasPrimasAProductos,
  migrarStockMateriasPrimas,
  actualizarRecetasConNuevosProductos,
  
  // Sistema unificado
  procesarProduccionUnificada,
  obtenerMateriasPrimasCompatibilidad,
  
  // Verificación
  verificarEstadoMigracion
};