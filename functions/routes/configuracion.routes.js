// functions/routes/configuracion.routes.js
// Configuración empresarial multi-tenant: companies/{orgId}/config/empresa (espejo en tenants)
const admin = require('firebase-admin');
const db = admin.firestore();

function emptyEmpresaData() {
  return {
    razon_social: '',
    nombre_fantasia: '',
    slogan: '',
    logo_url: '',
    cuit: '',
    condicion_iva: 'Responsable Inscripto',
    ingresos_brutos: '',
    punto_venta: '',
    direccion: {
      calle: '',
      localidad: '',
      provincia: '',
      codigo_postal: '',
      pais: ''
    },
    contacto: {
      telefono_principal: '',
      telefono_secundario: '',
      email: '',
      website: ''
    },
    facturacion: {
      numeracion_inicial: 1,
      serie_actual: 'A',
      formato_predeterminado: 'termico',
      mostrar_logo: true,
      tamano_logo: 'mediano',
      posicion_logo: 'centro',
      imprimir_ticket_automaticamente: false
    },
    caja_modulos: {
      clientes: true,
      alerta_deudas: true,
      pago_deudas: true,
      ver_comprobante_deuda: true
    },
    caja_apk_url: '',
    activo: true
  };
}

function mergeEmpresaData(raw) {
  const base = emptyEmpresaData();
  if (!raw || typeof raw !== 'object') return base;
  const d = { ...base, ...raw };
  d.direccion = { ...base.direccion, ...(raw.direccion || {}) };
  d.contacto = { ...base.contacto, ...(raw.contacto || {}) };
  d.facturacion = { ...base.facturacion, ...(raw.facturacion || {}) };
  d.caja_modulos = { ...base.caja_modulos, ...(raw.caja_modulos || {}) };
  return d;
}

function patchEmpresa(existingMerged, patch) {
  if (!patch || typeof patch !== 'object') return existingMerged;
  const out = { ...existingMerged, ...patch };
  if (patch.direccion) out.direccion = { ...existingMerged.direccion, ...patch.direccion };
  if (patch.contacto) out.contacto = { ...existingMerged.contacto, ...patch.contacto };
  if (patch.facturacion) out.facturacion = { ...existingMerged.facturacion, ...patch.facturacion };
  if (patch.caja_modulos) out.caja_modulos = { ...existingMerged.caja_modulos, ...patch.caja_modulos };
  return out;
}

/**
 * orgId solo desde sesión (claims / usuariosOrg). Si viene ?orgId y no coincide → 403.
 * No se usa orgId de query como sustituto (evita suplantación).
 */
function resolveCompanyId(req, res) {
  const fromAuth = req.companyId || null;
  const q = req.query?.orgId;
  const fromQuery = typeof q === 'string' && q.trim() ? q.trim() : null;

  if (fromQuery && fromAuth && fromQuery !== fromAuth) {
    res.status(403).json({
      success: false,
      message: 'El orgId de la URL no coincide con tu sesión'
    });
    return null;
  }

  return fromAuth || null;
}

async function readEmpresaDoc(companyId) {
  const compRef = db.collection('companies').doc(companyId).collection('config').doc('empresa');
  let snap = await compRef.get();
  if (snap.exists) return snap.data();
  const tenRef = db.collection('tenants').doc(companyId).collection('config').doc('empresa');
  snap = await tenRef.get();
  if (snap.exists) return snap.data();
  return null;
}

async function writeEmpresaDoc(companyId, payload) {
  const compRef = db.collection('companies').doc(companyId).collection('config').doc('empresa');
  const tenRef = db.collection('tenants').doc(companyId).collection('config').doc('empresa');

  const prev = await readEmpresaDoc(companyId);
  const ts = admin.firestore.FieldValue.serverTimestamp();
  const fecha_creacion = prev?.fecha_creacion || payload.fecha_creacion || ts;

  const data = {
    ...payload,
    fecha_creacion,
    fecha_actualizacion: ts,
    activo: true
  };

  await compRef.set(data, { merge: true });
  await tenRef.set(data, { merge: true });

  const after = await readEmpresaDoc(companyId);
  return mergeEmpresaData(after || data);
}

const configuracionRoutes = async (req, res, path) => {
  try {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.status(200).send('');
      return true;
    }

    const pathParts = path.split('/').filter((p) => p);

    // GET /configuracion/empresa
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[1] === 'empresa') {
      try {
        if (!req.user) {
          res.status(401).json({ success: false, message: 'Autenticación requerida' });
          return true;
        }

        const companyId = resolveCompanyId(req, res);
        if (companyId === null && res.headersSent) return true;

        if (!companyId) {
          console.log('[CONFIGURACION] Sin orgId — plantilla vacía');
          const data = mergeEmpresaData(null);
          res.json({ success: true, data, message: 'Sin empresa activa' });
          return true;
        }

        const stored = await readEmpresaDoc(companyId);
        const merged = mergeEmpresaData(stored || {});

        res.json({
          success: true,
          data: merged,
          message: stored ? 'Configuración obtenida' : 'Configuración inicial (vacía)'
        });
        return true;
      } catch (error) {
        console.error('[CONFIGURACION] Error GET empresa:', error);
        res.status(500).json({ success: false, error: error.message });
        return true;
      }
    }

    // POST /configuracion/empresa
    if (req.method === 'POST' && pathParts.length === 2 && pathParts[1] === 'empresa') {
      try {
        if (!req.user) {
          res.status(401).json({ success: false, message: 'Autenticación requerida' });
          return true;
        }

        const companyId = resolveCompanyId(req, res);
        if (companyId === null && res.headersSent) return true;

        if (!companyId) {
          res.status(400).json({ success: false, message: 'No hay empresa activa. Creá o uníte a una organización primero.' });
          return true;
        }

        const nuevaConfig = req.body || {};
        const existingRaw = await readEmpresaDoc(companyId);
        const merged = patchEmpresa(mergeEmpresaData(existingRaw), nuevaConfig);

        console.log('[CONFIGURACION] POST empresa org', companyId);
        const data = await writeEmpresaDoc(companyId, merged);

        res.json({
          success: true,
          data: { id: 'empresa', ...data },
          message: 'Configuración empresarial guardada'
        });
        return true;
      } catch (error) {
        console.error('[CONFIGURACION] Error POST:', error);
        res.status(500).json({ success: false, message: 'Error al crear configuración', error: error.message });
        return true;
      }
    }

    // PUT /configuracion/empresa
    if (req.method === 'PUT' && pathParts.length === 2 && pathParts[1] === 'empresa') {
      try {
        if (!req.user) {
          res.status(401).json({ success: false, message: 'Autenticación requerida' });
          return true;
        }

        const companyId = resolveCompanyId(req, res);
        if (companyId === null && res.headersSent) return true;

        if (!companyId) {
          res.status(400).json({ success: false, message: 'No hay empresa activa.' });
          return true;
        }

        const datosActualizados = req.body || {};
        console.log('[CONFIGURACION] PUT empresa org', companyId);

        const existingRaw = await readEmpresaDoc(companyId);
        const merged = patchEmpresa(mergeEmpresaData(existingRaw), datosActualizados);

        const data = await writeEmpresaDoc(companyId, merged);

        res.json({
          success: true,
          data: { id: 'empresa', ...data },
          message: 'Configuración actualizada'
        });
        return true;
      } catch (error) {
        console.error('[CONFIGURACION] Error PUT:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar', error: error.message });
        return true;
      }
    }

    // POST /configuracion/upload-logo (sin cambio de tenant; temporal)
    if (req.method === 'POST' && pathParts.length === 2 && pathParts[1] === 'upload-logo') {
      try {
        const { logoData, fileName, mimeType } = req.body;

        if (!logoData || !fileName || !mimeType) {
          res.status(400).json({ success: false, message: 'Faltan datos del archivo' });
          return true;
        }

        const logoUrlTemporal = logoData.startsWith('data:') ? logoData : `data:${mimeType};base64,${logoData}`;

        res.json({
          success: true,
          data: logoUrlTemporal,
          message: 'Logo guardado temporalmente'
        });
        return true;
      } catch (error) {
        console.error('[CONFIGURACION] Error upload-logo:', error);
        res.status(500).json({ success: false, message: 'Error al procesar logo', error: error.message });
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[CONFIGURACION] Error en rutas:', error);
    res.status(500).json({ success: false, message: 'Error interno', error: error.message });
    return true;
  }
};

module.exports = configuracionRoutes;
