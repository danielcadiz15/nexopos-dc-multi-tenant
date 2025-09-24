// ==================== PLAN DE MIGRACIÓN: MATERIAS PRIMAS → PRODUCTOS ====================

// 🎯 OBJETIVO: Unificar materias primas y productos en un solo sistema de stock

// ==================== PASO 1: SCRIPT DE MIGRACIÓN ====================
// Archivo: migration_materias_primas.js (ejecutar en Firebase Functions)

const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * 🔄 MIGRACIÓN: Materias primas → Productos con tipo
 * 
 * Este script migra todas las materias primas a la colección productos
 * con tipo="materia_prima" y unifica el sistema de stock
 */
async function migrarMateriasPrimasAProductos() {
  console.log('🚀 Iniciando migración de materias primas...');
  
  try {
    // 1. Obtener todas las materias primas
    const materiasPrimasSnapshot = await db.collection('materias_primas').get();
    console.log(`📦 Encontradas ${materiasPrimasSnapshot.size} materias primas`);
    
    const batch = db.batch();
    let contadorMigradas = 0;
    
    // 2. Migrar cada materia prima a productos
    for (const doc of materiasPrimasSnapshot.docs) {
      const materiaPrima = doc.data();
      
      // Estructura del nuevo producto (materia prima)
      const nuevoProducto = {
        // Campos específicos de materia prima migrados
        codigo: materiaPrima.codigo || `MP-${doc.id.substr(0, 8)}`,
        nombre: materiaPrima.nombre,
        descripcion: materiaPrima.descripcion || '',
        
        // IMPORTANTE: Marcar como materia prima
        tipo: 'materia_prima',
        es_materia_prima: true,
        
        // Precios
        precio_costo: parseFloat(materiaPrima.precio_unitario || 0),
        precio_venta: parseFloat(materiaPrima.precio_unitario || 0) * 1.2, // 20% markup
        
        // Stock (se migrará por separado)
        stock_actual: 0, // Se calculará del stock_materias_primas
        stock_minimo: parseInt(materiaPrima.stock_minimo || 5),
        
        // Unidad de medida
        unidad_medida: materiaPrima.unidad_medida || 'unidad',
        
        // Proveedor
        proveedor_id: materiaPrima.proveedor_id || '',
        
        // Metadatos
        activo: materiaPrima.activo !== false,
        fechaCreacion: materiaPrima.fechaCreacion || admin.firestore.FieldValue.serverTimestamp(),
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        
        // Referencia a la materia prima original
        materia_prima_original_id: doc.id,
        migrado_de_materias_primas: true
      };
      
      // Crear nuevo producto
      const nuevoProductoRef = db.collection('productos').doc();
      batch.set(nuevoProductoRef, nuevoProducto);
      
      contadorMigradas++;
      console.log(`  ✅ ${contadorMigradas}. ${materiaPrima.nombre} → ${nuevoProductoRef.id}`);
    }
    
    // Ejecutar batch de productos
    await batch.commit();
    console.log(`🎉 ${contadorMigradas} materias primas migradas a productos`);
    
    // 3. Migrar stock de materias primas a stock_sucursal
    await migrarStockMateriasPrimas();
    
    console.log('✅ Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  }
}

/**
 * 📦 Migrar stock de materias primas al sistema unificado
 */
async function migrarStockMateriasPrimas() {
  console.log('📦 Migrando stock de materias primas...');
  
  // Obtener todos los registros de stock de materias primas
  const stockMateriasPrimasSnapshot = await db.collection('stock_materias_primas').get();
  console.log(`📊 Encontrados ${stockMateriasPrimasSnapshot.size} registros de stock`);
  
  const batch = db.batch();
  let contadorStockMigrado = 0;
  
  for (const stockDoc of stockMateriasPrimasSnapshot.docs) {
    const stockData = stockDoc.data();
    
    // Buscar el producto migrado correspondiente
    const productosSnapshot = await db.collection('productos')
      .where('materia_prima_original_id', '==', stockData.materia_prima_id)
      .limit(1)
      .get();
    
    if (!productosSnapshot.empty) {
      const productoId = productosSnapshot.docs[0].id;
      
      // Crear registro en stock_sucursal
      const nuevoStockRef = db.collection('stock_sucursal').doc();
      batch.set(nuevoStockRef, {
        producto_id: productoId,
        sucursal_id: stockData.sucursal_id,
        cantidad: parseInt(stockData.cantidad || 0),
        stock_minimo: parseInt(stockData.stock_minimo || 5),
        ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp(),
        
        // Metadatos de migración
        migrado_de_stock_materias_primas: true,
        stock_materias_primas_original_id: stockDoc.id
      });
      
      contadorStockMigrado++;
      console.log(`  📦 Stock migrado: Producto ${productoId}, Cantidad: ${stockData.cantidad}`);
    }
  }
  
  await batch.commit();
  console.log(`✅ ${contadorStockMigrado} registros de stock migrados`);
}

// ==================== PASO 2: MODIFICACIÓN DE productos.routes.js ====================

/**
 * 🔧 NUEVO ENDPOINT: GET /productos/materias-primas
 * Obtener solo productos que son materias primas
 */
function agregarEndpointMateriasPrimas() {
  // Agregar en productos.routes.js después de línea 50:
  
  // GET /productos/materias-primas - Obtener solo materias primas
  if (path === '/productos/materias-primas' && req.method === 'GET') {
    try {
      const productosSnapshot = await db.collection('productos')
        .where('tipo', '==', 'materia_prima')
        .where('activo', '==', true)
        .orderBy('nombre', 'asc')
        .get();
      
      const materiasPrimas = [];
      
      productosSnapshot.forEach(doc => {
        const data = doc.data();
        materiasPrimas.push({
          id: doc.id,
          ...data,
          precio_unitario: data.precio_costo, // Compatibilidad con frontend existente
          precio_venta: parseFloat(data.precio_venta || 0),
          precio_costo: parseFloat(data.precio_costo || 0)
        });
      });
      
      console.log(`🧪 ${materiasPrimas.length} materias primas encontradas`);
      
      res.json({
        success: true,
        data: materiasPrimas,
        total: materiasPrimas.length,
        message: 'Materias primas obtenidas correctamente'
      });
      return;
      
    } catch (error) {
      console.error('❌ Error al obtener materias primas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener materias primas',
        error: error.message
      });
      return;
    }
  }
}

// ==================== PASO 3: ACTUALIZAR RECETAS ====================

/**
 * 🍳 Script para actualizar referencias en recetas
 * Las recetas deben apuntar a los nuevos productos (materias primas)
 */
async function actualizarRecetas() {
  console.log('🍳 Actualizando referencias en recetas...');
  
  // Obtener todas las recetas que usan materias primas
  const recetasSnapshot = await db.collection('recetas_detalles').get();
  
  const batch = db.batch();
  let contadorActualizadas = 0;
  
  for (const recetaDoc of recetasSnapshot.docs) {
    const receta = recetaDoc.data();
    
    if (receta.materia_prima_id) {
      // Buscar el producto migrado correspondiente
      const productosSnapshot = await db.collection('productos')
        .where('materia_prima_original_id', '==', receta.materia_prima_id)
        .limit(1)
        .get();
      
      if (!productosSnapshot.empty) {
        const nuevoProductoId = productosSnapshot.docs[0].id;
        
        // Actualizar la receta para usar producto_id en lugar de materia_prima_id
        batch.update(recetaDoc.ref, {
          producto_ingrediente_id: nuevoProductoId, // Nuevo campo
          // Mantener referencia original por si acaso
          materia_prima_original_id: receta.materia_prima_id,
          migrado_a_producto: true,
          fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
        });
        
        contadorActualizadas++;
      }
    }
  }
  
  await batch.commit();
  console.log(`✅ ${contadorActualizadas} recetas actualizadas`);
}

// ==================== PASO 4: LÓGICA DE PRODUCCIÓN ACTUALIZADA ====================

/**
 * 🏭 Nueva lógica de producción que descuenta materias primas automáticamente
 */
async function procesarProduccion(recetaId, cantidadAProducir, sucursalId) {
  console.log(`🏭 Procesando producción: Receta ${recetaId}, Cantidad: ${cantidadAProducir}`);
  
  // 1. Obtener detalles de la receta
  const recetaDetallesSnapshot = await db.collection('recetas_detalles')
    .where('receta_id', '==', recetaId)
    .get();
  
  if (recetaDetallesSnapshot.empty) {
    throw new Error('Receta no encontrada o sin ingredientes');
  }
  
  // 2. Verificar disponibilidad de materias primas
  const ingredientesRequeridos = [];
  
  for (const detalleDoc of recetaDetallesSnapshot.docs) {
    const detalle = detalleDoc.data();
    const cantidadRequerida = parseFloat(detalle.cantidad) * cantidadAProducir;
    
    // Buscar stock disponible
    const stockQuery = await db.collection('stock_sucursal')
      .where('producto_id', '==', detalle.producto_ingrediente_id)
      .where('sucursal_id', '==', sucursalId)
      .limit(1)
      .get();
    
    let stockDisponible = 0;
    if (!stockQuery.empty) {
      stockDisponible = parseInt(stockQuery.docs[0].data().cantidad || 0);
    }
    
    if (stockDisponible < cantidadRequerida) {
      throw new Error(`Stock insuficiente de ${detalle.nombre_ingrediente}. Disponible: ${stockDisponible}, Requerido: ${cantidadRequerida}`);
    }
    
    ingredientesRequeridos.push({
      producto_id: detalle.producto_ingrediente_id,
      cantidad_requerida: cantidadRequerida,
      stock_doc: stockQuery.docs[0],
      stock_disponible: stockDisponible
    });
  }
  
  // 3. Descontar materias primas en transacción
  await db.runTransaction(async (transaction) => {
    for (const ingrediente of ingredientesRequeridos) {
      const nuevoStock = ingrediente.stock_disponible - ingrediente.cantidad_requerida;
      
      // Actualizar stock
      transaction.update(ingrediente.stock_doc.ref, {
        cantidad: nuevoStock,
        ultima_actualizacion: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Crear movimiento de stock (salida)
      const movimientoRef = db.collection('movimientos_stock').doc();
      transaction.set(movimientoRef, {
        sucursal_id: sucursalId,
        producto_id: ingrediente.producto_id,
        tipo: 'salida',
        cantidad: ingrediente.cantidad_requerida,
        motivo: 'Producción - Consumo de materia prima',
        referencia_tipo: 'produccion',
        referencia_id: recetaId,
        fecha: admin.firestore.FieldValue.serverTimestamp(),
        usuario_id: 'sistema'
      });
    }
  });
  
  console.log('✅ Materias primas descontadas automáticamente');
}

// ==================== RESUMEN DE CAMBIOS NECESARIOS ====================

/**
 * 📋 CHECKLIST DE IMPLEMENTACIÓN:
 * 
 * ✅ 1. Ejecutar migración de materias primas → productos
 * ✅ 2. Migrar stock_materias_primas → stock_sucursal  
 * ✅ 3. Actualizar productos.routes.js con endpoint /productos/materias-primas
 * ✅ 4. Actualizar recetas para usar producto_ingrediente_id
 * ✅ 5. Modificar lógica de producción para descontar automáticamente
 * ✅ 6. Actualizar frontend para usar productos en lugar de materias_primas
 * ✅ 7. (Opcional) Mantener endpoints antiguos por compatibilidad temporal
 */

module.exports = {
  migrarMateriasPrimasAProductos,
  migrarStockMateriasPrimas,
  actualizarRecetas,
  procesarProduccion
};