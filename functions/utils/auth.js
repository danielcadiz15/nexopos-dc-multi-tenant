// functions/utils/auth.js - Middleware de autenticación Firebase
const admin = require('firebase-admin');

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

      // Fallback para cajeros/empleados antiguos: detectar empresa por uid/email
      // dentro de companies/{companyId}/usuarios cuando todavía no tienen claims.
      if (!req.companyId && decodedToken.email) {
        try {
          const byUid = await admin.firestore()
            .collectionGroup('usuarios')
            .where('uid', '==', decodedToken.uid)
            .limit(1)
            .get();

          let companyUserSnap = byUid.empty ? null : byUid.docs[0];

          if (!companyUserSnap) {
            const byEmail = await admin.firestore()
              .collectionGroup('usuarios')
              .where('email', '==', decodedToken.email)
              .limit(1)
              .get();
            companyUserSnap = byEmail.empty ? null : byEmail.docs[0];
          }

          if (companyUserSnap) {
            const detectedCompanyId = companyUserSnap.ref.parent.parent?.id || null;
            const companyUser = companyUserSnap.data();
            if (detectedCompanyId) {
              req.companyId = detectedCompanyId;
              companyId = detectedCompanyId;
              userData = {
                ...userData,
                ...companyUser,
                uid: decodedToken.uid,
                email: decodedToken.email,
                companyId: detectedCompanyId,
                orgId: detectedCompanyId
              };

              await admin.firestore().collection('usuariosOrg').doc(decodedToken.uid).set({
                uid: decodedToken.uid,
                orgId: detectedCompanyId,
                roles: [companyUser.rol_id || companyUser.role || companyUser.rol || 'empleado'],
                sucursales: Array.isArray(companyUser.sucursales) ? companyUser.sucursales : [],
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              }, { merge: true });

              await admin.auth().setCustomUserClaims(decodedToken.uid, {
                companyId: detectedCompanyId,
                orgId: detectedCompanyId,
                rol: companyUser.rol || decodedToken.rol || 'Empleado',
                role: companyUser.rol_id || decodedToken.role || 'empleado',
                rolId: companyUser.rol_id || decodedToken.rolId || 'empleado',
                activo: companyUser.activo !== false
              });

              console.log('✅ [AUTH] Empresa detectada por usuario/email:', {
                email: decodedToken.email,
                companyId: detectedCompanyId
              });
            }
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