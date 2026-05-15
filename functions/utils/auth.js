// functions/utils/auth.js - Middleware de autenticación Firebase
const admin = require('firebase-admin');
const { enforceSessionAccess } = require('./subscriptionAccess');
const DEMO_EMAIL_RE = /@nexopos\.demo\.local$/i;

async function isDemoOrg(orgId) {
  const id = String(orgId || '').trim();
  if (!id) return false;
  try {
    const companyLic = await admin
      .firestore()
      .collection('companies')
      .doc(id)
      .collection('config')
      .doc('license')
      .get();
    const license = companyLic.exists ? companyLic.data() || {} : {};
    if (!companyLic.exists) {
      const legacyLic = await admin.firestore().collection('licenses').doc(id).get();
      if (legacyLic.exists) {
        Object.assign(license, legacyLic.data() || {});
      }
    }
    const billingModel = String(license?.billingModel || '').trim().toLowerCase();
    return license?.demo === true || billingModel.startsWith('demo');
  } catch {
    return false;
  }
}

async function choosePreferredCompanyId(companyIds, preferredCompanyId, userEmail) {
  const ids = Array.from(new Set((companyIds || []).map((v) => String(v || '').trim()).filter(Boolean)));
  if (!ids.length) return preferredCompanyId || null;
  const isDemoEmail = DEMO_EMAIL_RE.test(String(userEmail || '').trim());
  if (isDemoEmail) return preferredCompanyId || ids[0];

  const scored = await Promise.all(
    ids.map(async (id) => ({
      id,
      demo: await isDemoOrg(id)
    }))
  );
  const preferred = String(preferredCompanyId || '').trim();
  const preferredInfo = scored.find((item) => item.id === preferred);
  if (preferredInfo && preferredInfo.demo === false) return preferredInfo.id;
  const nonDemo = scored.find((item) => item.demo === false);
  if (nonDemo) return nonDemo.id;
  return preferred || ids[0];
}

async function collectUserCompanyCandidates(uid, email, preferredCompanyId) {
  const candidates = [];
  const pushCandidate = (companyId, userData = {}) => {
    const id = String(companyId || '').trim();
    if (!id) return;
    candidates.push({
      companyId: id,
      user: userData && typeof userData === 'object' ? userData : {}
    });
  };

  // 1) companies/{org}/usuarios (por uid + email)
  const byUid = await admin
    .firestore()
    .collectionGroup('usuarios')
    .where('uid', '==', uid)
    .get();
  byUid.docs.forEach((snap) => pushCandidate(snap.ref.parent.parent?.id, snap.data() || {}));

  const emailNorm = String(email || '').trim().toLowerCase();
  if (emailNorm) {
    const byEmail = await admin
      .firestore()
      .collectionGroup('usuarios')
      .where('email', '==', emailNorm)
      .get();
    byEmail.docs.forEach((snap) => pushCandidate(snap.ref.parent.parent?.id, snap.data() || {}));
  }

  // 2) owner directo en companies (caso histórico)
  const byOwnerUid = await admin.firestore().collection('companies').where('ownerUid', '==', uid).get();
  byOwnerUid.docs.forEach((snap) => pushCandidate(snap.id, {}));

  if (emailNorm) {
    const byOwnerEmail = await admin
      .firestore()
      .collection('companies')
      .where('ownerEmail', '==', emailNorm)
      .get();
    byOwnerEmail.docs.forEach((snap) => pushCandidate(snap.id, {}));
  }

  // 3) usuariosOrg actual como candidato (aunque esté mal seteado, sirve para no perder contexto)
  const uo = await admin.firestore().collection('usuariosOrg').doc(uid).get();
  if (uo.exists) {
    const orgId = String(uo.data()?.orgId || '').trim();
    if (orgId) pushCandidate(orgId, {});
  }

  // 4) preferido actual (claims/query) también entra a evaluación
  if (preferredCompanyId) pushCandidate(preferredCompanyId, {});

  // dedupe preservando primer user-data útil
  const dedup = new Map();
  for (const item of candidates) {
    if (!dedup.has(item.companyId)) {
      dedup.set(item.companyId, item.user || {});
      continue;
    }
    const prev = dedup.get(item.companyId) || {};
    if (Object.keys(prev).length === 0 && item.user && Object.keys(item.user).length > 0) {
      dedup.set(item.companyId, item.user);
    }
  }
  return Array.from(dedup.entries()).map(([companyId, user]) => ({ companyId, user }));
}

async function resolveRequestedCompanyIfAllowed(uid, email, requestedCompanyId) {
  const companyId = String(requestedCompanyId || '').trim();
  if (!companyId) return null;
  const emailNorm = String(email || '').trim().toLowerCase();
  try {
    const byUidDoc = await admin
      .firestore()
      .doc(`companies/${companyId}/usuarios/${uid}`)
      .get();
    if (byUidDoc.exists) {
      return { companyId, user: byUidDoc.data() || {} };
    }

    if (emailNorm) {
      const byEmail = await admin
        .firestore()
        .collection('companies')
        .doc(companyId)
        .collection('usuarios')
        .where('email', '==', emailNorm)
        .limit(1)
        .get();
      if (!byEmail.empty) {
        return { companyId, user: byEmail.docs[0].data() || {} };
      }
    }

    const companyDoc = await admin.firestore().collection('companies').doc(companyId).get();
    if (!companyDoc.exists) return null;
    const ownerUid = String(companyDoc.data()?.ownerUid || '').trim();
    const ownerEmail = String(companyDoc.data()?.ownerEmail || '').trim().toLowerCase();
    if ((ownerUid && ownerUid === uid) || (ownerEmail && ownerEmail === emailNorm)) {
      return { companyId, user: {} };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Middleware para verificar autenticación Firebase
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
async function authenticateUser(req, res, next) {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [AUTH] No se encontró token de autorización');
      req.user = null;
      req.companyId = null;
      return next();
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      console.log('❌ [AUTH] Token vacío');
      req.user = null;
      req.companyId = null;
      return next();
    }
    
    try {
      // Verificar el token con Firebase Admin
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      console.log('✅ [AUTH] Token verificado para usuario:', decodedToken.email);
      
      // companyId desde custom claims (flujo multi-tenant)
      let companyId = decodedToken.companyId || decodedToken.orgId || null;
      req.companyId = companyId;
      
      // Obtener información adicional del usuario desde Firestore (multi-tenant)
      const userOrgDoc = await admin.firestore()
        .collection('usuariosOrg')
        .doc(decodedToken.uid)
        .get();
      
      let userData = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        nombre: decodedToken.name || decodedToken.nombre || '',
        rol: 'usuario', // valor por defecto
        companyId
      };
      
      if (userOrgDoc.exists) {
        const userOrg = userOrgDoc.data();
        userData = {
          ...userData,
          ...userOrg,
          orgId: userOrg.orgId || companyId
        };
        
        // Actualizar companyId si se obtuvo de usuariosOrg
        if (userOrg.orgId) {
          req.companyId = userOrg.orgId;
          userData.companyId = userOrg.orgId;
        }
      }

      // Resolver empresa preferida cuando el usuario tenga múltiples organizaciones
      // (ej. demo + empresa real), priorizando no-demo para cuentas no demo.
      const requestedOrgId =
        String(req.query?.orgId || req.body?.orgId || req.headers?.['x-nexo-org-id'] || '')
          .trim();
      if (requestedOrgId) {
        const requested = await resolveRequestedCompanyIfAllowed(
          decodedToken.uid,
          decodedToken.email || '',
          requestedOrgId
        );
        if (requested?.companyId) {
          req.companyId = requested.companyId;
          companyId = requested.companyId;
          userData = {
            ...userData,
            ...(requested.user || {}),
            uid: decodedToken.uid,
            email: decodedToken.email,
            companyId: requested.companyId,
            orgId: requested.companyId
          };
        }
      }

      const shouldResolvePreferredCompany =
        Boolean(decodedToken.email) &&
        (
          !req.companyId ||
          (!DEMO_EMAIL_RE.test(String(decodedToken.email || '').trim()) && (await isDemoOrg(req.companyId)))
        );
      if (shouldResolvePreferredCompany) {
        try {
          const companies = await collectUserCompanyCandidates(
            decodedToken.uid,
            decodedToken.email || '',
            req.companyId || companyId || userData.companyId || null
          );
          const companyIds = companies.map((item) => item.companyId);

          const preferredCompanyId = await choosePreferredCompanyId(
            companyIds,
            req.companyId || companyId || userData.companyId || null,
            decodedToken.email
          );

          if (preferredCompanyId) {
            const selected =
              companies.find((item) => item.companyId === preferredCompanyId)?.user ||
              {};
            req.companyId = preferredCompanyId;
            companyId = preferredCompanyId;
            userData = {
              ...userData,
              ...selected,
              uid: decodedToken.uid,
              email: decodedToken.email,
              companyId: preferredCompanyId,
              orgId: preferredCompanyId
            };

            await admin.firestore().collection('usuariosOrg').doc(decodedToken.uid).set({
              uid: decodedToken.uid,
              orgId: preferredCompanyId,
              roles: [selected.rol_id || selected.role || selected.rol || 'empleado'],
              sucursales: Array.isArray(selected.sucursales) ? selected.sucursales : [],
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            await admin.auth().setCustomUserClaims(decodedToken.uid, {
              companyId: preferredCompanyId,
              orgId: preferredCompanyId,
              rol: selected.rol || decodedToken.rol || 'Empleado',
              role: selected.rol_id || decodedToken.role || 'empleado',
              rolId: selected.rol_id || decodedToken.rolId || 'empleado',
              activo: selected.activo !== false
            });

            console.log('✅ [AUTH] Empresa preferida detectada por usuario/email:', {
              email: decodedToken.email,
              companyId: preferredCompanyId
            });
          }
        } catch (lookupError) {
          console.warn('⚠️ [AUTH] No se pudo detectar empresa por email:', lookupError.message);
        }
      }

      // NUEVO: Leer permisos y rol a nivel de empresa para que los cambios a roles/permiso sean efectivos sin relogin
      try {
        const effectiveCompanyId = req.companyId || userData.companyId || companyId;
        if (effectiveCompanyId) {
          const companyUserRef = admin.firestore()
            .doc(`companies/${effectiveCompanyId}/usuarios/${decodedToken.uid}`);
          const companyUserSnap = await companyUserRef.get();
          if (companyUserSnap.exists) {
            const companyUser = companyUserSnap.data();
            // Fusionar datos de empresa (rol/permisos/activo/sucursales)
            userData.rol = companyUser.rol || userData.rol;
            userData.permisos = companyUser.permisos || userData.permisos || {};
            if (typeof companyUser.activo === 'boolean') {
              userData.activo = companyUser.activo;
            }
            if (Array.isArray(companyUser.sucursales)) {
              userData.sucursales = companyUser.sucursales;
            }
            // Nombre / documento para integraciones (p. ej. pagador en Mercado Pago Checkout)
            if (companyUser.nombre != null && String(companyUser.nombre).trim()) {
              userData.nombre = String(companyUser.nombre).trim();
            }
            if (companyUser.apellido != null && String(companyUser.apellido).trim()) {
              userData.apellido = String(companyUser.apellido).trim();
            }
            for (const k of ['dni', 'dni_cuit', 'documento', 'cuit']) {
              if (companyUser[k] != null && String(companyUser[k]).trim()) {
                userData[k] = String(companyUser[k]).trim();
              }
            }
          }
        }
      } catch (permError) {
        console.warn('⚠️ [AUTH] No se pudieron leer permisos por empresa:', permError.message);
      }
      
      console.log('👤 [AUTH] Datos del usuario:', {
        email: userData.email,
        rol: userData.rol,
        uid: userData.uid,
        companyId: userData.companyId
      });
      
      req.user = userData;

      // Control de sesión única por usuario y límite de sesiones activas por empresa.
      if (req.companyId && req.user?.uid) {
        const sessionId = req.headers['x-nexo-session-id'] || req.headers['x-session-id'] || '';
        const deviceId = req.headers['x-nexo-device-id'] || req.headers['x-device-id'] || '';
        const sessionStartedAt = req.headers['x-nexo-session-started-at'] || '';
        const sessionCheck = await enforceSessionAccess(
          admin.firestore(),
          req.companyId,
          req.user,
          String(sessionId || '').trim(),
          String(deviceId || '').trim(),
          String(sessionStartedAt || '').trim()
        );
        if (!sessionCheck.ok) {
          req.authBlocked = true;
          req.authBlockedResponse = {
            success: false,
            message: sessionCheck.message || 'Acceso restringido por sesión',
            code: sessionCheck.code || 'SESSION_INVALID'
          };
          return res.status(sessionCheck.status || 401).json(req.authBlockedResponse);
        }
      }
      
    } catch (verifyError) {
      console.error('❌ [AUTH] Error al verificar token:', verifyError.message);
      req.user = null;
      req.companyId = null;
    }
    
  } catch (error) {
    console.error('❌ [AUTH] Error en middleware de autenticación:', error);
    req.user = null;
    req.companyId = null;
  }
  
  // Cortafuego multi-tenant para listados de sucursales sin contexto de empresa
  if (!req.companyId && req.method === 'GET' && req.path && req.path.startsWith('/sucursales')) {
    return res.status(200).json({ success: true, data: [], total: 0, message: 'Sin contexto de empresa' });
  }

  next();
}

/**
 * Middleware para requerir autenticación
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autenticación requerida'
    });
  }
  next();
}

/**
 * Middleware para verificar permisos de administrador
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Autenticación requerida'
    });
  }
  
  const esAdmin = req.user.email === 'danielcadiz15@gmail.com' ||
                  (typeof req.user.rol === 'string' && ['administrador','admin','Administrador','Admin'].includes(req.user.rol)) ||
                  (req.user.permisos && (
                    req.user.permisos.usuarios?.configurar_roles === true ||
                    req.user.permisos.usuarios?.editar === true ||
                    req.user.permisos.ventas?.eliminar === true
                  ));
  
  if (!esAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Se requieren permisos de administrador'
    });
  }
  
  next();
}

module.exports = {
  authenticateUser,
  requireAuth,
  requireAdmin
}; 