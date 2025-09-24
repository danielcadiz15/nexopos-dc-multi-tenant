// migrar-listas-precios.js
// Script de migración para agregar listas de precios a productos existentes

const admin = require('firebase-admin');
const readline = require('readline');
//const colors = require('colors'); // npm install colors (opcional, para colores en consola)

// ====================================
// CONFIGURACIÓN - MODIFICA ESTA SECCIÓN
// ====================================

// Opción 1: Usando archivo de credenciales (RECOMENDADO)
const serviceAccount = require('./migracion-listas/serviceAccountKey.json');

// Opción 2: Si estás en Google Cloud, puedes usar las credenciales por defecto
// (comenta las líneas de arriba y descomenta esta)
// const serviceAccount = null;

// Configuración de descuentos por lista
const CONFIGURACION_LISTAS = {
  mayorista: {
    nombre: 'Mayorista',
    descuento: 0.85, // 15% de descuento
    descripcion: 'Precio para compras al por mayor'
  },
  interior: {
    nombre: 'Interior',
    descuento: 0.92, // 8% de descuento
    descripcion: 'Precio para clientes del interior'
  },
  posadas: {
    nombre: 'Posadas',
    descuento: 1.00, // Sin descuento (precio base)
    descripcion: 'Precio local estándar'
  }
};

// ====================================
// INICIALIZACIÓN DE FIREBASE
// ====================================

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  admin.initializeApp();
}

const db = admin.firestore();

// ====================================
// UTILIDADES
// ====================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const pregunta = (texto) => {
  return new Promise((resolve) => {
    rl.question(texto, (respuesta) => {
      resolve(respuesta);
    });
  });
};

const formatearPrecio = (precio) => {
  return `$${parseFloat(precio || 0).toFixed(2)}`;
};

const esperarTecla = async () => {
  await pregunta('\nPresiona ENTER para continuar...');
};

// ====================================
// FUNCIONES DE MIGRACIÓN
// ====================================

/**
 * Verifica el estado actual de la migración
 */
async function verificarEstadoMigracion() {
  console.log('\n📊 VERIFICANDO ESTADO ACTUAL DE LA BASE DE DATOS...\n'.cyan);
  
  try {
    const snapshot = await db.collection('productos').get();
    
    let estadisticas = {
      total: 0,
      conListas: 0,
      sinListas: 0,
      sinPrecioVenta: 0,
      sinPrecioCosto: 0,
      inactivos: 0
    };
    
    const productosSinListas = [];
    
    snapshot.forEach(doc => {
      const producto = doc.data();
      estadisticas.total++;
      
      if (producto.listas_precios) {
        estadisticas.conListas++;
      } else {
        estadisticas.sinListas++;
        productosSinListas.push({
          id: doc.id,
          ...producto
        });
      }
      
      if (!producto.precio_venta || producto.precio_venta === 0) {
        estadisticas.sinPrecioVenta++;
      }
      
      if (!producto.precio_costo || producto.precio_costo === 0) {
        estadisticas.sinPrecioCosto++;
      }
      
      if (!producto.activo) {
        estadisticas.inactivos++;
      }
    });
    
    // Mostrar estadísticas
    console.log('📈 ESTADÍSTICAS GENERALES:'.yellow);
    console.log(`   Total de productos: ${estadisticas.total}`.white);
    console.log(`   ✅ Con listas de precios: ${estadisticas.conListas}`.green);
    console.log(`   ❌ Sin listas de precios: ${estadisticas.sinListas}`.red);
    console.log(`   ⚠️  Sin precio de venta: ${estadisticas.sinPrecioVenta}`.yellow);
    console.log(`   ⚠️  Sin precio de costo: ${estadisticas.sinPrecioCosto}`.yellow);
    console.log(`   🔒 Productos inactivos: ${estadisticas.inactivos}`.gray);
    
    return {
      estadisticas,
      productosSinListas
    };
    
  } catch (error) {
    console.error('❌ Error al verificar estado:'.red, error);
    throw error;
  }
}

/**
 * Previsualiza los cambios sin aplicarlos
 */
async function previsualizarMigracion(limite = 10) {
  console.log(`\n👀 PREVISUALIZANDO MIGRACIÓN (primeros ${limite} productos sin listas)...\n`.cyan);
  
  try {
    const snapshot = await db.collection('productos')
      .where('activo', '==', true)
      .limit(limite * 2) // Traer más por si algunos ya tienen listas
      .get();
    
    let contador = 0;
    
    console.log('PRODUCTO'.padEnd(30) + 'COSTO'.padEnd(12) + 'P.ACTUAL'.padEnd(12) + 'MAYORISTA'.padEnd(12) + 'INTERIOR'.padEnd(12) + 'POSADAS');
    console.log('='.repeat(90));
    
    snapshot.forEach(doc => {
      const producto = doc.data();
      
      // Saltar si ya tiene listas
      if (producto.listas_precios || contador >= limite) {
        return;
      }
      
      const precioBase = producto.precio_venta || (producto.precio_costo * 1.5) || 0;
      const nuevasListas = calcularListasPrecios(precioBase);
      
      const nombre = (producto.codigo + ' - ' + producto.nombre).substring(0, 28);
      
      console.log(
        nombre.padEnd(30) +
        formatearPrecio(producto.precio_costo).padEnd(12) +
        formatearPrecio(precioBase).padEnd(12) +
        formatearPrecio(nuevasListas.mayorista).padEnd(12).green +
        formatearPrecio(nuevasListas.interior).padEnd(12).yellow +
        formatearPrecio(nuevasListas.posadas).padEnd(12).cyan
      );
      
      contador++;
    });
    
    console.log('='.repeat(90));
    console.log('\nNOTA: Los precios mostrados son los que se aplicarán en la migración'.gray);
    
  } catch (error) {
    console.error('❌ Error en previsualización:'.red, error);
    throw error;
  }
}

/**
 * Calcula las listas de precios basándose en el precio base
 */
function calcularListasPrecios(precioBase) {
  return {
    mayorista: Math.round(precioBase * CONFIGURACION_LISTAS.mayorista.descuento * 100) / 100,
    interior: Math.round(precioBase * CONFIGURACION_LISTAS.interior.descuento * 100) / 100,
    posadas: Math.round(precioBase * CONFIGURACION_LISTAS.posadas.descuento * 100) / 100
  };
}

/**
 * Ejecuta la migración real
 */
async function ejecutarMigracion(soloActivos = true) {
  console.log('\n🚀 INICIANDO MIGRACIÓN DE PRODUCTOS...\n'.cyan);
  
  try {
    // Construir query
    let query = db.collection('productos');
    if (soloActivos) {
      query = query.where('activo', '==', true);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log('⚠️  No hay productos para migrar'.yellow);
      return;
    }
    
    let batch = db.batch();
    let contador = 0;
    let omitidos = 0;
    let sinPrecio = 0;
    let batchCount = 0;
    
    // Log de inicio
    console.log(`📦 Productos a procesar: ${snapshot.size}`.white);
    console.log('🔄 Procesando...'.yellow);
    
    // Barra de progreso simple
    const totalProductos = snapshot.size;
    let progreso = 0;
    
    for (const doc of snapshot.docs) {
      const producto = doc.data();
      progreso++;
      
      // Mostrar progreso cada 10 productos
      if (progreso % 10 === 0 || progreso === totalProductos) {
        const porcentaje = Math.round((progreso / totalProductos) * 100);
        process.stdout.write(`\r   Progreso: ${progreso}/${totalProductos} (${porcentaje}%) `);
      }
      
      // Omitir si ya tiene listas
      if (producto.listas_precios) {
        omitidos++;
        continue;
      }
      
      // Calcular precio base
      let precioBase = producto.precio_venta || 0;
      
      // Si no hay precio de venta, usar costo con margen
      if (!precioBase && producto.precio_costo) {
        precioBase = producto.precio_costo * 1.5;
      }
      
      // Si no hay ningún precio, omitir
      if (!precioBase) {
        sinPrecio++;
        continue;
      }
      
      // Calcular listas
      const listas_precios = calcularListasPrecios(precioBase);
      
      // Actualizar documento
      batch.update(doc.ref, {
        listas_precios: listas_precios,
        precio_venta: listas_precios.posadas, // Asegurar que precio_venta = posadas
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
      });
      
      contador++;
      
      // Commit cada 500 operaciones (límite de Firebase)
      if (contador % 500 === 0) {
        await batch.commit();
        batch = db.batch();
        batchCount++;
      }
    }
    
    // Commit final
    if (contador % 500 !== 0) {
      await batch.commit();
    }
    
    console.log('\n\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE!\n'.green);
    
    // Resumen
    console.log('📊 RESUMEN DE LA MIGRACIÓN:'.yellow);
    console.log(`   Total procesados: ${snapshot.size}`.white);
    console.log(`   ✅ Migrados exitosamente: ${contador}`.green);
    console.log(`   ⏭️  Omitidos (ya tenían listas): ${omitidos}`.gray);
    console.log(`   ❌ Sin precio (no migrados): ${sinPrecio}`.red);
    
    // Guardar en historial
    await registrarEnHistorial(contador, omitidos, sinPrecio);
    
    return {
      migrados: contador,
      omitidos: omitidos,
      sinPrecio: sinPrecio
    };
    
  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA MIGRACIÓN:'.red, error);
    throw error;
  }
}

/**
 * Registra la migración en el historial
 */
async function registrarEnHistorial(migrados, omitidos, sinPrecio) {
  try {
    await db.collection('historial_precios').add({
      producto_id: 'MIGRACION_SISTEMA',
      fecha: admin.firestore.FieldValue.serverTimestamp(),
      usuario_id: 'script_migracion',
      cambios: {
        tipo: 'migracion_inicial_listas',
        productos_migrados: migrados,
        productos_omitidos: omitidos,
        productos_sin_precio: sinPrecio,
        configuracion_aplicada: CONFIGURACION_LISTAS,
        fecha_ejecucion: new Date().toISOString()
      },
      motivo: 'Migración inicial del sistema a listas de precios diferenciadas'
    });
    
    console.log('\n📝 Migración registrada en historial'.green);
  } catch (error) {
    console.error('⚠️  Error al registrar en historial:'.yellow, error.message);
  }
}

/**
 * Revierte la migración (elimina listas_precios)
 */
async function revertirMigracion() {
  console.log('\n⚠️  ADVERTENCIA: ESTO ELIMINARÁ TODAS LAS LISTAS DE PRECIOS\n'.red);
  
  const confirmar = await pregunta('¿Estás seguro? Escribe "SI REVERTIR" para confirmar: ');
  
  if (confirmar !== 'SI REVERTIR') {
    console.log('❌ Operación cancelada'.yellow);
    return;
  }
  
  try {
    const snapshot = await db.collection('productos')
      .where('listas_precios', '!=', null)
      .get();
    
    if (snapshot.empty) {
      console.log('ℹ️  No hay productos con listas para revertir'.gray);
      return;
    }
    
    console.log(`\n🔄 Revirtiendo ${snapshot.size} productos...`.yellow);
    
    let batch = db.batch();
    let contador = 0;
    
    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        listas_precios: admin.firestore.FieldValue.delete(),
        fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
      });
      
      contador++;
      
      if (contador % 500 === 0) {
        batch.commit();
        batch = db.batch();
      }
    });
    
    if (contador % 500 !== 0) {
      await batch.commit();
    }
    
    console.log(`\n✅ Revertidos ${contador} productos`.green);
    
    // Registrar en historial
    await db.collection('historial_precios').add({
      producto_id: 'REVERSION_MIGRACION',
      fecha: admin.firestore.FieldValue.serverTimestamp(),
      usuario_id: 'script_migracion',
      cambios: {
        tipo: 'reversion_listas',
        productos_afectados: contador
      },
      motivo: 'Reversión de migración de listas de precios'
    });
    
  } catch (error) {
    console.error('❌ Error al revertir:'.red, error);
    throw error;
  }
}

/**
 * Menú principal interactivo
 */
async function menuPrincipal() {
  console.clear();
  console.log('================================================'.cyan);
  console.log('     MIGRACIÓN DE LISTAS DE PRECIOS - LA FÁBRICA'.cyan);
  console.log('================================================\n'.cyan);
  
  console.log('CONFIGURACIÓN ACTUAL:'.yellow);
  console.log('  • Mayorista: 15% de descuento');
  console.log('  • Interior: 8% de descuento');
  console.log('  • Posadas: Precio base (sin descuento)\n');
  
  let continuar = true;
  
  while (continuar) {
    console.log('\n📋 MENÚ PRINCIPAL:'.yellow);
    console.log('  1. Verificar estado actual');
    console.log('  2. Previsualizar migración (10 productos)');
    console.log('  3. Previsualizar migración (personalizado)');
    console.log('  4. EJECUTAR MIGRACIÓN (solo activos)');
    console.log('  5. EJECUTAR MIGRACIÓN (todos)');
    console.log('  6. Revertir migración');
    console.log('  0. Salir\n');
    
    const opcion = await pregunta('Selecciona una opción (0-6): ');
    
    try {
      switch(opcion) {
        case '1':
          await verificarEstadoMigracion();
          await esperarTecla();
          break;
          
        case '2':
          await previsualizarMigracion(10);
          await esperarTecla();
          break;
          
        case '3':
          const cantidad = await pregunta('¿Cuántos productos quieres previsualizar? ');
          await previsualizarMigracion(parseInt(cantidad) || 10);
          await esperarTecla();
          break;
          
        case '4':
          console.log('\n⚠️  Esto migrará SOLO los productos ACTIVOS'.yellow);
          const confirmar1 = await pregunta('¿Continuar? (s/n): ');
          if (confirmar1.toLowerCase() === 's') {
            await ejecutarMigracion(true);
          }
          await esperarTecla();
          break;
          
        case '5':
          console.log('\n⚠️  Esto migrará TODOS los productos (activos e inactivos)'.yellow);
          const confirmar2 = await pregunta('¿Continuar? (s/n): ');
          if (confirmar2.toLowerCase() === 's') {
            await ejecutarMigracion(false);
          }
          await esperarTecla();
          break;
          
        case '6':
          await revertirMigracion();
          await esperarTecla();
          break;
          
        case '0':
          continuar = false;
          console.log('\n👋 ¡Hasta luego!\n'.cyan);
          break;
          
        default:
          console.log('\n❌ Opción no válida'.red);
          await esperarTecla();
      }
    } catch (error) {
      console.error('\n❌ Error:'.red, error.message);
      await esperarTecla();
    }
    
    if (continuar && opcion !== '0') {
      console.clear();
      console.log('================================================'.cyan);
      console.log('     MIGRACIÓN DE LISTAS DE PRECIOS - LA FÁBRICA'.cyan);
      console.log('================================================'.cyan);
    }
  }
  
  rl.close();
  process.exit(0);
}

// ====================================
// EJECUCIÓN PRINCIPAL
// ====================================

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.length > 0) {
  // Modo línea de comandos
  const comando = args[0];
  
  (async () => {
    try {
      switch(comando) {
        case 'verificar':
          await verificarEstadoMigracion();
          break;
          
        case 'previsualizar':
          const limite = parseInt(args[1]) || 10;
          await previsualizarMigracion(limite);
          break;
          
        case 'migrar':
          const tipo = args[1] || 'activos';
          await ejecutarMigracion(tipo === 'activos');
          break;
          
        case 'revertir':
          await revertirMigracion();
          break;
          
        default:
          console.log('Comandos disponibles:'.yellow);
          console.log('  node migrar-listas-precios.js verificar');
          console.log('  node migrar-listas-precios.js previsualizar [cantidad]');
          console.log('  node migrar-listas-precios.js migrar [activos|todos]');
          console.log('  node migrar-listas-precios.js revertir');
      }
    } catch (error) {
      console.error('Error:', error);
    }
    process.exit(0);
  })();
} else {
  // Modo interactivo
  menuPrincipal();
}