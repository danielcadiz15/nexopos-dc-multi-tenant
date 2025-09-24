const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

setGlobalOptions({ region: 'us-central1' });

const db = admin.firestore();

// Crea una organización (tenant) y vincula al usuario como OWNER
exports.createTenant = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debe iniciar sesión');
    }
    const uid = request.auth.uid;
    const { nombre, slug } = request.data || {};
    
    // Obtener email del usuario autenticado
    let ownerEmail = null;
    try {
      const user = await admin.auth().getUser(uid);
      ownerEmail = user.email || null;
    } catch (error) {
      console.error('Error obteniendo email del usuario:', error);
      throw new HttpsError('internal', 'No se pudo obtener el email del usuario');
    }
    
    if (!ownerEmail) {
      throw new HttpsError('invalid-argument', 'Email del usuario requerido');
    }
    
    // Si no se proporciona nombre, usar el dominio del email
    const nombreEmpresa = nombre || ownerEmail.split('@')[1].split('.')[0].toUpperCase();
    
    console.log(`🏢 [TENANT] Creando empresa para usuario: ${ownerEmail}, nombre: ${nombreEmpresa}`);

    const now = admin.firestore.FieldValue.serverTimestamp();
    const orgRef = db.collection('tenants').doc();

    await orgRef.set({
      nombre: nombreEmpresa,
      slug: slug || null,
      ownerEmail: ownerEmail,
      createdAt: now,
      updatedAt: now
    });

    // Sucursal principal opcional
    const sucRef = orgRef.collection('sucursales').doc();
    await sucRef.set({
      nombre: 'Sucursal Principal',
      direccion: '',
      createdAt: now,
      updatedAt: now
    });

    // También crear en la colección principal de sucursales con orgId
    await db.collection('sucursales').doc(sucRef.id).set({
      nombre: 'Sucursal Principal',
      direccion: '',
      orgId: orgRef.id,
      tipo: 'principal',
      activa: true,
      createdAt: now,
      updatedAt: now
    });

    // Relación usuario-tenant
    await db.collection('usuariosOrg').doc(uid).set({
      uid,
      orgId: orgRef.id,
      roles: ['OWNER'],
      sucursales: [sucRef.id],
      createdAt: now,
      updatedAt: now
    }, { merge: true });

    // Custom claims para compatibilidad multi-tenant (companies/{companyId})
    await admin.auth().setCustomUserClaims(uid, { companyId: orgRef.id, role: 'owner' });

    // Crear documento espejo en companies para apps que lo esperan
    await db.collection('companies').doc(orgRef.id).set({
      name: nombreEmpresa,
      createdAt: now,
      ownerUid: uid,
      ownerEmail: ownerEmail
    }, { merge: true });

    // Inicializar licencia DEMO por 7 días
    try {
      const paidUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const licensePayload = {
        plan: 'demo',
        paidUntil,
        blocked: false,
        reason: '',
        demo: true,
        createdAt: now,
        updatedAt: now,
        createdBy: uid
      };
      // Mirror en companies/{orgId}/config/license y licenses/{orgId}
      await db.collection('companies').doc(orgRef.id).collection('config').doc('license').set(licensePayload, { merge: true });
      await db.collection('licenses').doc(orgRef.id).set(licensePayload, { merge: true });
    } catch (e) {
      console.warn('No se pudo inicializar licencia demo:', e.message);
    }

    // Inicializar módulos por defecto
    try {
      const defaultModules = {
        productos: true,
        categorias: true,
        clientes: true,
        proveedores: true,
        compras: true,
        ventas: true,
        punto_venta: true,
        stock: true,
        listas_precios: true,
        transferencias: true,
        reportes: true,
        promociones: false,
        caja: true,
        gastos: true,
        devoluciones: true,
        auditoria: false,
        vehiculos: false,
        produccion: false,
        recetas: false,
        materias_primas: false,
        configuracion: true,
        updatedAt: now
      };
      await db.collection('tenants').doc(orgRef.id).collection('config').doc('modules').set(defaultModules, { merge: true });
      await db.collection('companies').doc(orgRef.id).collection('config').doc('modules').set(defaultModules, { merge: true });
    } catch (e) {
      console.warn('No se pudieron inicializar módulos:', e.message);
    }

    // Inicializar configuración de empresa (nombre visible en UI)
    try {
      const empresaConfig = {
        razon_social: nombreEmpresa,
        nombre_fantasia: nombreEmpresa,
        slogan: '',
        punto_venta: '0001',
        formato_predeterminado: 'termico',
        mostrar_logo: false,
        fecha_creacion: now,
        updatedAt: now
      };
      await db.collection('companies').doc(orgRef.id).collection('config').doc('empresa').set(empresaConfig, { merge: true });
      await db.collection('tenants').doc(orgRef.id).collection('config').doc('empresa').set(empresaConfig, { merge: true });
    } catch (e) {
      console.warn('No se pudo inicializar configuración de empresa:', e.message);
    }

    // Semillas básicas de productos demo (opcional)
    try {
      const products = [
        { name: 'Carne Molida', unit: 'kg', price: 5000 },
        { name: 'Asado', unit: 'kg', price: 7500 },
        { name: 'Coca-Cola 1.5L', unit: 'unit', price: 1800 },
      ];
      const batch = db.batch();
      products.forEach(p => batch.set(db.collection('companies').doc(orgRef.id).collection('products').doc(), {
        ...p,
        createdAt: now
      }));
      await batch.commit();
    } catch {}

    return { success: true, orgId: orgRef.id, sucursalId: sucRef.id };
  } catch (error) {
    console.error('createTenant error:', error);
    throw new HttpsError('internal', error.message || 'Error interno');
  }
});

// El usuario se une a un tenant existente (orgId vía joinCode simple)
exports.joinTenant = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debe iniciar sesión');
    }
    const uid = request.auth.uid;
    const { joinCode } = request.data || {};
    if (!joinCode) {
      throw new HttpsError('invalid-argument', 'joinCode requerido');
    }

    const orgRef = db.collection('tenants').doc(joinCode);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) {
      throw new HttpsError('not-found', 'Organización no encontrada');
    }

    const sucSnap = await orgRef.collection('sucursales').limit(1).get();
    const sucursalId = sucSnap.empty ? null : sucSnap.docs[0].id;

    await db.collection('usuariosOrg').doc(uid).set({
      uid,
      orgId: orgRef.id,
      roles: ['VIEWER'],
      sucursales: sucursalId ? [sucursalId] : [],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Setear claims de compatibilidad
    await admin.auth().setCustomUserClaims(uid, { companyId: orgRef.id, role: 'viewer' });

    return { success: true, orgId: orgRef.id };
  } catch (error) {
    console.error('joinTenant error:', error);
    throw new HttpsError('internal', error.message || 'Error interno');
  }
});

// Marca un tenant como activo en el documento usuariosOrg
exports.setActiveTenant = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debe iniciar sesión');
    }
    const uid = request.auth.uid;
    const { orgId } = request.data || {};
    if (!orgId) {
      throw new HttpsError('invalid-argument', 'orgId requerido');
    }
    const orgSnap = await db.collection('tenants').doc(orgId).get();
    if (!orgSnap.exists) {
      throw new HttpsError('not-found', 'Organización no encontrada');
    }
    await db.collection('usuariosOrg').doc(uid).set({
      uid,
      orgId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Refrescar claims
    const existing = (await admin.auth().getUser(uid)).customClaims || {};
    await admin.auth().setCustomUserClaims(uid, { ...existing, companyId: orgId });

    return { success: true };
  } catch (error) {
    console.error('setActiveTenant error:', error);
    throw new HttpsError('internal', error.message || 'Error interno');
  }
});


