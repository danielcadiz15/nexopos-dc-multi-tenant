// verificar-migracion.js - VERIFICAR SI LA MIGRACIÓN DE PAGOS FUNCIONÓ
const admin = require('firebase-admin');

// 🔥 USA TU CLAVE EXISTENTE
const serviceAccount = require('./serviceAccountKey.json'); // Reemplaza con tu archivo

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verificarMigracionPagos() {
  console.log('🔍 Verificando migración de sistema de pagos...\n');
  
  try {
    const ventasSnapshot = await db.collection('ventas').get();
    
    if (ventasSnapshot.empty) {
      console.log('❌ No hay ventas en la base de datos');
      return;
    }
    
    console.log(`📊 Total de ventas: ${ventasSnapshot.size}\n`);
    
    let ventasConCamposPago = 0;
    let ventasSinCamposPago = 0;
    let totalVentas = 0;
    let totalPagado = 0;
    let totalPendiente = 0;
    
    const estadisticasPorEstado = {
      pagado: { count: 0, monto: 0 },
      parcial: { count: 0, monto: 0, pendiente: 0 },
      pendiente: { count: 0, monto: 0 }
    };
    
    const ventasDetalle = [];
    
    ventasSnapshot.forEach(doc => {
      const venta = doc.data();
      const tieneEstadoPago = venta.estado_pago !== undefined;
      const tieneTotalPagado = venta.total_pagado !== undefined;
      const tieneSaldoPendiente = venta.saldo_pendiente !== undefined;
      
      const total = parseFloat(venta.total || 0);
      const pagado = parseFloat(venta.total_pagado || 0);
      const pendiente = parseFloat(venta.saldo_pendiente || 0);
      const estadoPago = venta.estado_pago || 'sin_migrar';
      
      totalVentas += total;
      totalPagado += pagado;
      totalPendiente += pendiente;
      
      if (tieneEstadoPago && tieneTotalPagado && tieneSaldoPendiente) {
        ventasConCamposPago++;
        
        // Estadísticas por estado
        if (estadisticasPorEstado[estadoPago]) {
          estadisticasPorEstado[estadoPago].count++;
          estadisticasPorEstado[estadoPago].monto += total;
          if (estadoPago === 'parcial') {
            estadisticasPorEstado[estadoPago].pendiente += pendiente;
          }
        }
      } else {
        ventasSinCamposPago++;
      }
      
      // Guardar detalles de algunas ventas para revisión
      if (ventasDetalle.length < 5) {
        ventasDetalle.push({
          id: doc.id,
          numero: venta.numero || 'Sin número',
          fecha: venta.fecha ? new Date(venta.fecha).toLocaleDateString() : 'Sin fecha',
          total: total,
          estado: venta.estado || 'sin_estado',
          estado_pago: estadoPago,
          total_pagado: pagado,
          saldo_pendiente: pendiente,
          migrado: tieneEstadoPago && tieneTotalPagado && tieneSaldoPendiente
        });
      }
    });
    
    // RESULTADOS
    console.log('📊 RESULTADOS DE LA MIGRACIÓN:');
    console.log(`✅ Ventas con campos de pago: ${ventasConCamposPago}`);
    console.log(`❌ Ventas sin campos de pago: ${ventasSinCamposPago}`);
    console.log(`📈 Porcentaje migrado: ${((ventasConCamposPago / ventasSnapshot.size) * 100).toFixed(1)}%\n`);
    
    console.log('💰 RESUMEN FINANCIERO:');
    console.log(`💵 Total en ventas: $${totalVentas.toFixed(2)}`);
    console.log(`✅ Total pagado: $${totalPagado.toFixed(2)}`);
    console.log(`⏳ Total pendiente: $${totalPendiente.toFixed(2)}`);
    console.log(`📊 Porcentaje cobrado: ${totalVentas > 0 ? ((totalPagado / totalVentas) * 100).toFixed(1) : 0}%\n`);
    
    console.log('📈 ESTADÍSTICAS POR ESTADO DE PAGO:');
    Object.entries(estadisticasPorEstado).forEach(([estado, stats]) => {
      if (stats.count > 0) {
        console.log(`${estado.toUpperCase()}:`);
        console.log(`   📊 Cantidad: ${stats.count}`);
        console.log(`   💰 Monto: $${stats.monto.toFixed(2)}`);
        if (estado === 'parcial') {
          console.log(`   ⏳ Pendiente: $${stats.pendiente.toFixed(2)}`);
        }
      }
    });
    
    console.log('\n📋 MUESTRA DE VENTAS:');
    ventasDetalle.forEach(venta => {
      const status = venta.migrado ? '✅' : '❌';
      console.log(`${status} ${venta.numero} (${venta.fecha}):`);
      console.log(`   💰 Total: $${venta.total.toFixed(2)} | Pagado: $${venta.total_pagado.toFixed(2)} | Pendiente: $${venta.saldo_pendiente.toFixed(2)}`);
      console.log(`   📊 Estado: ${venta.estado} | Estado Pago: ${venta.estado_pago}`);
    });
    
    // RECOMENDACIONES
    console.log('\n💡 RECOMENDACIONES:');
    
    if (ventasSinCamposPago > 0) {
      console.log(`⚠️ Hay ${ventasSinCamposPago} ventas sin migrar`);
      console.log('   📋 Ejecuta el script de migración nuevamente');
    }
    
    if (totalPendiente > 0) {
      console.log(`💰 Hay $${totalPendiente.toFixed(2)} en cobros pendientes`);
      console.log('   📊 Esto debería aparecer en las estadísticas del dashboard');
    }
    
    if (ventasConCamposPago === ventasSnapshot.size) {
      console.log('✅ Migración completada exitosamente');
      console.log('📊 Las estadísticas deberían funcionar correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error al verificar migración:', error);
  }
}

// Ejecutar verificación
verificarMigracionPagos().catch(console.error);