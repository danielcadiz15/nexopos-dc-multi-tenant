const admin = require('firebase-admin');
const db = admin.firestore();
const { configurarCORS, manejarPreflight } = require('../utils/cors');
const { normalizeMedioPagoCaja } = require('../utils/cajaMedios');
const { incrementarSaldoSucursal, computeSaldoDesdeMovimientos } = require('../utils/cajaSaldo');
const { safeAudit } = require('../utils/auditLogger');

const MEDIOS_RESUMEN = ['efectivo', 'transferencia', 'tarjeta', 'mercadopago', 'credito', 'otros'];

const cajaRoutes = async (req, res, path) => {
  try {
    if (manejarPreflight && manejarPreflight(req, res)) return true;
    configurarCORS && configurarCORS(res);

    console.log('💰 [CAJA] Iniciando procesamiento de ruta:', path);

    const companyId = req.companyId || req.user?.companyId || req.query?.orgId || null;
    console.log(`💰 [CAJA] Procesando ruta: ${req.method} ${path}, companyId: ${companyId}`);

    // POST /caja/movimiento - Agregar movimiento (misma jerarquía que ventas/compras: por sucursal)
    if (path === '/caja/movimiento' && req.method === 'POST') {
      console.log('💰 [CAJA] Agregando movimiento:', req.body);

      const {
        tipo,
        monto,
        concepto,
        usuario,
        observaciones,
        fecha,
        medio_pago: medioRaw,
        sucursal_id: sidBody,
        sucursalId: sidBody2
      } = req.body;
      if (!tipo || !monto || !concepto) {
        console.log('❌ [CAJA] Faltan datos obligatorios');
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios' });
      }

      if (!companyId) {
        console.log('❌ [CAJA] No se proporcionó companyId');
        return res.status(400).json({ success: false, message: 'CompanyId requerido' });
      }

      const sucursalId = sidBody || sidBody2 || req.query.sucursalId || 'principal';
      const fechaISO = fecha ? new Date(fecha).toISOString() : new Date().toISOString();
      const fechaDia = fechaISO.split('T')[0];
      const hora = fechaISO.split('T')[1]?.slice(0, 8) || '';
      const medioNorm = normalizeMedioPagoCaja(medioRaw || 'efectivo');

      const movimiento = {
        tipo,
        monto: parseFloat(monto),
        medio_pago: medioNorm,
        concepto,
        usuario: usuario || req.user?.email || req.user?.uid || null,
        observaciones: observaciones || '',
        fecha: fechaDia,
        hora,
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        referencia_tipo: 'manual',
        sucursal_id: sucursalId,
        orgId: companyId
      };

      const docRef = await db
        .collection('companies')
        .doc(companyId)
        .collection('caja')
        .doc(sucursalId)
        .collection('movimientos')
        .add(movimiento);

      const deltaSaldo = tipo === 'ingreso' ? parseFloat(monto) : -parseFloat(monto);
      await incrementarSaldoSucursal(db, companyId, sucursalId, deltaSaldo);

      await safeAudit(db, companyId, req, {
        accion: 'crear',
        modulo: 'caja',
        entidad: 'movimiento_caja',
        entidad_id: docRef.id,
        titulo: `Movimiento manual de caja: ${tipo}`,
        descripcion: concepto,
        severidad: tipo === 'egreso' ? 'warning' : 'info',
        sucursal_id: sucursalId,
        monto: parseFloat(monto),
        metadata: {
          medio_pago: medioNorm,
          observaciones: observaciones || ''
        }
      });

      console.log('✅ [CAJA] Movimiento guardado con ID:', docRef.id, 'sucursal:', sucursalId);
      res.json({ success: true, id: docRef.id, movimiento });
      return true;
    }

    // GET /caja/movimientos?fecha=YYYY-MM-DD[&sucursalId=...]
    if (path === '/caja/movimientos' && req.method === 'GET') {
      const { fecha, sucursalId } = req.query;
      console.log('💰 [CAJA] Consultando movimientos para fecha:', fecha);

      if (!fecha) {
        console.log('❌ [CAJA] No se proporcionó fecha');
        return res.status(400).json({ success: false, message: 'Debe indicar la fecha (YYYY-MM-DD)' });
      }

      try {
        if (!companyId) {
          return res.status(400).json({ success: false, message: 'CompanyId requerido' });
        }

        const cajaDocId = sucursalId || 'principal';
        const query = db
          .collection('companies')
          .doc(companyId)
          .collection('caja')
          .doc(cajaDocId)
          .collection('movimientos')
          .where('fecha', '==', fecha);

        const snapshot = await query.get();
        const movimientos = [];
        snapshot.forEach((doc) => movimientos.push({ id: doc.id, ...doc.data() }));

        movimientos.sort((a, b) => {
          const ta = a.fechaCreacion?.toMillis?.() || 0;
          const tb = b.fechaCreacion?.toMillis?.() || 0;
          if (ta !== tb) return tb - ta;
          if (a.hora && b.hora) return b.hora.localeCompare(a.hora);
          return 0;
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
          stack: error.stack
        });
        return true;
      }
    }

    // GET /caja/movimientos-acumulados?sucursalId=
    if (path === '/caja/movimientos-acumulados' && req.method === 'GET') {
      console.log('💰 [CAJA] Consultando movimientos acumulados (caja chica)');

      try {
        if (!companyId) {
          return res.status(400).json({ success: false, message: 'CompanyId requerido' });
        }

        const sucursalId = req.query.sucursalId || 'principal';
        const movimientosSnapshot = await db
          .collection('companies')
          .doc(companyId)
          .collection('caja')
          .doc(sucursalId)
          .collection('movimientos')
          .orderBy('fechaCreacion', 'desc')
          .limit(200)
          .get();

        const movimientos = [];
        movimientosSnapshot.forEach((doc) => {
          movimientos.push({ id: doc.id, ...doc.data() });
        });

        console.log(`✅ [CAJA] Encontrados ${movimientos.length} movimientos acumulados (${sucursalId})`);
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

    // GET /caja/resumen?fecha=YYYY-MM-DD[&sucursalId=...]
    if (path === '/caja/resumen' && req.method === 'GET') {
      const { fecha, sucursalId } = req.query;
      console.log('💰 [CAJA] Calculando resumen para fecha:', fecha);

      if (!fecha) {
        return res.status(400).json({ success: false, message: 'Debe indicar la fecha (YYYY-MM-DD)' });
      }

      try {
        if (!companyId) {
          return res.status(400).json({ success: false, message: 'CompanyId requerido' });
        }

        const cajaDocId = sucursalId || 'principal';
        const query = db
          .collection('companies')
          .doc(companyId)
          .collection('caja')
          .doc(cajaDocId)
          .collection('movimientos')
          .where('fecha', '==', fecha);

        const movimientosSnapshot = await query.get();

        let ingresos = 0;
        let egresos = 0;
        const ingresosPorMedio = Object.fromEntries(MEDIOS_RESUMEN.map((k) => [k, 0]));
        const egresosPorMedio = Object.fromEntries(MEDIOS_RESUMEN.map((k) => [k, 0]));

        movimientosSnapshot.forEach((doc) => {
          const mov = doc.data();
          const monto = parseFloat(mov.monto) || 0;
          const key = normalizeMedioPagoCaja(mov.medio_pago);
          if (mov.tipo === 'ingreso') {
            ingresos += monto;
            if (ingresosPorMedio[key] !== undefined) ingresosPorMedio[key] += monto;
            else ingresosPorMedio.otros += monto;
          }
          if (mov.tipo === 'egreso') {
            egresos += monto;
            if (egresosPorMedio[key] !== undefined) egresosPorMedio[key] += monto;
            else egresosPorMedio.otros += monto;
          }
        });

        const saldo = ingresos - egresos;
        console.log(`✅ [CAJA] Resumen - Ingresos: ${ingresos}, Egresos: ${egresos}, Saldo: ${saldo}`);

        res.json({ success: true, ingresos, egresos, saldo, ingresosPorMedio, egresosPorMedio });
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

    // GET /caja/saldo-acumulado?sucursalId=
    if (path === '/caja/saldo-acumulado' && req.method === 'GET') {
      console.log('💰 [CAJA] Calculando saldo acumulado de caja chica');

      try {
        if (!companyId) {
          return res.status(400).json({ success: false, message: 'CompanyId requerido' });
        }

        const sucursalId = req.query.sucursalId || 'principal';
        const branchRef = db.collection('companies').doc(companyId).collection('caja').doc(sucursalId);
        const branchDoc = await branchRef.get();

        let saldoAcumulado = branchDoc.exists ? parseFloat(branchDoc.data().saldo_acumulado) : NaN;
        if (!Number.isFinite(saldoAcumulado)) {
          saldoAcumulado = await computeSaldoDesdeMovimientos(db, companyId, sucursalId);
          await branchRef.set(
            {
              saldo_acumulado: saldoAcumulado,
              fecha_actualizacion_saldo: admin.firestore.FieldValue.serverTimestamp()
            },
            { merge: true }
          );
        }

        console.log(`✅ [CAJA] Saldo acumulado (${sucursalId}): ${saldoAcumulado}`);
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

    // POST /caja/verificar-saldo
    if (path === '/caja/verificar-saldo' && req.method === 'POST') {
      const { saldoFisico } = req.body;
      console.log('💰 [CAJA] Verificando saldo físico:', saldoFisico);

      if (saldoFisico === undefined || saldoFisico === null) {
        return res.status(400).json({ success: false, message: 'Debe proporcionar el saldo físico' });
      }

      try {
        if (!companyId) {
          return res.status(400).json({ success: false, message: 'CompanyId requerido' });
        }

        const sucursalId = req.query.sucursalId || 'principal';
        const saldoSistema = await computeSaldoDesdeMovimientos(db, companyId, sucursalId);
        const diferencia = parseFloat(saldoFisico) - saldoSistema;

        await db
          .collection('companies')
          .doc(companyId)
          .collection('caja')
          .doc(sucursalId)
          .collection('verificaciones')
          .add({
            saldoFisico: parseFloat(saldoFisico),
            saldoSistema,
            diferencia,
            fechaVerificacion: admin.firestore.FieldValue.serverTimestamp(),
            usuario: req.body.usuario || req.user?.email || 'sistema',
            companyId,
            sucursal_id: sucursalId
          });

        console.log(`✅ [CAJA] Verificación guardada - Físico: ${saldoFisico}, Sistema: ${saldoSistema}`);
        res.json({
          success: true,
          saldoFisico: parseFloat(saldoFisico),
          saldoSistema,
          diferencia,
          coinciden: Math.abs(diferencia) < 0.005
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

    // DELETE /caja/movimiento/:id?sucursalId=
    if (path.match(/^\/caja\/movimiento\/[^\/]+$/) && req.method === 'DELETE') {
      const movimientoId = path.split('/').pop();
      const qSuc = req.query.sucursalId || 'principal';
      console.log('💰 [CAJA] Eliminando movimiento:', movimientoId, 'sucursal query:', qSuc);

      try {
        if (!companyId) {
          return res.status(400).json({ success: false, message: 'CompanyId requerido' });
        }

        const tryRefs = [qSuc, 'principal'].filter((v, i, a) => a.indexOf(v) === i);
        let movimientoRef = null;
        let movimientoDoc = null;
        let usedSucursal = null;

        for (const sid of tryRefs) {
          const ref = db
            .collection('companies')
            .doc(companyId)
            .collection('caja')
            .doc(sid)
            .collection('movimientos')
            .doc(movimientoId);
          const doc = await ref.get();
          if (doc.exists) {
            movimientoRef = ref;
            movimientoDoc = doc;
            usedSucursal = sid;
            break;
          }
        }

        if (!movimientoDoc || !movimientoDoc.exists) {
          return res.status(404).json({
            success: false,
            message: 'Movimiento no encontrado'
          });
        }

        const movimiento = movimientoDoc.data();
        const monto = parseFloat(movimiento.monto) || 0;
        const rev = movimiento.tipo === 'ingreso' ? -monto : monto;
        await incrementarSaldoSucursal(db, companyId, usedSucursal, rev);

        await movimientoRef.delete();

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

module.exports = cajaRoutes;
