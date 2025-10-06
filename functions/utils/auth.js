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
      const companyId = decodedToken.companyId || null;
      req.companyId = companyId;
      
      // Obtener información adicional del usuario desde Firestore (multi-tenant)
      const userOrgDoc = await admin.firestore()
        .collection('usuariosOrg')
        .doc(decodedToken.uid)
        .get();
      
      let userData = {
        uid: decodedToken.uid,
        email: decodedToken.email,
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