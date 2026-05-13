const admin = require('firebase-admin');
const db = admin.firestore();
const { registrarAuditoria } = require('../utils/auditLogger');

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function serializeAudit(doc) {
  const data = doc.data() || {};
  const fechaMs = timestampToMillis(data.fecha) || timestampToMillis(data.createdAt) || timestampToMillis(data.fecha_iso);
  return {
    id: doc.id,
    ...data,
    fecha: fechaMs ? new Date(fechaMs).toISOString() : data.fecha_iso || null,
    createdAt: timestampToMillis(data.createdAt) ? new Date(timestampToMillis(data.createdAt)).toISOString() : null
  };
}

function applyFilters(items, filters) {
  const desde = filters.fecha_inicio ? new Date(`${filters.fecha_inicio}T00:00:00`).getTime() : null;
  const hasta = filters.fecha_fin ? new Date(`${filters.fecha_fin}T23:59:59`).getTime() : null;
  return items.filter((item) => {
    const fecha = timestampToMillis(item.fecha);
    if (filters.modulo && item.modulo !== filters.modulo) return false;
    if (filters.accion && item.accion !== filters.accion) return false;
    if (filters.sucursal_id && item.sucursal_id !== filters.sucursal_id) return false;
    if (filters.usuario && !String(item.usuario_email || item.usuario_nombre || '').toLowerCase().includes(filters.usuario.toLowerCase())) {
      return false;
    }
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
  });
}

function buildSummary(items) {
  const byModule = {};
  const byAction = {};
  const bySeverity = {};
  for (const item of items) {
    byModule[item.modulo || 'sistema'] = (byModule[item.modulo || 'sistema'] || 0) + 1;
    byAction[item.accion || 'evento'] = (byAction[item.accion || 'evento'] || 0) + 1;
    bySeverity[item.severidad || 'info'] = (bySeverity[item.severidad || 'info'] || 0) + 1;
  }
  return {
    total: items.length,
    byModule,
    byAction,
    bySeverity,
    critical: (bySeverity.critical || 0) + (bySeverity.alta || 0),
    warnings: bySeverity.warning || bySeverity.media || 0
  };
}

const auditoriaRoutes = async (req, res, path) => {
  try {
    const companyId = req.companyId || req.user?.companyId || req.query?.orgId || null;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'CompanyId requerido' });
    }

    if (path === '/auditoria' && req.method === 'POST') {
      const event = await registrarAuditoria(db, companyId, req, req.body || {});
      return res.status(201).json({
        success: true,
        data: event,
        message: 'Evento de auditoría registrado'
      });
    }

    if (path === '/auditoria' && req.method === 'GET') {
      const rawLimit = Number(req.query.limit || 200);
      const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 200, 1), 500);
      const snap = await db
        .collection('companies')
        .doc(companyId)
        .collection('auditoria')
        .orderBy('fecha', 'desc')
        .limit(limit)
        .get();

      const serialized = snap.docs.map(serializeAudit);
      const filtered = applyFilters(serialized, req.query || {});
      return res.json({
        success: true,
        data: filtered,
        total: filtered.length,
        resumen: buildSummary(filtered),
        message: 'Auditoría obtenida correctamente'
      });
    }

    return false;
  } catch (error) {
    console.error('[AUDITORIA] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar auditoría',
      error: error.message
    });
    return true;
  }
};

module.exports = auditoriaRoutes;
