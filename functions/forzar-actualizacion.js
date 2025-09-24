// forzar-una-venta.js - ACTUALIZAR UNA VENTA ESPECÍFICA PARA PROBAR
const admin = require('firebase-admin');

// 🔥 USA TU CLAVE EXISTENTE
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function forzarActualizacionVenta() {
  console.log('🔧 Actualizando una venta para probar...');
  
  try {
    // Obtener la primera venta
    const ventasSnapshot = await db.collection('ventas').limit(1).get();
    
    if (ventasSnapshot.empty) {
      console.log('❌ No hay ventas para actualizar');
      return;
    }
    
    const ventaDoc = ventasSnapshot.docs[0];
    const venta = ventaDoc.data();
    const total = parseFloat(venta.total || 0);
    
    console.log(`📋 Actualizando venta: ${venta.numero || ventaDoc.id}`);
    console.log(`💰 Total: $${total}`);
    
    // Simular que está parcialmente pagada
    const totalPagado = total * 0.5; // 50% pagado
    const saldoPendiente = total - totalPagado;
    
    const actualizacion = {
      estado_pago: 'parcial',
      total_pagado: totalPagado,
      saldo_pendiente: saldoPendiente,
      fecha_ultimo_pago: new Date().toISOString()
    };
    
    await ventaDoc.ref.update(actualizacion);
    
    // Crear registro de pago
    const pagoRef = ventaDoc.ref.collection('pagos').doc();
    await pagoRef.set({
      fecha: new Date().toISOString(),
      monto: totalPagado,
      metodo_pago: 'efectivo',
      concepto: 'Pago de prueba - 50%',
      usuario_id: 'sistema',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Venta actualizada:');
    console.log(`   💵 Total pagado: $${totalPagado.toFixed(2)}`);
    console.log(`   ⏳ Saldo pendiente: $${saldoPendiente.toFixed(2)}`);
    console.log(`   📊 Estado: ${actualizacion.estado_pago}`);
    
    console.log('\n🔄 Ahora recarga tu página y verifica las estadísticas');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

forzarActualizacionVenta().catch(console.error);