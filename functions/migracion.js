// migracion.js - RESTAURAR SISTEMA DE PAGOS EXISTENTE
const admin = require('firebase-admin');

// 🔥 USA TU CLAVE EXISTENTE - cambia el nombre del archivo por el tuyo
const serviceAccount = require('./serviceAccountKey.json'); // Reemplaza con tu archivo

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function restaurarSistemaPagos() {
  console.log('🔄 Restaurando sistema de pagos...');
  
  try {
    const ventasSnapshot = await db.collection('ventas').get();
    
    if (ventasSnapshot.empty) {
      console.log('📋 No hay ventas para procesar');
      return;
    }
    
    console.log(`📊 Procesando ${ventasSnapshot.size} ventas...`);
    
    let batch = db.batch();
    let contador = 0;
    let ventasActualizadas = 0;
    
    for (const doc of ventasSnapshot.docs) {
      const venta = doc.data();
      
      // Verificar si ya tiene campos de pago
      if (venta.estado_pago === undefined || venta.total_pagado === undefined) {
        const total = parseFloat(venta.total || 0);
        
        // Determinar estado basado en si está completada
        let estado_pago = 'pendiente';
        let total_pagado = 0;
        
        // Si la venta está completada, marcarla como pagada
        if (venta.estado === 'completada') {
          estado_pago = 'pagado';
          total_pagado = total;
        }
        
        const camposNuevos = {
          estado_pago: estado_pago,
          total_pagado: total_pagado,
          saldo_pendiente: total - total_pagado,
          fecha_ultimo_pago: estado_pago === 'pagado' ? (venta.fecha || new Date().toISOString()) : null
        };
        
        console.log(`📝 Actualizando venta: ${venta.numero || doc.id}`);
        console.log(`   - Estado: ${venta.estado} → Estado pago: ${estado_pago}`);
        console.log(`   - Total: $${total} → Pagado: $${total_pagado} → Pendiente: $${total - total_pagado}`);
        
        batch.update(doc.ref, camposNuevos);
        contador++;
        ventasActualizadas++;
        
        // Crear registro de pago si está pagada
        if (total_pagado > 0) {
          const pagoRef = doc.ref.collection('pagos').doc();
          batch.set(pagoRef, {
            fecha: venta.fecha || new Date().toISOString(),
            monto: total_pagado,
            metodo_pago: venta.metodo_pago || 'efectivo',
            concepto: 'Pago registrado - Migración del sistema',
            usuario_id: venta.usuario_id || 'sistema',
            usuario_nombre: 'Sistema',
            referencia: '',
            observaciones: 'Pago registrado durante restauración del sistema',
            created_at: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`   💰 Creando registro de pago: $${total_pagado} (${venta.metodo_pago || 'efectivo'})`);
        }
        
        // Commit cada 400 operaciones
        if (contador >= 200) { // Reducido porque ahora hacemos más operaciones por venta
          console.log(`💾 Guardando lote de ${contador} operaciones...`);
          await batch.commit();
          
          batch = db.batch();
          contador = 0;
          
          // Pequeña pausa para no sobrecargar Firebase
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else {
        console.log(`⏭️ Venta ${venta.numero || doc.id} ya tiene campos de pago`);
      }
    }
    
    // Commit final
    if (contador > 0) {
      console.log(`💾 Guardando último lote de ${contador} operaciones...`);
      await batch.commit();
    }
    
    console.log(`\n🎉 RESTAURACIÓN COMPLETADA`);
    console.log(`📊 Ventas actualizadas: ${ventasActualizadas}`);
    console.log(`📋 Ventas que ya tenían campos: ${ventasSnapshot.size - ventasActualizadas}`);
    
    // Verificar algunos resultados
    console.log('\n🔍 Verificando resultados...');
    await verificarResultados();
    
  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
    console.error('📋 Detalles:', error.message);
  }
}

async function verificarResultados() {
  try {
    // Contar ventas por estado de pago
    const pagadas = await db.collection('ventas').where('estado_pago', '==', 'pagado').get();
    const pendientes = await db.collection('ventas').where('estado_pago', '==', 'pendiente').get();
    const parciales = await db.collection('ventas').where('estado_pago', '==', 'parcial').get();
    
    console.log(`✅ Ventas pagadas: ${pagadas.size}`);
    console.log(`⏳ Ventas pendientes: ${pendientes.size}`);
    console.log(`📊 Ventas parciales: ${parciales.size}`);
    
    // Calcular totales
    let totalVentas = 0;
    let totalCobrado = 0;
    let totalPendiente = 0;
    
    const todasVentas = await db.collection('ventas').get();
    todasVentas.forEach(doc => {
      const venta = doc.data();
      totalVentas += parseFloat(venta.total || 0);
      totalCobrado += parseFloat(venta.total_pagado || 0);
      totalPendiente += parseFloat(venta.saldo_pendiente || 0);
    });
    
    console.log(`\n💰 RESUMEN FINANCIERO:`);
    console.log(`   Total en ventas: $${totalVentas.toFixed(2)}`);
    console.log(`   Total cobrado: $${totalCobrado.toFixed(2)}`);
    console.log(`   Total pendiente: $${totalPendiente.toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error en verificación:', error.message);
  }
}

// === SCRIPT DE LIMPIEZA MASIVA DE DEUDAS POR FECHA ===
async function marcarDeudasPorFechaComoPagadas() {
  console.log('🔄 Marcando como pagadas todas las ventas con saldo pendiente y fecha 2025-06-09 o 2025-06-10...');
  try {
    const fechasObjetivo = ['2025-06-09', '2025-06-10'];
    let totalActualizadas = 0;
    let batch = db.batch();
    let contador = 0;
    const ventasSnapshot = await db.collection('ventas').where('saldo_pendiente', '>', 0).get();
    for (const doc of ventasSnapshot.docs) {
      const venta = doc.data();
      if (!venta.fecha) continue;
      const fechaVenta = venta.fecha.split('T')[0];
      if (fechasObjetivo.includes(fechaVenta)) {
        const total = parseFloat(venta.total || 0);
        batch.update(doc.ref, {
          saldo_pendiente: 0,
          total_pagado: total,
          estado: 'completada',
          estado_pago: 'pagado',
          fecha_ultimo_pago: new Date().toISOString(),
          nota_auditoria: 'Marcado como pagado por limpieza masiva (junio 2025)'
        });
        contador++;
        totalActualizadas++;
        if (contador >= 400) {
          console.log(`💾 Guardando lote de ${contador} ventas...`);
          await batch.commit();
          batch = db.batch();
          contador = 0;
        }
      }
    }
    if (contador > 0) {
      console.log(`💾 Guardando último lote de ${contador} ventas...`);
      await batch.commit();
    }
    console.log(`🎉 Ventas marcadas como pagadas: ${totalActualizadas}`);
  } catch (error) {
    console.error('❌ Error en limpieza masiva:', error.message);
  }
}

// Descomenta para ejecutar solo la limpieza masiva
 marcarDeudasPorFechaComoPagadas().catch(console.error);

// Ejecutar restauración
restaurarSistemaPagos().catch(console.error);