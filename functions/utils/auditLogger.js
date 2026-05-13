const admin = require('firebase-admin');

function sanitize(value, depth = 0) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (depth > 5) return '[max-depth]';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) out[key] = sanitize(val, depth + 1);
    }
    return out;
  }
  return String(value);
}

function getActor(req) {
  const user = req?.user || {};
  return {
    uid: user.uid || user.id || null,
    email: user.email || null,
    nombre: user.nombre || user.displayName || user.name || user.email || 'Sistema',
    rol: user.rol || user.role || null
  };
}

function buildAuditEvent(req, event = {}) {
  const actor = getActor(req);
  const nowIso = new Date().toISOString();
  return sanitize({
    accion: event.accion || event.action || 'evento',
    modulo: event.modulo || event.module || 'sistema',
    entidad: event.entidad || event.entity || null,
    entidad_id: event.entidad_id || event.entityId || null,
    titulo: event.titulo || event.title || 'Evento de auditoría',
    descripcion: event.descripcion || event.description || '',
    severidad: event.severidad || event.severity || 'info',
    sucursal_id: event.sucursal_id || event.sucursalId || null,
    monto: event.monto != null ? Number(event.monto) : null,
    usuario_id: event.usuario_id || actor.uid,
    usuario_email: event.usuario_email || actor.email,
    usuario_nombre: event.usuario_nombre || actor.nombre,
    usuario_rol: event.usuario_rol || actor.rol,
    metadata: event.metadata || event.detalles || {},
    fecha: admin.firestore.FieldValue.serverTimestamp(),
    fecha_iso: nowIso,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function registrarAuditoria(db, companyId, req, event) {
  if (!db || !companyId) return null;
  const payload = buildAuditEvent(req, event);
  const ref = await db.collection('companies').doc(companyId).collection('auditoria').add(payload);
  return { id: ref.id, ...payload };
}

async function safeAudit(db, companyId, req, event) {
  try {
    return await registrarAuditoria(db, companyId, req, event);
  } catch (error) {
    console.warn('[AUDITORIA] No se pudo registrar evento:', error.message);
    return null;
  }
}

module.exports = {
  buildAuditEvent,
  registrarAuditoria,
  safeAudit,
  sanitize
};
