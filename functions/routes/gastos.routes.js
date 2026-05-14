const admin = require('firebase-admin');
const db = admin.firestore();
const { configurarCORS, manejarPreflight } = require('../utils/cors');
const { normalizeMedioPagoCaja } = require('../utils/cajaMedios');
const { incrementarSaldoSucursal } = require('../utils/cajaSaldo');

function parseDateLike(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value.toDate) return value.toDate();
  return null;
}

function startOfDay(dateLike) {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(dateLike) {
  const d = new Date(dateLike);
  d.setHours(23, 59, 59, 999);
  return d;
}

function normalizeOrigenFondos(raw) {
  const v = String(raw || 'externo').trim().toLowerCase();
  return v === 'caja' ? 'caja' : 'externo';
}

function parseMonto(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

module.exports = async function gastosRoutes(req, res, path) {
  try {
    if (manejarPreflight && manejarPreflight(req, res)) return true;
    configurarCORS && configurarCORS(res);

    const companyId = req.companyId || req.user?.companyId || req.query?.orgId || null;
    if (!companyId) {
      res.status(400).json({ success: false, message: 'CompanyId requerido' });
      return true;
    }

    // POST /gastos
    if (path === '/gastos' && req.method === 'POST') {
      const {
        fecha,
        categoria,
        concepto,
        monto,
        origen_fondos,
        medio_pago,
        incluir_en_costos,
        sucursal_id,
        observaciones
      } = req.body || {};

      const fechaDate = parseDateLike(fecha) || new Date();
      const montoNum = parseMonto(monto);
      if (!concepto || montoNum <= 0) {
        res.status(400).json({
          success: false,
          message: 'concepto y monto mayor a 0 son requeridos'
        });
        return true;
      }

      const origen = normalizeOrigenFondos(origen_fondos);
      const sucursalId = sucursal_id || req.query?.sucursalId || 'principal';
      const medioNorm = normalizeMedioPagoCaja(medio_pago || 'efectivo');
      const fechaISO = fechaDate.toISOString();
      const fechaDia = fechaISO.split('T')[0];
      const hora = fechaISO.split('T')[1]?.slice(0, 8) || '';

      const gastoData = {
        fecha: fechaDia,
        fecha_iso: fechaISO,
        categoria: String(categoria || 'general').trim().toLowerCase(),
        concepto: String(concepto || '').trim(),
        monto: montoNum,
        origen_fondos: origen,
        medio_pago: medioNorm,
        incluir_en_costos: incluir_en_costos !== false,
        sucursal_id: sucursalId,
        observaciones: String(observaciones || '').trim(),
        usuario: req.user?.email || req.user?.uid || null,
        fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
        orgId: companyId
      };

      const gastoRef = await db
        .collection('companies')
        .doc(companyId)
        .collection('gastos')
        .add(gastoData);

      let movimientoCajaId = null;
      if (origen === 'caja') {
        const movData = {
          tipo: 'egreso',
          monto: montoNum,
          medio_pago: medioNorm,
          concepto: `Gasto: ${gastoData.concepto}`,
          usuario: req.user?.email || req.user?.uid || null,
          observaciones: gastoData.observaciones || '',
          fecha: fechaDia,
          hora,
          fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
          referencia_tipo: 'gasto',
          referencia_id: gastoRef.id,
          sucursal_id: sucursalId,
          orgId: companyId
        };
        const movRef = await db
          .collection('companies')
          .doc(companyId)
          .collection('caja')
          .doc(sucursalId)
          .collection('movimientos')
          .add(movData);
        movimientoCajaId = movRef.id;
        await incrementarSaldoSucursal(db, companyId, sucursalId, -montoNum);
        await gastoRef.set({ caja_movimiento_id: movRef.id }, { merge: true });
      }

      res.json({
        success: true,
        id: gastoRef.id,
        caja_movimiento_id: movimientoCajaId
      });
      return true;
    }

    // GET /gastos
    if (path === '/gastos' && req.method === 'GET') {
      const {
        fecha_inicio,
        fecha_fin,
        categoria,
        origen_fondos,
        incluir_en_costos
      } = req.query || {};

      const fIni = fecha_inicio ? startOfDay(fecha_inicio) : null;
      const fFin = fecha_fin ? endOfDay(fecha_fin) : null;
      const categoriaNorm = categoria ? String(categoria).trim().toLowerCase() : '';
      const origenNorm = origen_fondos ? normalizeOrigenFondos(origen_fondos) : '';
      const incluirFiltro = incluir_en_costos === 'true'
        ? true
        : incluir_en_costos === 'false'
          ? false
          : null;

      const snap = await db
        .collection('companies')
        .doc(companyId)
        .collection('gastos')
        .orderBy('fechaCreacion', 'desc')
        .limit(1000)
        .get();

      const gastos = [];
      snap.forEach((doc) => {
        const data = doc.data() || {};
        const fechaDoc = parseDateLike(data.fecha_iso || data.fecha || data.fechaCreacion);
        if (!fechaDoc) return;
        if (fIni && fechaDoc < fIni) return;
        if (fFin && fechaDoc > fFin) return;
        if (categoriaNorm && String(data.categoria || '').toLowerCase() !== categoriaNorm) return;
        if (origenNorm && normalizeOrigenFondos(data.origen_fondos) !== origenNorm) return;
        if (incluirFiltro !== null && Boolean(data.incluir_en_costos !== false) !== incluirFiltro) return;
        gastos.push({
          id: doc.id,
          ...data
        });
      });

      res.json({ success: true, data: gastos, total: gastos.length });
      return true;
    }

    // DELETE /gastos/:id
    if (path.match(/^\/gastos\/[^/]+$/) && req.method === 'DELETE') {
      const gastoId = path.split('/').pop();
      const gastoRef = db
        .collection('companies')
        .doc(companyId)
        .collection('gastos')
        .doc(gastoId);
      const gastoDoc = await gastoRef.get();
      if (!gastoDoc.exists) {
        res.status(404).json({ success: false, message: 'Gasto no encontrado' });
        return true;
      }

      const gasto = gastoDoc.data() || {};
      const origen = normalizeOrigenFondos(gasto.origen_fondos);
      const sucursalId = gasto.sucursal_id || 'principal';
      const montoNum = parseMonto(gasto.monto);

      if (origen === 'caja' && gasto.caja_movimiento_id) {
        const movRef = db
          .collection('companies')
          .doc(companyId)
          .collection('caja')
          .doc(sucursalId)
          .collection('movimientos')
          .doc(gasto.caja_movimiento_id);
        const movDoc = await movRef.get();
        if (movDoc.exists) {
          await movRef.delete();
          await incrementarSaldoSucursal(db, companyId, sucursalId, montoNum);
        }
      }

      await gastoRef.delete();
      res.json({ success: true, id: gastoId });
      return true;
    }

    // GET /gastos/reporte
    if (path === '/gastos/reporte' && req.method === 'GET') {
      const {
        fecha_inicio,
        fecha_fin
      } = req.query || {};
      const fIni = fecha_inicio ? startOfDay(fecha_inicio) : null;
      const fFin = fecha_fin ? endOfDay(fecha_fin) : null;

      const snap = await db
        .collection('companies')
        .doc(companyId)
        .collection('gastos')
        .orderBy('fechaCreacion', 'desc')
        .limit(2000)
        .get();

      let total = 0;
      let totalCaja = 0;
      let totalExterno = 0;
      let totalEnCostos = 0;
      const porCategoria = {};
      const porDia = {};

      snap.forEach((doc) => {
        const g = doc.data() || {};
        const fechaDoc = parseDateLike(g.fecha_iso || g.fecha || g.fechaCreacion);
        if (!fechaDoc) return;
        if (fIni && fechaDoc < fIni) return;
        if (fFin && fechaDoc > fFin) return;

        const monto = parseMonto(g.monto);
        const origen = normalizeOrigenFondos(g.origen_fondos);
        const categoria = String(g.categoria || 'general').toLowerCase();
        const fechaKey = (g.fecha || fechaDoc.toISOString().split('T')[0]);
        const incluirCostos = g.incluir_en_costos !== false;

        total += monto;
        if (origen === 'caja') totalCaja += monto;
        else totalExterno += monto;
        if (incluirCostos) totalEnCostos += monto;

        if (!porCategoria[categoria]) porCategoria[categoria] = { categoria, total: 0, cantidad: 0 };
        porCategoria[categoria].total += monto;
        porCategoria[categoria].cantidad += 1;

        if (!porDia[fechaKey]) porDia[fechaKey] = { fecha: fechaKey, total: 0, cantidad: 0 };
        porDia[fechaKey].total += monto;
        porDia[fechaKey].cantidad += 1;
      });

      res.json({
        success: true,
        resumen: {
          total,
          total_caja: totalCaja,
          total_externo: totalExterno,
          total_incluir_costos: totalEnCostos
        },
        por_categoria: Object.values(porCategoria).sort((a, b) => b.total - a.total),
        por_dia: Object.values(porDia).sort((a, b) => a.fecha.localeCompare(b.fecha))
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ [GASTOS] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error en gastos',
        error: error.message
      });
    }
    return true;
  }
};
