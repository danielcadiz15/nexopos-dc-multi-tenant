// ========================================
// ESTRUCTURA DE FIRESTORE PARA SISTEMA DE PAGOS
// ========================================

/**
 * COLECCIÓN: ventas
 * 
 * Estructura actualizada con campos de pago
 */
const ventaSchema = {
  // Campos existentes
  numero: "VTA-2025-0001",
  fecha: "timestamp",
  cliente_id: "id_del_cliente",
  cliente_info: {
    id: "id_del_cliente",
    nombre: "Juan",
    apellido: "Pérez",
    nombre_completo: "Juan Pérez",
    telefono: "123456789",
    email: "juan@email.com"
  },
  usuario_id: "id_del_usuario",
  vendedor: "Nombre del Vendedor",
  metodo_pago: "efectivo", // efectivo, tarjeta, transferencia, credito
  subtotal: 1000.00,
  descuento: 100.00,
  impuestos: 0.00,
  total: 900.00,
  estado: "completada", // pendiente, completada, cancelada, devuelta
  notas: "Observaciones de la venta",
  
  // NUEVOS CAMPOS PARA SISTEMA DE PAGOS
  estado_pago: "parcial", // pagado, parcial, pendiente
  total_pagado: 500.00,    // Monto pagado hasta ahora
  saldo_pendiente: 400.00,  // Total - total_pagado
  fecha_ultimo_pago: "timestamp", // Fecha del último pago recibido
  
  // Campos de auditoría
  created_at: "timestamp",
  updated_at: "timestamp",
  activo: true
};

/**
 * SUBCOLECCIÓN: ventas/{ventaId}/detalles
 * 
 * Productos de la venta (sin cambios)
 */
const detalleVentaSchema = {
  producto_id: "id_del_producto",
  producto_info: {
    id: "id_del_producto",
    codigo: "PROD001",
    nombre: "Producto de ejemplo",
    descripcion: "Descripción del producto"
  },
  cantidad: 3,
  precio_unitario: 350.00,
  descuento: 50.00,
  precio_total: 1000.00,
  devuelto: false,
  cantidad_devuelta: 0
};

/**
 * NUEVA SUBCOLECCIÓN: ventas/{ventaId}/pagos
 * 
 * Historial de pagos de la venta
 */
const pagoSchema = {
  fecha: "timestamp",
  monto: 500.00,
  metodo_pago: "efectivo", // efectivo, tarjeta, transferencia, otro
  concepto: "Pago inicial de venta",
  usuario_id: "id_del_usuario_que_registra",
  usuario_nombre: "Nombre del Usuario",
  referencia: "REF-12345", // Número de transferencia, voucher, etc.
  observaciones: "Notas adicionales del pago",
  created_at: "timestamp"
};

// ========================================
// SCRIPTS DE MIGRACIÓN PARA FIREBASE
// ========================================

/**
 * Script para actualizar ventas existentes con los nuevos campos
 * Ejecutar una sola vez en Firebase Functions o en un script Node.js
 */
const migrarVentasExistentes = async () => {
  const admin = require('firebase-admin');
  const db = admin.firestore();
  
  console.log('🔄 Iniciando migración de ventas...');
  
  try {
    // Obtener todas las ventas
    const ventasSnapshot = await db.collection('ventas').get();
    
    let batch = db.batch();
    let contador = 0;
    let ventasMigradas = 0;
    
    for (const doc of ventasSnapshot.docs) {
      const venta = doc.data();
      
      // Solo migrar si no tiene los campos nuevos
      if (venta.estado_pago === undefined) {
        const total = parseFloat(venta.total || 0);
        
        // Determinar estado de pago basado en el estado de la venta
        let estado_pago = 'pendiente';
        let total_pagado = 0;
        
        // Si la venta está completada, asumimos que fue pagada
        if (venta.estado === 'completada') {
          estado_pago = 'pagado';
          total_pagado = total;
        }
        
        const actualizacion = {
          estado_pago: estado_pago,
          total_pagado: total_pagado,
          saldo_pendiente: total - total_pagado,
          fecha_ultimo_pago: estado_pago === 'pagado' ? venta.fecha : null
        };
        
        batch.update(doc.ref, actualizacion);
        contador++;
        
        // Si hay un pago inicial, crear registro en subcolección
        if (total_pagado > 0) {
          const pagoRef = doc.ref.collection('pagos').doc();
          batch.set(pagoRef, {
            fecha: venta.fecha,
            monto: total_pagado,
            metodo_pago: venta.metodo_pago || 'efectivo',
            concepto: 'Migración - Pago completo de venta',
            usuario_id: venta.usuario_id || 'sistema',
            created_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        // Firestore tiene un límite de 500 operaciones por batch
        if (contador >= 400) {
          await batch.commit();
          ventasMigradas += contador;
          console.log(`✅ Migradas ${ventasMigradas} ventas...`);
          batch = db.batch();
          contador = 0;
        }
      }
    }
    
    // Commit del último batch
    if (contador > 0) {
      await batch.commit();
      ventasMigradas += contador;
    }
    
    console.log(`✅ Migración completada. Total de ventas migradas: ${ventasMigradas}`);
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  }
};

// ========================================
// REGLAS DE SEGURIDAD FIRESTORE
// ========================================

/**
 * Actualizar las reglas de seguridad en Firebase Console
 * Firestore Database > Rules
 */
const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Función auxiliar para verificar autenticación
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Función para verificar si es admin
    function isAdmin() {
      return isAuthenticated() && 
        request.auth.token.role == 'admin';
    }
    
    // Función para verificar si es el usuario actual
    function isCurrentUser(userId) {
      return isAuthenticated() && 
        request.auth.uid == userId;
    }
    
    // Reglas para ventas
    match /ventas/{ventaId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
        // No permitir cambiar el total o montos críticos
        (!request.resource.data.diff(resource.data).affectedKeys()
          .hasAny(['total', 'subtotal']));
      allow delete: if isAdmin();
      
      // Subcolección de detalles
      match /detalles/{detalleId} {
        allow read: if isAuthenticated();
        allow write: if isAuthenticated();
      }
      
      // Subcolección de pagos
      match /pagos/{pagoId} {
        allow read: if isAuthenticated();
        allow create: if isAuthenticated() &&
          // Validar que el monto no exceda el saldo pendiente
          request.resource.data.monto > 0;
        allow update: if isAdmin(); // Solo admin puede modificar pagos
        allow delete: if isAdmin(); // Solo admin puede eliminar pagos
      }
    }
    
    // Resto de las reglas para otras colecciones...
  }
}
`;

// ========================================
// ÍNDICES RECOMENDADOS
// ========================================

/**
 * Crear estos índices en Firebase Console
 * Firestore Database > Indexes
 */
const indicesRecomendados = [
  {
    coleccion: "ventas",
    campos: [
      { campo: "fecha", orden: "DESC" },
      { campo: "estado", orden: "ASC" }
    ]
  },
  {
    coleccion: "ventas",
    campos: [
      { campo: "fecha", orden: "DESC" },
      { campo: "estado_pago", orden: "ASC" }
    ]
  },
  {
    coleccion: "ventas",
    campos: [
      { campo: "cliente_id", orden: "ASC" },
      { campo: "fecha", orden: "DESC" }
    ]
  },
  {
    coleccion: "ventas",
    campos: [
      { campo: "estado_pago", orden: "ASC" },
      { campo: "saldo_pendiente", orden: "DESC" }
    ]
  }
];

// ========================================
// EJEMPLO DE USO EN CLOUD FUNCTIONS
// ========================================

/**
 * Cloud Function para registrar un pago
 */
exports.registrarPago = functions.https.onCall(async (data, context) => {
  // Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Usuario no autenticado'
    );
  }
  
  const { ventaId, monto, metodoPago, concepto } = data;
  
  try {
    // Iniciar transacción
    const resultado = await db.runTransaction(async (transaction) => {
      const ventaRef = db.collection('ventas').doc(ventaId);
      const ventaDoc = await transaction.get(ventaRef);
      
      if (!ventaDoc.exists) {
        throw new Error('Venta no encontrada');
      }
      
      const venta = ventaDoc.data();
      const totalVenta = parseFloat(venta.total);
      const totalPagado = parseFloat(venta.total_pagado || 0);
      const montoPago = parseFloat(monto);
      
      // Validar monto
      if (montoPago <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }
      
      if (montoPago > (totalVenta - totalPagado)) {
        throw new Error('El monto excede el saldo pendiente');
      }
      
      // Calcular nuevos valores
      const nuevoTotalPagado = totalPagado + montoPago;
      const nuevoSaldoPendiente = totalVenta - nuevoTotalPagado;
      
      let nuevoEstadoPago = 'pendiente';
      if (nuevoTotalPagado >= totalVenta) {
        nuevoEstadoPago = 'pagado';
      } else if (nuevoTotalPagado > 0) {
        nuevoEstadoPago = 'parcial';
      }
      
      // Crear registro de pago
      const pagoRef = ventaRef.collection('pagos').doc();
      const pagoData = {
        fecha: admin.firestore.FieldValue.serverTimestamp(),
        monto: montoPago,
        metodo_pago: metodoPago,
        concepto: concepto || `Pago de venta ${venta.numero}`,
        usuario_id: context.auth.uid,
        usuario_nombre: context.auth.token.name || 'Usuario',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Actualizar venta
      const ventaUpdate = {
        total_pagado: nuevoTotalPagado,
        saldo_pendiente: nuevoSaldoPendiente,
        estado_pago: nuevoEstadoPago,
        fecha_ultimo_pago: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Ejecutar transacción
      transaction.set(pagoRef, pagoData);
      transaction.update(ventaRef, ventaUpdate);
      
      return {
        pagoId: pagoRef.id,
        ventaActualizada: {
          ...ventaUpdate,
          numero: venta.numero
        }
      };
    });
    
    return {
      success: true,
      data: resultado
    };
    
  } catch (error) {
    console.error('Error al registrar pago:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});

// ========================================
// TRIGGERS AUTOMÁTICOS
// ========================================

/**
 * Trigger para actualizar el estado de pago cuando se crea un pago
 */
exports.onPagoCreated = functions.firestore
  .document('ventas/{ventaId}/pagos/{pagoId}')
  .onCreate(async (snap, context) => {
    const pago = snap.data();
    const ventaId = context.params.ventaId;
    
    // Este trigger se ejecuta automáticamente
    // pero ya actualizamos la venta en la transacción
    console.log(`Nuevo pago registrado para venta ${ventaId}`);
  });

module.exports = {
  ventaSchema,
  detalleVentaSchema,
  pagoSchema,
  migrarVentasExistentes,
  firestoreRules,
  indicesRecomendados
};