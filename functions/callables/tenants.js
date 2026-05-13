const crypto = require('node:crypto');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { isSuperAdminEmail } = require('../utils/superAdmin');
const { normalizePlan } = require('../utils/planTiers');

setGlobalOptions({ region: 'us-central1' });

const db = admin.firestore();

const DEFAULT_CATEGORY_NAMES = ['Bebidas', 'Comestibles', 'Limpieza', 'Accesorios', 'Otros'];
const PROVEEDOR_GENERAL_NOMBRE = 'Proveedor general';

/**
 * Crea categorías estándar, proveedor general y merge en config/empresa solo lo que falta (listas Lista 1–3, PV default).
 * Idempotente por orgId.
 */
async function seedOrgCatalogDefaults(orgId) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const out = {
    categoriasCreadas: 0,
    proveedorCreado: false,
    empresaCamposAplicados: []
  };

  const empresaRefC = db.collection('companies').doc(orgId).collection('config').doc('empresa');
  const empresaRefT = db.collection('tenants').doc(orgId).collection('config').doc('empresa');
  const empSnap = await empresaRefC.get();
  const emp = empSnap.exists ? empSnap.data() || {} : {};
  const patch = { updatedAt: now };

  const et = emp.listas_precios_etiquetas;
  if (!et || typeof et !== 'object') {
    patch.listas_precios_etiquetas = {
      mayorista: 'Lista 1',
      interior: 'Lista 2',
      posadas: 'Lista 3'
    };
    out.empresaCamposAplicados.push('listas_precios_etiquetas');
  }
  const lpv = emp.lista_precio_punto_venta_default;
  if (lpv == null || String(lpv).trim() === '') {
    patch.lista_precio_punto_venta_default = 'mayorista';
    out.empresaCamposAplicados.push('lista_precio_punto_venta_default');
  }
  if (out.empresaCamposAplicados.length) {
    await empresaRefC.set(patch, { merge: true });
    await empresaRefT.set(patch, { merge: true });
  }

  const catSnap = await db.collection('categorias').where('orgId', '==', orgId).get();
  const existing = new Set(catSnap.docs.map((d) => String(d.data().nombre || '').trim().toLowerCase()));
  let batch = db.batch();
  let opsInBatch = 0;
  for (const nombre of DEFAULT_CATEGORY_NAMES) {
    const key = nombre.toLowerCase();
    if (existing.has(key)) continue;
    const ref = db.collection('categorias').doc();
    batch.set(ref, {
      nombre,
      activo: true,
      orgId,
      fechaCreacion: now,
      fechaActualizacion: now
    });
    existing.add(key);
    opsInBatch += 1;
    out.categoriasCreadas += 1;
    if (opsInBatch >= 400) {
      // eslint-disable-next-line no-await-in-loop
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }
  if (opsInBatch > 0) {
    await batch.commit();
  }

  const provSnap = await db.collection('proveedores').where('orgId', '==', orgId).get();
  const hasGen = provSnap.docs.some(
    (d) =>
      String(d.data().nombre || '').trim().toLowerCase() === PROVEEDOR_GENERAL_NOMBRE.toLowerCase()
  );
  if (!hasGen) {
    await db.collection('proveedores').add({
      nombre: PROVEEDOR_GENERAL_NOMBRE,
      activo: true,
      orgId,
      fechaCreacion: now,
      fechaActualizacion: now
    });
    out.proveedorCreado = true;
  }

  return out;
}

async function assertOwnerOrAdminMigracion(uid, orgId) {
  const uoSnap = await db.collection('usuariosOrg').doc(uid).get();
  const uo = uoSnap.data() || {};
  if (uo.orgId !== orgId) {
    throw new HttpsError(
      'permission-denied',
      'No podés aplicar esta acción a una empresa en la que no estás activo.'
    );
  }
  const roles = Array.isArray(uo.roles) ? uo.roles : [];
  if (roles.includes('OWNER')) return;

  const cu = await db.collection('companies').doc(orgId).collection('usuarios').doc(uid).get();
  const rol = String(cu.data()?.rol || '').toLowerCase();
  if (cu.exists && rol === 'administrador') return;

  throw new HttpsError(
    'permission-denied',
    'Solo el dueño de la empresa o un administrador pueden aplicar el catálogo sugerido.'
  );
}

async function resolveOrgIdForCatalogMigration(uid, emailRaw, requestedOrgId) {
  const email = (emailRaw || '').trim().toLowerCase();
  const superAdmin = isSuperAdminEmail(email);

  if (requestedOrgId && requestedOrgId.trim()) {
    const orgId = requestedOrgId.trim();
    if (!superAdmin) await assertOwnerOrAdminMigracion(uid, orgId);
    const tenantSnap = await db.collection('tenants').doc(orgId).get();
    const companySnap = await db.collection('companies').doc(orgId).get();
    if (!tenantSnap.exists && !companySnap.exists) {
      throw new HttpsError('not-found', 'Organización no encontrada.');
    }
    return orgId;
  }

  if (superAdmin) {
    throw new HttpsError(
      'invalid-argument',
      'Como super administrador, indicá orgId en los datos de la llamada para migrar esa empresa.'
    );
  }

  const uoSnap = await db.collection('usuariosOrg').doc(uid).get();
  const orgId = (uoSnap.data() || {}).orgId;
  if (!orgId) {
    throw new HttpsError(
      'failed-precondition',
      'No hay empresa activa en tu sesión. Activá una empresa o indicá orgId.'
    );
  }
  await assertOwnerOrAdminMigracion(uid, orgId);

  const tenantSnap = await db.collection('tenants').doc(orgId).get();
  const companySnap = await db.collection('companies').doc(orgId).get();
  if (!tenantSnap.exists && !companySnap.exists) {
    throw new HttpsError('not-found', 'Organización no encontrada.');
  }
  return orgId;
}

/** Código fijo opcional (respaldo). `firebase functions:secrets:set TENANT_CREATION_ADMIN_CODE` */
const tenantCreationAdminCode = defineSecret('TENANT_CREATION_ADMIN_CODE');
/** Pepper para hashear códigos de un solo uso generados por super admin. `firebase functions:secrets:set TENANT_BOOTSTRAP_PEPPER` */
const tenantBootstrapPepper = defineSecret('TENANT_BOOTSTRAP_PEPPER');

function normalizeOwnerEmail(email) {
  return (email != null ? String(email) : '').trim().toLowerCase();
}

function readExpectedAdminCode() {
  try {
    const v = tenantCreationAdminCode.value();
    if (v != null && String(v).trim() !== '') return String(v).trim();
  } catch (e) {
    console.warn('[createTenant] TENANT_CREATION_ADMIN_CODE no disponible:', e.message);
  }
  return (process.env.TENANT_CREATION_ADMIN_CODE || '').trim();
}

function readBootstrapPepper() {
  try {
    const v = tenantBootstrapPepper.value();
    if (v != null && String(v).trim() !== '') return String(v).trim();
  } catch (e) {
    console.warn('[createTenant] TENANT_BOOTSTRAP_PEPPER no disponible:', e.message);
  }
  return (process.env.TENANT_BOOTSTRAP_PEPPER || '').trim();
}

function bootstrapCodeHash(pepper, code) {
  return crypto
    .createHash('sha256')
    .update(pepper, 'utf8')
    .update('\n', 'utf8')
    .update(String(code).trim(), 'utf8')
    .digest('hex');
}

async function assertTenantCreationCode(uid, codeInput, ownerEmailNorm) {
  const raw = (codeInput != null ? String(codeInput) : '').trim();
  if (!raw) {
    throw new HttpsError(
      'invalid-argument',
      'Código de habilitación requerido. Lo genera el administrador desde el panel y lo asocia a tu correo.'
    );
  }

  const ownerNorm = normalizeOwnerEmail(ownerEmailNorm);
  if (!ownerNorm) {
    throw new HttpsError('invalid-argument', 'No pudimos resolver el correo de tu cuenta.');
  }

  const staticExpected = readExpectedAdminCode();

  const pepper = readBootstrapPepper();
  if (!pepper && !staticExpected) {
    throw new HttpsError(
      'failed-precondition',
      'Falta configurar TENANT_BOOTSTRAP_PEPPER (códigos por correo desde el panel admin). Opcional: TENANT_CREATION_ADMIN_CODE como respaldo.'
    );
  }

  if (staticExpected) {
    const a = Buffer.from(raw, 'utf8');
    const b = Buffer.from(staticExpected, 'utf8');
    if (a.length === b.length) {
      try {
        if (crypto.timingSafeEqual(a, b)) return;
      } catch {
        /* probar código vinculado a correo */
      }
    }
  }

  if (!pepper) {
    throw new HttpsError('permission-denied', 'Código de habilitación incorrecto.');
  }

  const h = bootstrapCodeHash(pepper, raw);
  const ref = db.collection('tenantBootstrapCodes').doc(h);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new HttpsError(
          'permission-denied',
          staticExpected ? 'Código de habilitación incorrecto.' : 'Código inválido, ya utilizado o expirado.'
        );
      }
      const d = snap.data() || {};
      if (d.used === true) {
        throw new HttpsError('permission-denied', 'Este código de habilitación ya fue utilizado.');
      }

      const allowed = normalizeOwnerEmail(d.allowedEmailNormalized);
      if (!allowed) {
        throw new HttpsError(
          'permission-denied',
          'Este código es antiguo o inválido. Pedí al administrador un código nuevo para tu correo.'
        );
      }
      if (allowed !== ownerNorm) {
        throw new HttpsError(
          'permission-denied',
          'Este código no corresponde al correo con el que iniciaste sesión. Usá la misma cuenta de correo verificada que indicaste al administrador.'
        );
      }

      let expMs = null;
      const exp = d.expiresAt;
      if (exp && typeof exp.toMillis === 'function') expMs = exp.toMillis();
      else if (exp && typeof exp._seconds === 'number') expMs = exp._seconds * 1000;
      if (expMs != null && Date.now() > expMs) {
        throw new HttpsError('permission-denied', 'Este código expiró. Pedí uno nuevo en el panel de administración.');
      }
      tx.update(ref, {
        used: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
        usedByUid: uid,
        usedByEmail: ownerNorm
      });
    });
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.error('[createTenant] validación código alta:', e);
    throw new HttpsError('internal', 'No se pudo validar el código de habilitación.');
  }
}

// Crea una organización (tenant) y vincula al usuario como OWNER
exports.createTenant = onCall({ secrets: [tenantCreationAdminCode, tenantBootstrapPepper] }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debe iniciar sesión');
    }
    const uid = request.auth.uid;
    const { nombre, slug, codigoAdministrador, adminLicenseCode, chosenPlan, plan } = request.data || {};
    const codeInput = codigoAdministrador ?? adminLicenseCode;
    const selectedPlan = normalizePlan(chosenPlan || plan || 'basic');

    let ownerEmail = null;
    let authUser;
    try {
      authUser = await admin.auth().getUser(uid);
      ownerEmail = authUser.email || null;
    } catch (error) {
      console.error('Error obteniendo email del usuario:', error);
      throw new HttpsError('internal', 'No se pudo obtener el email del usuario');
    }

    if (!ownerEmail) {
      throw new HttpsError('invalid-argument', 'Email del usuario requerido');
    }

    if (!authUser.emailVerified) {
      throw new HttpsError(
        'failed-precondition',
        'Tenés que verificar tu correo electrónico antes de crear una empresa. Revisá la bandeja de entrada.'
      );
    }

    const ownerEmailNorm = normalizeOwnerEmail(ownerEmail);
    await assertTenantCreationCode(uid, codeInput, ownerEmailNorm);
    
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

    // Sucursal principal opcional (en tenants y en companies)
    const sucRef = orgRef.collection('sucursales').doc();
    await sucRef.set({
      nombre: 'Sucursal Principal',
      direccion: '',
      tipo: 'principal',
      activa: true,
      createdAt: now,
      updatedAt: now
    });
    // Crear también en companies/{orgId}/sucursales
    await db.collection('companies').doc(orgRef.id).collection('sucursales').doc(sucRef.id).set({
      nombre: 'Sucursal Principal',
      direccion: '',
      tipo: 'principal',
      activa: true,
      createdAt: now,
      updatedAt: now
    }, { merge: true });

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

    // Crear registro de usuario dentro de la empresa con rol Administrador
    try {
      const permisosAdmin = {
        productos: { ver: true, crear: true, editar: true, eliminar: true },
        categorias: { ver: true, crear: true, editar: true, eliminar: true },
        proveedores: { ver: true, crear: true, editar: true, eliminar: true },
        punto_venta: { ver: true, crear: true, editar: true, eliminar: true },
        compras: { ver: true, crear: true, editar: true, eliminar: true },
        ventas: { ver: true, crear: true, editar: true, eliminar: true },
        stock: { ver: true, crear: true, editar: true, eliminar: true },
        reportes: { ver: true, crear: true, editar: true, eliminar: true },
        promociones: { ver: true, crear: true, editar: true, eliminar: true },
        usuarios: { ver: true, crear: true, editar: true, eliminar: true, configurar_roles: true },
        sucursales: { ver: true, crear: true, editar: true, eliminar: true },
        materias_primas: { ver: true, crear: true, editar: true, eliminar: true },
        recetas: { ver: true, crear: true, editar: true, eliminar: true },
        produccion: { ver: true, crear: true, editar: true, eliminar: true },
        vehiculos: { ver: true, crear: true, editar: true, eliminar: true },
        clientes: { ver: true, crear: true, editar: true, eliminar: true },
        caja: { ver: true, crear: true, editar: true, eliminar: true },
        gastos: { ver: true, crear: true, editar: true, eliminar: true },
        devoluciones: { ver: true, crear: true, editar: true, eliminar: true },
        listas_precios: { ver: true, crear: true, editar: true, eliminar: true },
        transferencias: { ver: true, crear: true, editar: true, eliminar: true },
        auditoria: { ver: true, crear: true, editar: true, eliminar: true },
        configuracion: { ver: true, crear: true, editar: true, eliminar: true }
      };
      await db.collection('companies').doc(orgRef.id).collection('usuarios').doc(uid).set({
        uid,
        email: ownerEmail,
        rol: 'Administrador',
        permisos: permisosAdmin,
        activo: true,
        sucursales: [sucRef.id],
        createdAt: now,
        updatedAt: now
      }, { merge: true });
    } catch (e) {
      console.warn('No se pudo crear usuario administrador de la empresa:', e.message);
    }

    // Custom claims para compatibilidad multi-tenant (companies/{companyId})
    await admin.auth().setCustomUserClaims(uid, { companyId: orgRef.id, role: 'admin' });

    // Crear documento espejo en companies para apps que lo esperan
    await db.collection('companies').doc(orgRef.id).set({
      name: nombreEmpresa,
      createdAt: now,
      ownerUid: uid,
      ownerEmail: ownerEmail
    }, { merge: true });

    // Licencia nueva: sin vigencia hasta el primer cobro MP (cuotas de instalación modelo onboarding_v2)
    try {
      const licensePayload = {
        billingModel: 'onboarding_v2',
        onboardingInstallmentsPaid: 0,
        chosenPlan: selectedPlan,
        /** Durante las 2 cuotas de kit/instalación se entrega versión completa; desde el tercer pago se aplica chosenPlan. */
        plan: 'premium',
        kitInstallmentsTotal: 2,
        kitInstallmentAmountARS: 250000,
        blocked: false,
        reason: '',
        demo: false,
        createdAt: now,
        updatedAt: now,
        createdBy: uid
      };
      await db.collection('companies').doc(orgRef.id).collection('config').doc('license').set(licensePayload, { merge: true });
      await db.collection('licenses').doc(orgRef.id).set(licensePayload, { merge: true });
    } catch (e) {
      console.warn('No se pudo inicializar licencia de onboarding:', e.message);
    }

    // Módulos: versión completa hasta que el primer cobro recurrente aplique el plan elegido en MP
    try {
      const { presetPremiumModules } = require('../utils/modulePresets');
      const defaultModules = { ...presetPremiumModules(), updatedAt: now };
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
        /** Etiquetas de listas por defecto; las claves internas siguen siendo mayorista / interior / posadas */
        listas_precios_etiquetas: {
          mayorista: 'Lista 1',
          interior: 'Lista 2',
          posadas: 'Lista 3'
        },
        /** Lista inicial en punto de venta (Lista 1 = mayorista) */
        lista_precio_punto_venta_default: 'mayorista',
        fecha_creacion: now,
        updatedAt: now
      };
      await db.collection('companies').doc(orgRef.id).collection('config').doc('empresa').set(empresaConfig, { merge: true });
      await db.collection('tenants').doc(orgRef.id).collection('config').doc('empresa').set(empresaConfig, { merge: true });
    } catch (e) {
      console.warn('No se pudo inicializar configuración de empresa:', e.message);
    }

    // Catálogo mínimo (categorías, proveedor, merge listas PV si faltaran)
    try {
      await seedOrgCatalogDefaults(orgRef.id);
    } catch (e) {
      console.warn('No se pudo sembrar catálogo mínimo:', e.message);
    }

    return { success: true, orgId: orgRef.id, sucursalId: sucRef.id };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('createTenant error:', error);
    throw new HttpsError('internal', error.message || 'Error interno');
  }
});

/** Super admin: código de un solo uso para `createTenant`, vinculado a `allowedEmailNormalized` del dueño. */
exports.generateTenantBootstrapCode = onCall({ secrets: [tenantBootstrapPepper] }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debe iniciar sesión');
    }
    const uid = request.auth.uid;
    let email = request.auth.token?.email ? String(request.auth.token.email).trim() : '';
    if (!email) {
      const u = await admin.auth().getUser(uid);
      email = (u.email || '').trim();
    }
    if (!isSuperAdminEmail(email)) {
      throw new HttpsError('permission-denied', 'Solo el super administrador puede generar códigos de alta.');
    }

    const pepper = readBootstrapPepper();
    if (!pepper) {
      throw new HttpsError(
        'failed-precondition',
        'Definí el secreto TENANT_BOOTSTRAP_PEPPER en el proyecto (Firebase Functions secrets) antes de generar códigos.'
      );
    }

    let { expiresInDays, note, targetEmail, email: emailAlt } = request.data || {};
    const targetRaw = (targetEmail != null ? targetEmail : emailAlt != null ? emailAlt : '')
      .toString()
      .trim();
    if (!targetRaw) {
      throw new HttpsError(
        'invalid-argument',
        'Indicá el correo del futuro administrador de la empresa (debe coincidir con la cuenta que creará la organización).'
      );
    }
    const allowedEmailNormalized = normalizeOwnerEmail(targetRaw);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(allowedEmailNormalized)) {
      throw new HttpsError('invalid-argument', 'El correo indicado no tiene un formato válido.');
    }

    expiresInDays = Number(expiresInDays);
    if (!Number.isFinite(expiresInDays) || expiresInDays < 1) expiresInDays = 90;
    if (expiresInDays > 365) expiresInDays = 365;
    note = String(note || '').trim().slice(0, 200);

    const expiresAtTs = admin.firestore.Timestamp.fromMillis(Date.now() + expiresInDays * 86400000);
    const now = admin.firestore.FieldValue.serverTimestamp();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = crypto.randomBytes(12).toString('base64url');
      const h = bootstrapCodeHash(pepper, code);
      const ref = db.collection('tenantBootstrapCodes').doc(h);
      // eslint-disable-next-line no-await-in-loop
      const snap = await ref.get();
      if (snap.exists) continue;
      await ref.set({
        used: false,
        allowedEmailNormalized,
        expiresAt: expiresAtTs,
        createdAt: now,
        createdByUid: uid,
        createdByEmail: email.toLowerCase(),
        note: note || null
      });
      return {
        success: true,
        code,
        allowedEmail: allowedEmailNormalized,
        expiresAt: expiresAtTs.toDate().toISOString(),
        expiresInDays
      };
    }
    throw new HttpsError('internal', 'Reintentá en unos segundos.');
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('generateTenantBootstrapCode error:', error);
    throw new HttpsError('internal', error.message || 'Error interno');
  }
});

// El usuario se une a un tenant existente (orgId vía joinCode simple)
exports.joinTenant = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debe iniciar sesión');
    }
    // Requerir email verificado para unirse
    if (!request.auth.token?.email_verified) {
      throw new HttpsError('failed-precondition', 'Debe verificar su email antes de unirse a una empresa');
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
    if (!request.auth.token?.email_verified) {
      throw new HttpsError(
        'failed-precondition',
        'Tenés que verificar tu correo electrónico antes de activar una empresa.'
      );
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

/**
 * Herramienta idempotente: categorías estándar, proveedor general, etiquetas Lista 1–3 y lista por defecto en PV.
 * Dueño/admin de la empresa, o super admin con orgId explícito.
 */
exports.migrateOrgCatalogDefaults = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debe iniciar sesión');
    }
    const uid = request.auth.uid;
    let email = request.auth.token?.email ? String(request.auth.token.email).trim() : '';
    if (!email) {
      const authUser = await admin.auth().getUser(uid);
      email = (authUser.email || '').trim();
    }
    const rawOrg =
      request.data != null && request.data.orgId != null ? String(request.data.orgId).trim() : '';
    const orgId = await resolveOrgIdForCatalogMigration(uid, email, rawOrg || null);
    const result = await seedOrgCatalogDefaults(orgId);
    console.log('[migrateOrgCatalogDefaults]', orgId, result);
    return { success: true, orgId, ...result };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('migrateOrgCatalogDefaults error:', error);
    throw new HttpsError('internal', error.message || 'Error interno');
  }
});


