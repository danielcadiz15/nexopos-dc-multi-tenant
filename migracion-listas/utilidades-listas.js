// utilidades-listas.js
// Utilidades adicionales para gestión de listas de precios

const admin = require('firebase-admin');
const readline = require('readline');
const colors = require('colors');
const fs = require('fs').promises;
const path = require('path');

// ====================================
// CONFIGURACIÓN
// ====================================

// Reutilizar la misma configuración del script principal
const serviceAccount = require('./path/to/your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ====================================
// UTILIDADES GENERALES
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

// ====================================
// FUNCIONES ESPECÍFICAS
// ====================================

/**
 * Actualiza precios por categoría con porcentaje
 */
async function actualizarPorCategoria() {
  console.log('\n📦 ACTUALIZACIÓN DE PRECIOS POR CATEGORÍA\n'.cyan);
  
  try {
    // Obtener categorías
    const categoriasSnapshot = await db.collection('categorias').get();
    const categorias = [];
    
    console.log('Categorías disponibles:'.yellow);
    categoriasSnapshot.forEach((doc, index) => {
      const cat = doc.data();
      categorias.push({ id: doc.id, ...cat });
      console.log(`  ${index + 1}. ${cat.nombre}`);
    });
    
    const indice = await pregunta('\nSelecciona una categoría (número): ');
    const categoriaSeleccionada = categorias[parseInt(indice) - 1];
    
    if (!categoriaSeleccionada) {
      console.log('❌ Categoría no válida'.red);
      return;
    }
    
    console.log(`\nCategoría seleccionada: ${categoriaSeleccionada.nombre}`.green);
    
    // Seleccionar lista a actualizar
    console.log('\n¿Qué lista quieres actualizar?'.yellow);
    console.log('  1. Todas las listas');
    console.log('  2. Solo Mayorista');
    console.log('  3. Solo Interior');
    console.log('  4. Solo Posadas');
    
    const listaOpcion = await pregunta('\nOpción: ');
    const listasMap = {
      '1': 'todas',
      '2': 'mayorista',
      '3': 'interior',
      '4': 'posadas'
    };
    const listaSeleccionada = listasMap[listaOpcion];
    
    if (!listaSeleccionada) {
      console.log('❌ Opción no válida'.red);
      return;
    }
    
    // Tipo de actualización
    console.log('\nTipo de actualización:'.yellow);
    console.log('  1. Aumentar por porcentaje');
    console.log('  2. Disminuir por porcentaje');
    console.log('  3. Fijar margen sobre costo');
    
    const tipoOpcion = await pregunta('\nOpción: ');
    
    let porcentaje = 0;
    let operacion = '';
    
    switch(tipoOpcion) {
      case '1':
        porcentaje = parseFloat(await pregunta('Porcentaje de aumento: '));
        operacion = 'aumento';
        break;
      case '2':
        porcentaje = parseFloat(await pregunta('Porcentaje de descuento: ')) * -1;
        operacion = 'descuento';
        break;
      case '3':
        porcentaje = parseFloat(await pregunta('Margen deseado %: '));
        operacion = 'margen';
        break;
      default:
        console.log('❌ Opción no válida'.red);
        return;
    }
    
    // Confirmar
    console.log('\n⚠️  RESUMEN DE CAMBIOS:'.yellow);
    console.log(`  Categoría: ${categoriaSeleccionada.nombre}`);
    console.log(`  Lista(s): ${listaSeleccionada}`);
    console.log(`  Operación: ${operacion} ${Math.abs(porcentaje)}%`);
    
    const confirmar = await pregunta('\n¿Continuar? (s/n): ');
    if (confirmar.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada'.yellow);
      return;
    }
    
    // Ejecutar actualización
    const productosSnapshot = await db.collection('productos')
      .where('categoria_id', '==', categoriaSeleccionada.id)
      .where('activo', '==', true)
      .get();
    
    if (productosSnapshot.empty) {
      console.log('⚠️  No hay productos en esta categoría'.yellow);
      return;
    }
    
    console.log(`\n🔄 Actualizando ${productosSnapshot.size} productos...`.cyan);
    
    let batch = db.batch();
    let contador = 0;
    
    productosSnapshot.forEach(doc => {
      const producto = doc.data();
      const listas = producto.listas_precios || {};
      const nuevasListas = { ...listas };
      
      // Determinar qué listas actualizar
      const listasAAactualizar = listaSeleccionada === 'todas' 
        ? ['mayorista', 'interior', 'posadas'] 
        : [listaSeleccionada];
      
      listasAAactualizar.forEach(lista => {
        const precioActual = listas[lista] || producto.precio_venta || 0;
        let nuevoPrecio;
        
        if (operacion === 'margen' && producto.precio_costo) {
          // Fijar margen sobre costo
          nuevoPrecio = producto.precio_costo * (1 + porcentaje / 100);
        } else {
          // Aumentar/disminuir por porcentaje
          nuevoPrecio = precioActual * (1 + porcentaje / 100);
        }
        
        nuevasListas[lista] = Math.round(nuevoPrecio * 100) / 100;
      });
      
      batch.update(doc.ref, {
        listas_precios: nuevasListas,
        precio_venta: nuevasListas.posadas || producto.precio_venta,
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
    
    // Registrar en historial
    await db.collection('historial_precios').add({
      producto_id: 'ACTUALIZACION_CATEGORIA',
      fecha: admin.firestore.FieldValue.serverTimestamp(),
      usuario_id: 'utilidades_script',
      cambios: {
        tipo: 'actualizacion_masiva_categoria',
        categoria_id: categoriaSeleccionada.id,
        categoria_nombre: categoriaSeleccionada.nombre,
        productos_actualizados: contador,
        operacion: operacion,
        porcentaje: porcentaje,
        listas_afectadas: listaSeleccionada
      },
      motivo: `Actualización masiva por categoría: ${operacion} ${Math.abs(porcentaje)}%`
    });
    
    console.log(`\n✅ ${contador} productos actualizados exitosamente`.green);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Exporta listas de precios a CSV
 */
async function exportarListasCSV() {
  console.log('\n📄 EXPORTAR LISTAS DE PRECIOS A CSV\n'.cyan);
  
  try {
    const productosSnapshot = await db.collection('productos')
      .where('activo', '==', true)
      .orderBy('codigo')
      .get();
    
    if (productosSnapshot.empty) {
      console.log('⚠️  No hay productos para exportar'.yellow);
      return;
    }
    
    console.log(`📦 Exportando ${productosSnapshot.size} productos...`.cyan);
    
    // Crear contenido CSV
    const headers = [
      'Código',
      'Nombre',
      'Categoría',
      'Costo',
      'Mayorista',
      'Margen May %',
      'Interior', 
      'Margen Int %',
      'Posadas',
      'Margen Pos %',
      'Stock Actual'
    ];
    
    const rows = [headers.join(',')];
    
    // Obtener categorías para nombres
    const categoriasMap = new Map();
    const categoriasSnapshot = await db.collection('categorias').get();
    categoriasSnapshot.forEach(doc => {
      categoriasMap.set(doc.id, doc.data().nombre);
    });
    
    productosSnapshot.forEach(doc => {
      const p = doc.data();
      const listas = p.listas_precios || {};
      const costo = p.precio_costo || 0;
      
      const row = [
        p.codigo || '',
        `"${p.nombre || ''}"`, // Comillas para nombres con comas
        `"${categoriasMap.get(p.categoria_id) || ''}"`,
        costo.toFixed(2),
        (listas.mayorista || p.precio_venta || 0).toFixed(2),
        costo > 0 ? (((listas.mayorista || p.precio_venta || 0) - costo) / costo * 100).toFixed(1) : '0',
        (listas.interior || p.precio_venta || 0).toFixed(2),
        costo > 0 ? (((listas.interior || p.precio_venta || 0) - costo) / costo * 100).toFixed(1) : '0',
        (listas.posadas || p.precio_venta || 0).toFixed(2),
        costo > 0 ? (((listas.posadas || p.precio_venta || 0) - costo) / costo * 100).toFixed(1) : '0',
        p.stock_actual || 0
      ];
      
      rows.push(row.join(','));
    });
    
    // Guardar archivo
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `listas_precios_${fecha}.csv`;
    const contenido = rows.join('\n');
    
    await fs.writeFile(nombreArchivo, contenido, 'utf8');
    
    console.log(`\n✅ Archivo exportado: ${nombreArchivo}`.green);
    console.log(`   Total de productos: ${productosSnapshot.size}`.gray);
    
  } catch (error) {
    console.error('❌ Error al exportar:', error);
  }
}

/**
 * Analiza márgenes y detecta problemas
 */
async function analizarMargenes() {
  console.log('\n📊 ANÁLISIS DE MÁRGENES DE GANANCIA\n'.cyan);
  
  try {
    const productosSnapshot = await db.collection('productos')
      .where('activo', '==', true)
      .get();
    
    let estadisticas = {
      total: 0,
      sinCosto: 0,
      margenNegativo: [],
      margenBajo: [], // < 20%
      margenNormal: [], // 20-50%
      margenAlto: [] // > 50%
    };
    
    productosSnapshot.forEach(doc => {
      const p = doc.data();
      estadisticas.total++;
      
      if (!p.precio_costo || p.precio_costo === 0) {
        estadisticas.sinCosto++;
        return;
      }
      
      const listas = p.listas_precios || {};
      const costo = p.precio_costo;
      
      // Analizar cada lista
      ['mayorista', 'interior', 'posadas'].forEach(lista => {
        const precio = listas[lista] || p.precio_venta || 0;
        const margen = ((precio - costo) / costo) * 100;
        
        const item = {
          id: doc.id,
          codigo: p.codigo,
          nombre: p.nombre,
          lista: lista,
          costo: costo,
          precio: precio,
          margen: margen
        };
        
        if (margen < 0) {
          estadisticas.margenNegativo.push(item);
        } else if (margen < 20) {
          estadisticas.margenBajo.push(item);
        } else if (margen <= 50) {
          estadisticas.margenNormal.push(item);
        } else {
          estadisticas.margenAlto.push(item);
        }
      });
    });
    
    // Mostrar resultados
    console.log('📈 RESUMEN GENERAL:'.yellow);
    console.log(`   Total productos analizados: ${estadisticas.total}`);
    console.log(`   Sin precio de costo: ${estadisticas.sinCosto}`.gray);
    console.log(`   ❌ Margen negativo: ${estadisticas.margenNegativo.length}`.red);
    console.log(`   ⚠️  Margen bajo (<20%): ${estadisticas.margenBajo.length}`.yellow);
    console.log(`   ✅ Margen normal (20-50%): ${estadisticas.margenNormal.length}`.green);
    console.log(`   💰 Margen alto (>50%): ${estadisticas.margenAlto.length}`.cyan);
    
    // Mostrar productos con problemas
    if (estadisticas.margenNegativo.length > 0) {
      console.log('\n❌ PRODUCTOS CON MARGEN NEGATIVO:'.red);
      console.log('(Precio de venta menor al costo)'.gray);
      
      estadisticas.margenNegativo.slice(0, 10).forEach(item => {
        console.log(`   ${item.codigo} - ${item.nombre} (${item.lista}): ${formatearPrecio(item.precio)} < ${formatearPrecio(item.costo)}`);
      });
      
      if (estadisticas.margenNegativo.length > 10) {
        console.log(`   ... y ${estadisticas.margenNegativo.length - 10} más`.gray);
      }
    }
    
    if (estadisticas.margenBajo.length > 0) {
      console.log('\n⚠️  PRODUCTOS CON MARGEN BAJO:'.yellow);
      console.log('(Margen menor al 20%)'.gray);
      
      estadisticas.margenBajo.slice(0, 10).forEach(item => {
        console.log(`   ${item.codigo} - ${item.nombre} (${item.lista}): ${item.margen.toFixed(1)}%`);
      });
      
      if (estadisticas.margenBajo.length > 10) {
        console.log(`   ... y ${estadisticas.margenBajo.length - 10} más`.gray);
      }
    }
    
    // Opción para exportar reporte completo
    const exportar = await pregunta('\n¿Exportar reporte completo? (s/n): ');
    if (exportar.toLowerCase() === 's') {
      await exportarReporteMargenes(estadisticas);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

/**
 * Exporta reporte de márgenes
 */
async function exportarReporteMargenes(estadisticas) {
  try {
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `reporte_margenes_${fecha}.txt`;
    
    let contenido = 'REPORTE DE ANÁLISIS DE MÁRGENES\n';
    contenido += `Fecha: ${new Date().toLocaleString()}\n`;
    contenido += '=' .repeat(50) + '\n\n';
    
    contenido += 'RESUMEN:\n';
    contenido += `Total productos: ${estadisticas.total}\n`;
    contenido += `Sin costo: ${estadisticas.sinCosto}\n`;
    contenido += `Margen negativo: ${estadisticas.margenNegativo.length}\n`;
    contenido += `Margen bajo: ${estadisticas.margenBajo.length}\n`;
    contenido += `Margen normal: ${estadisticas.margenNormal.length}\n`;
    contenido += `Margen alto: ${estadisticas.margenAlto.length}\n\n`;
    
    if (estadisticas.margenNegativo.length > 0) {
      contenido += 'PRODUCTOS CON MARGEN NEGATIVO:\n';
      contenido += '-'.repeat(50) + '\n';
      estadisticas.margenNegativo.forEach(item => {
        contenido += `${item.codigo} - ${item.nombre}\n`;
        contenido += `  Lista: ${item.lista}\n`;
        contenido += `  Costo: ${formatearPrecio(item.costo)} | Precio: ${formatearPrecio(item.precio)}\n`;
        contenido += `  Margen: ${item.margen.toFixed(2)}%\n\n`;
      });
    }
    
    if (estadisticas.margenBajo.length > 0) {
      contenido += '\nPRODUCTOS CON MARGEN BAJO (<20%):\n';
      contenido += '-'.repeat(50) + '\n';
      estadisticas.margenBajo.forEach(item => {
        contenido += `${item.codigo} - ${item.nombre}\n`;
        contenido += `  Lista: ${item.lista}\n`;
        contenido += `  Costo: ${formatearPrecio(item.costo)} | Precio: ${formatearPrecio(item.precio)}\n`;
        contenido += `  Margen: ${item.margen.toFixed(2)}%\n\n`;
      });
    }
    
    await fs.writeFile(nombreArchivo, contenido, 'utf8');
    console.log(`\n✅ Reporte exportado: ${nombreArchivo}`.green);
    
  } catch (error) {
    console.error('❌ Error al exportar reporte:', error);
  }
}

/**
 * Menú principal
 */
async function menuPrincipal() {
  console.clear();
  console.log('================================================'.cyan);
  console.log('       UTILIDADES - LISTAS DE PRECIOS'.cyan);
  console.log('================================================\n'.cyan);
  
  let continuar = true;
  
  while (continuar) {
    console.log('\n📋 MENÚ DE UTILIDADES:'.yellow);
    console.log('  1. Actualizar precios por categoría');
    console.log('  2. Exportar listas a CSV');
    console.log('  3. Analizar márgenes de ganancia');
    console.log('  4. Comparar listas entre productos');
    console.log('  0. Salir\n');
    
    const opcion = await pregunta('Selecciona una opción: ');
    
    try {
      switch(opcion) {
        case '1':
          await actualizarPorCategoria();
          break;
          
        case '2':
          await exportarListasCSV();
          break;
          
        case '3':
          await analizarMargenes();
          break;
          
        case '4':
          console.log('🚧 Función en desarrollo'.yellow);
          break;
          
        case '0':
          continuar = false;
          console.log('\n👋 ¡Hasta luego!\n'.cyan);
          break;
          
        default:
          console.log('\n❌ Opción no válida'.red);
      }
      
      if (continuar && opcion !== '0') {
        await pregunta('\nPresiona ENTER para continuar...');
        console.clear();
        console.log('================================================'.cyan);
        console.log('       UTILIDADES - LISTAS DE PRECIOS'.cyan);
        console.log('================================================'.cyan);
      }
    } catch (error) {
      console.error('\n❌ Error:'.red, error.message);
      await pregunta('\nPresiona ENTER para continuar...');
    }
  }
  
  rl.close();
  process.exit(0);
}

// Ejecutar
menuPrincipal();