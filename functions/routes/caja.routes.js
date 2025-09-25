const admin = require('firebase-admin');
const db = admin.firestore();
const { configurarCORS, manejarPreflight } = require('../utils/cors');

// Colección de movimientos de caja
const COLECCION_CAJA = 'movimientos_caja';
const COLECCION_SALDO_CAJA = 'saldo_caja';

const cajaRoutes = async (req, res, path) => {
  try {
    if (manejarPreflight && manejarPreflight(req, res)) return true;
    configurarCORS && configurarCORS(res);

    // Obtener companyId para filtrado multi-tenant
    const companyId = req.companyId || req.user?.companyId || null;
    const requestedOrgId = req.query?.orgId || req.headers['x-org-id'] || null;
    const tenantId = companyId || requestedOrgId || null;
    console.log(`💰 [CAJA] Procesando ruta: ${req.method} ${path}, companyId: ${companyId}, requestedOrgId: ${requestedOrgId}`);

    // POST /caja/movimiento - Agregar movimiento
    if (path === '/caja/movimiento' && req.method === 'POST') {
      console.log('💰 [CAJA] Agregando movimiento:', req.body);
      
      const { tipo, monto, concepto, usuario, observaciones, fecha } = req.body;
      if (!tipo || !monto || !concepto) {
        console.log('❌ [CAJA] Faltan datos obligatorios');
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
      }
      
      const fechaMovimiento = obtenerFechaCorta(fecha);
      const movimiento = {
        tipo, // 'ingreso' o 'egreso'
        monto: parseFloat(monto),
        concepto,
        usuario: usuario || null,
        observaciones: observaciones || '',
        fecha: fechaMovimiento,
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        ...(tenantId ? { orgId: tenantId } : {})
      };
      
      console.log('💰 [CAJA] Guardando movimiento:', movimiento);
      const docRef = await db.collection(COLECCION_CAJA).add(movimiento);
      
      // Actualizar saldo acumulado
      await actualizarSaldoAcumulado(tipo, parseFloat(monto));
      
      console.log('✅ [CAJA] Movimiento guardado con ID:', docRef.id);
      res.json({ success: true, id: docRef.id, movimiento });
      return true;
    }

    // GET /caja/movimientos?fecha=YYYY-MM-DD - Listar movimientos de un día
    if (path === '/caja/movimientos' && req.method === 'GET') {
      const { fecha } = req.query;
      console.log('💰 [CAJA] Consultando movimientos para fecha:', fecha);
      
      if (!fecha) {
        console.log('❌ [CAJA] No se proporcionó fecha');
        return res.status(400).json({ success: false, message: 'Debe indicar la fecha (YYYY-MM-DD)' });
      }
      
      try {
        // Consultar movimientos filtrando por fecha y orgId
        let query = db.collection(COLECCION_CAJA);

        if (tenantId) {
          query = query.where('orgId', '==', tenantId);
          console.log(`💰 [CAJA] Filtrando movimientos por orgId: ${tenantId}`);
        } else {
          console.log('⚠️ [CAJA] No hay tenantId, la consulta no estará aislada por tenant');
        }

        let movimientos = [];

        try {
          const snapshot = await query.where('fecha', '==', fecha).get();
          movimientos = construirMovimientos(snapshot);
        } catch (firestoreError) {
          if (esErrorDeIndiceCompuesto(firestoreError)) {
            console.warn('⚠️ [CAJA] Faltó índice compuesto para fecha+orgId, aplicando filtro en memoria');
            const fallbackSnapshot = await query.get();
            movimientos = construirMovimientos(fallbackSnapshot, { filtrarPorFecha: fecha });
          } else {
            throw firestoreError;
          }
        }

        // Ordenar en memoria para asegurar consistencia
        movimientos.sort((a, b) => {
          const ta = obtenerTimestampMillis(a.fechaCreacion);
          const tb = obtenerTimestampMillis(b.fechaCreacion);
          return ta - tb;
        });

        console.log(`✅ [CAJA] Encontrados ${movimientos.length} movimientos`);
        res.json({ success: true, data: movimientos, total: movimientos.length });
        return true;

      } catch (error) {
        console.error('❌ [CAJA] Error consultando movimientos:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error al consultar movimientos',
          error: error.message,
          stack: error.stack // Agregado para depuración
        });
        return true;
      }
    }

    // GET /caja/movimientos-acumulados - Listar todos los movimientos (caja chica)
    if (path === '/caja/movimientos-acumulados' && req.method === 'GET') {
      console.log('💰 [CAJA] Consultando movimientos acumulados (caja chica)');
      
      try {
        let query = db.collection(COLECCION_CAJA);

        // Filtrar por companyId si está disponible
        if (tenantId) {
          query = query.where('orgId', '==', tenantId);
          console.log(`💰 [CAJA] Filtrando movimientos acumulados por orgId: ${tenantId}`);
        } else {
          console.log('⚠️ [CAJA] No hay tenantId, mostrando todos los movimientos acumulados');
        }

        let movimientosSnapshot;
        try {
          movimientosSnapshot = await query
            .orderBy('fechaCreacion', 'desc')
            .limit(100) // Últimos 100 movimientos
            .get();
        } catch (firestoreError) {
          if (esErrorDeIndiceCompuesto(firestoreError)) {
            console.warn('⚠️ [CAJA] Faltó índice para orgId+fechaCreacion, ordenando en memoria');
            const fallbackSnapshot = await query.get();
            const movimientosFallback = construirMovimientos(fallbackSnapshot);
            movimientosFallback.sort((a, b) => obtenerTimestampMillis(b.fechaCreacion) - obtenerTimestampMillis(a.fechaCreacion));
            const topMovimientos = movimientosFallback.slice(0, 100);
            res.json({ success: true, data: topMovimientos, total: topMovimientos.length });
            return true;
          }
          throw firestoreError;
        }

        const movimientos = construirMovimientos(movimientosSnapshot);

        console.log(`✅ [CAJA] Encontrados ${movimientos.length} movimientos acumulados`);
        res.json({ success: true, data: movimientos, total: movimientos.length });
        return true;
        
      } catch (error) {
        console.error('❌ [CAJA] Error consultando movimientos acumulados:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error al consultar movimientos acumulados',
          error: error.message
        });
        return true;
      }
    }

    // GET /caja/resumen?fecha=YYYY-MM-DD - Totales del día
    if (path === '/caja/resumen' && req.method === 'GET') {
      const { fecha } = req.query;
      console.log('💰 [CAJA] Calculando resumen para fecha:', fecha);
      
      if (!fecha) {
        console.log('❌ [CAJA] No se proporcionó fecha para resumen');
        return res.status(400).json({ success: false, message: 'Debe indicar la fecha (YYYY-MM-DD)' });
      }
      
      try {
        // CORREGIDO: Consultar por string de fecha en lugar de timestamps
        let query = db.collection(COLECCION_CAJA);

        if (tenantId) {
          query = query.where('orgId', '==', tenantId);
          console.log(`💰 [CAJA] Calculando resumen por orgId: ${tenantId}`);
        }

        let movimientosProcesados = [];

        try {
          const movimientosSnapshot = await query.where('fecha', '==', fecha).get();
          movimientosProcesados = construirMovimientos(movimientosSnapshot);
        } catch (firestoreError) {
          if (esErrorDeIndiceCompuesto(firestoreError)) {
            console.warn('⚠️ [CAJA] Faltó índice compuesto para resumen, filtrando en memoria');
            const fallbackSnapshot = await query.get();
            movimientosProcesados = construirMovimientos(fallbackSnapshot, { filtrarPorFecha: fecha });
          } else {
            throw firestoreError;
          }
        }

        let ingresos = 0;
        let egresos = 0;

        movimientosProcesados.forEach(mov => {
          if (mov.tipo === 'ingreso') ingresos += parseFloat(mov.monto);
          if (mov.tipo === 'egreso') egresos += parseFloat(mov.monto);
        });
        
        const saldo = ingresos - egresos;
        console.log(`✅ [CAJA] Resumen - Ingresos: ${ingresos}, Egresos: ${egresos}, Saldo: ${saldo}`);
        
        res.json({ success: true, ingresos, egresos, saldo });
        return true;
        
      } catch (error) {
        console.error('❌ [CAJA] Error calculando resumen:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error al calcular resumen',
          error: error.message 
        });
        return true;
      }
    }

    // GET /caja/saldo-acumulado - Saldo total de caja chica
    if (path === '/caja/saldo-acumulado' && req.method === 'GET') {
      console.log('💰 [CAJA] Calculando saldo acumulado de caja chica');
      
      try {
        // Obtener saldo desde la colección de saldo
        const saldoDoc = await db.collection(COLECCION_SALDO_CAJA).doc('actual').get();
        
        let saldoAcumulado = 0;
        if (saldoDoc.exists) {
          saldoAcumulado = saldoDoc.data().saldo || 0;
        } else {
          // Si no existe, calcular desde todos los movimientos
          const todosLosMovimientos = await db.collection(COLECCION_CAJA).get();
          
          todosLosMovimientos.forEach(doc => {
            const mov = doc.data();
            if (mov.tipo === 'ingreso') saldoAcumulado += parseFloat(mov.monto);
            if (mov.tipo === 'egreso') saldoAcumulado -= parseFloat(mov.monto);
          });
          
          // Guardar el saldo calculado
          await db.collection(COLECCION_SALDO_CAJA).doc('actual').set({
            saldo: saldoAcumulado,
            fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        console.log(`✅ [CAJA] Saldo acumulado: ${saldoAcumulado}`);
        res.json({ success: true, saldoAcumulado });
        return true;
        
      } catch (error) {
        console.error('❌ [CAJA] Error calculando saldo acumulado:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error al calcular saldo acumulado',
          error: error.message 
        });
        return true;
      }
    }

    // POST /caja/verificar-saldo - Verificar saldo físico vs saldo del sistema
    if (path === '/caja/verificar-saldo' && req.method === 'POST') {
      const { saldoFisico } = req.body;
      console.log('💰 [CAJA] Verificando saldo físico:', saldoFisico);
      
      if (saldoFisico === undefined || saldoFisico === null) {
        return res.status(400).json({ success: false, message: 'Debe proporcionar el saldo físico' });
      }
      
      try {
        // Obtener saldo del sistema
        const saldoDoc = await db.collection(COLECCION_SALDO_CAJA).doc('actual').get();
        const saldoSistema = saldoDoc.exists ? saldoDoc.data().saldo || 0 : 0;
        
        const diferencia = parseFloat(saldoFisico) - saldoSistema;
        
        // Guardar verificación
        await db.collection(COLECCION_SALDO_CAJA).doc('verificaciones').collection('registros').add({
          saldoFisico: parseFloat(saldoFisico),
          saldoSistema,
          diferencia,
          fechaVerificacion: admin.firestore.FieldValue.serverTimestamp(),
          usuario: req.body.usuario || 'sistema'
        });
        
        console.log(`✅ [CAJA] Verificación guardada - Físico: ${saldoFisico}, Sistema: ${saldoSistema}, Diferencia: ${diferencia}`);
        res.json({ 
          success: true, 
          saldoFisico: parseFloat(saldoFisico),
          saldoSistema,
          diferencia,
          coinciden: diferencia === 0
        });
        return true;
        
      } catch (error) {
        console.error('❌ [CAJA] Error verificando saldo:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error al verificar saldo',
          error: error.message 
        });
        return true;
      }
    }

    // DELETE /caja/movimiento/:id - Eliminar movimiento
    if (path.match(/^\/caja\/movimiento\/[^\/]+$/) && req.method === 'DELETE') {
      const movimientoId = path.split('/').pop();
      console.log('💰 [CAJA] Eliminando movimiento:', movimientoId);
      
      try {
        const movimientoDoc = await db.collection(COLECCION_CAJA).doc(movimientoId).get();
        
        if (!movimientoDoc.exists) {
          console.log('❌ [CAJA] Movimiento no encontrado:', movimientoId);
          return res.status(404).json({ 
            success: false, 
            message: 'Movimiento no encontrado' 
          });
        }
        
        const movimiento = movimientoDoc.data();
        
        // Actualizar saldo acumulado (revertir el movimiento)
        const montoRevertir = movimiento.tipo === 'ingreso' ? -parseFloat(movimiento.monto) : parseFloat(movimiento.monto);
        await actualizarSaldoAcumulado(movimiento.tipo === 'ingreso' ? 'egreso' : 'ingreso', Math.abs(montoRevertir));
        
        await db.collection(COLECCION_CAJA).doc(movimientoId).delete();
        
        console.log('✅ [CAJA] Movimiento eliminado:', movimientoId);
        res.json({ 
          success: true, 
          message: 'Movimiento eliminado correctamente',
          id: movimientoId
        });
        return true;
        
      } catch (error) {
        console.error('❌ [CAJA] Error al eliminar movimiento:', error);
        res.status(500).json({ 
          success: false, 
          message: 'Error al eliminar movimiento',
          error: error.message 
        });
        return true;
      }
    }

    console.log('❌ [CAJA] Ruta no encontrada:', path);
    return false;
    
  } catch (error) {
    console.error('❌ [CAJA] Error general en caja.routes:', error);
    res.status(500).json({ success: false, message: 'Error en caja', error: error.message });
    return true;
  }
};

const esErrorDeIndiceCompuesto = (error) => {
  if (!error) return false;
  const codigo = error.code || error?.details?.code || '';
  const mensaje = typeof error.message === 'string' ? error.message : '';
  return codigo === 9 || codigo === 'failed-precondition' || codigo === 'FAILED_PRECONDITION' || mensaje.includes('index');
};

const obtenerTimestampMillis = (valor) => {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;
  if (valor instanceof Date) return valor.getTime();
  if (typeof valor.toMillis === 'function') return valor.toMillis();
  if (typeof valor.toDate === 'function') return valor.toDate().getTime();
  if (typeof valor === 'string') {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
  }
  return 0;
};

const normalizarFecha = (valor) => {
  if (!valor) return '';
  if (typeof valor === 'string') {
    return valor.length >= 10 ? valor.slice(0, 10) : valor;
  }
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }
  if (typeof valor.toDate === 'function') {
    return valor.toDate().toISOString().slice(0, 10);
  }
  return '';
};

const obtenerFechaCorta = (valor) => {
  if (!valor) {
    return new Date().toISOString().slice(0, 10);
  }

  if (typeof valor === 'string') {
    return valor.length >= 10 ? valor.slice(0, 10) : valor;
  }

  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }

  if (typeof valor.toDate === 'function') {
    return valor.toDate().toISOString().slice(0, 10);
  }

  const fecha = new Date(valor);
  if (!Number.isNaN(fecha.getTime())) {
    return fecha.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
};

const construirMovimientos = (snapshot, opciones = {}) => {
  const { filtrarPorFecha = null } = opciones;
  const fechaObjetivo = filtrarPorFecha ? obtenerFechaCorta(filtrarPorFecha) : null;
  const movimientos = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (fechaObjetivo) {
      const fechaDoc = normalizarFecha(data?.fecha);
      if (fechaDoc !== fechaObjetivo) {
        return;
      }
    }

    movimientos.push({ id: doc.id, ...data });
  });

  return movimientos;
};

// Función helper para actualizar saldo acumulado
const actualizarSaldoAcumulado = async (tipo, monto) => {
  try {
    const saldoRef = db.collection(COLECCION_SALDO_CAJA).doc('actual');
    const saldoDoc = await saldoRef.get();
    
    let saldoActual = 0;
    if (saldoDoc.exists) {
      saldoActual = saldoDoc.data().saldo || 0;
    }
    
    // Actualizar saldo
    const nuevoSaldo = tipo === 'ingreso' ? saldoActual + monto : saldoActual - monto;
    
    await saldoRef.set({
      saldo: nuevoSaldo,
      fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`💰 [CAJA] Saldo actualizado - Anterior: ${saldoActual}, Nuevo: ${nuevoSaldo}`);
  } catch (error) {
    console.error('❌ [CAJA] Error actualizando saldo acumulado:', error);
  }
};

module.exports = cajaRoutes; 