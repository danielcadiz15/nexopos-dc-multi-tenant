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
const DEMO_SEED_DOC_ID = 'demoExpress';
const DEMO_UNLIMITED_PHONES = new Set(['+543764200303', '+543765381540']);
const DEMO_SHARED_ORG_ID = 'demo-shared-nexopos';
const DEMO_SHARED_SUCURSAL_ID = 'sucursal-principal';

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

function normalizeDemoPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length < 10 || digits.length > 15) return '';
  if (digits.startsWith('54')) return `+${digits}`;
  return `+54${digits}`;
}

function isUnlimitedDemoPhone(phoneNorm) {
  return DEMO_UNLIMITED_PHONES.has(String(phoneNorm || '').trim());
}

function toIsoDateDaysAgo(daysAgo = 0, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - Number(daysAgo || 0));
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function seedExpressDemoData(orgId, sucursalId, ownerUid) {
  const seedRef = db.collection('companies').doc(orgId).collection('config').doc(DEMO_SEED_DOC_ID);
  const seedSnap = await seedRef.get();
  if (seedSnap.exists && seedSnap.data()?.seeded === true) {
    return { seeded: false, skipped: true };
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const clients = [
    { nombre: 'María', apellido: 'Gómez', telefono: '3764120001' },
    { nombre: 'Carlos', apellido: 'Ríos', telefono: '3764120002' },
    { nombre: 'Ana', apellido: 'López', telefono: '3764120003' },
    { nombre: 'Jorge', apellido: 'Pérez', telefono: '3764120004' },
    { nombre: 'Lucía', apellido: 'Fernández', telefono: '3764120005' }
  ];
  const products = [
    { nombre: 'Yerba 1kg', codigo: '779000000001', categoria: 'Comestibles', costo: 3500, venta: 5200, stock: 80 },
    { nombre: 'Azúcar 1kg', codigo: '779000000002', categoria: 'Comestibles', costo: 900, venta: 1450, stock: 120 },
    { nombre: 'Arroz largo fino 1kg', codigo: '779000000003', categoria: 'Comestibles', costo: 1100, venta: 1700, stock: 75 },
    { nombre: 'Aceite girasol 1.5L', codigo: '779000000004', categoria: 'Comestibles', costo: 2400, venta: 3600, stock: 60 },
    { nombre: 'Lavandina 1L', codigo: '779000000005', categoria: 'Limpieza', costo: 750, venta: 1300, stock: 90 },
    { nombre: 'Detergente 750ml', codigo: '779000000006', categoria: 'Limpieza', costo: 980, venta: 1650, stock: 88 },
    { nombre: 'Gaseosa Cola 2.25L', codigo: '779000000007', categoria: 'Bebidas', costo: 1700, venta: 2600, stock: 95 },
    { nombre: 'Agua mineral 2L', codigo: '779000000008', categoria: 'Bebidas', costo: 820, venta: 1400, stock: 110 }
  ];

  const clientRefs = clients.map(() => db.collection('clientes').doc());
  const productRefs = products.map(() => db.collection('productos').doc());
  const proveedorRef = db.collection('proveedores').doc();

  const batch1 = db.batch();
  clientRefs.forEach((ref, idx) => {
    const c = clients[idx];
    const clientPayload = {
      nombre: c.nombre,
      apellido: c.apellido,
      nombre_completo: `${c.nombre} ${c.apellido}`,
      telefono: c.telefono,
      email: `${c.nombre.toLowerCase()}.${c.apellido.toLowerCase()}@demo.nexopos.local`,
      activo: true,
      orgId,
      createdAt: now,
      updatedAt: now
    };
    batch1.set(ref, clientPayload);
    batch1.set(
      db.collection('companies').doc(orgId).collection('clientes').doc(ref.id),
      clientPayload,
      { merge: true }
    );
  });
  productRefs.forEach((ref, idx) => {
    const p = products[idx];
    const listas = {
      mayorista: p.venta,
      interior: Math.round(p.venta * 1.08),
      posadas: Math.round(p.venta * 1.12)
    };
    const productPayload = {
      nombre: p.nombre,
      codigo: p.codigo,
      categoria: p.categoria,
      precio_costo: p.costo,
      precio_venta: p.venta,
      precio: p.venta,
      listas_precios: listas,
      stock: p.stock,
      stock_actual: p.stock,
      stock_sucursal: p.stock,
      sucursal_id: sucursalId,
      activo: true,
      orgId,
      createdAt: now,
      updatedAt: now
    };
    batch1.set(ref, productPayload);
    batch1.set(
      db.collection('companies').doc(orgId).collection('productos').doc(ref.id),
      productPayload,
      { merge: true }
    );
  });
  const proveedorPayload = {
    nombre: 'Distribuidora Demo',
    telefono: '3764120099',
    activo: true,
    orgId,
    createdAt: now,
    updatedAt: now
  };
  batch1.set(proveedorRef, proveedorPayload);
  batch1.set(
    db.collection('companies').doc(orgId).collection('proveedores').doc(proveedorRef.id),
    proveedorPayload,
    { merge: true }
  );
  await batch1.commit();

  const sales = [
    { daysAgo: 0, units: [{ idx: 0, qty: 2 }, { idx: 6, qty: 1 }], clientIdx: 0, method: 'efectivo' },
    { daysAgo: 1, units: [{ idx: 1, qty: 5 }, { idx: 5, qty: 2 }], clientIdx: 1, method: 'tarjeta' },
    { daysAgo: 2, units: [{ idx: 3, qty: 2 }, { idx: 7, qty: 4 }], clientIdx: 2, method: 'efectivo' },
    { daysAgo: 3, units: [{ idx: 2, qty: 3 }, { idx: 4, qty: 2 }], clientIdx: 3, method: 'MercadoPago' },
    { daysAgo: 4, units: [{ idx: 0, qty: 1 }, { idx: 1, qty: 4 }, { idx: 7, qty: 3 }], clientIdx: 4, method: 'efectivo' },
    { daysAgo: 5, units: [{ idx: 6, qty: 3 }, { idx: 5, qty: 2 }], clientIdx: 2, method: 'tarjeta' }
  ];

  const batch2 = db.batch();
  sales.forEach((sale, index) => {
    const saleRefGlobal = db.collection('ventas').doc();
    const saleRefCompany = db.collection('companies').doc(orgId).collection('ventas').doc(saleRefGlobal.id);
    const detalles = sale.units.map((u) => {
      const p = products[u.idx];
      return {
        producto_id: productRefs[u.idx].id,
        nombre: p.nombre,
        cantidad: u.qty,
        precio_unitario: p.venta,
        precio: p.venta,
        costo_unitario: p.costo,
        subtotal: p.venta * u.qty
      };
    });
    const total = detalles.reduce((sum, d) => sum + d.subtotal, 0);
    const costoTotal = detalles.reduce((sum, d) => sum + (d.costo_unitario * d.cantidad), 0);
    const salePayload = {
      orgId,
      companyId: orgId,
      sucursal_id: sucursalId,
      sucursalId,
      cliente_id: clientRefs[sale.clientIdx].id,
      cliente_nombre: `${clients[sale.clientIdx].nombre} ${clients[sale.clientIdx].apellido}`,
      estado: 'completada',
      metodo_pago: sale.method,
      total,
      total_venta: total,
      monto_total: total,
      subtotal: total,
      costo_total: costoTotal,
      ganancia: total - costoTotal,
      detalles,
      fecha: toIsoDateDaysAgo(sale.daysAgo, 9 + (index % 5), 10),
      fecha_venta: toIsoDateDaysAgo(sale.daysAgo, 9 + (index % 5), 10),
      createdAt: now,
      updatedAt: now,
      creadoPor: ownerUid
    };
    batch2.set(saleRefGlobal, salePayload);
    batch2.set(saleRefCompany, salePayload);
  });

  const compras = [
    { daysAgo: 6, idx: 0, qty: 20 },
    { daysAgo: 5, idx: 1, qty: 30 },
    { daysAgo: 4, idx: 6, qty: 25 },
    { daysAgo: 3, idx: 3, qty: 15 }
  ];
  compras.forEach((compra, index) => {
    const refGlobal = db.collection('compras').doc();
    const refCompany = db.collection('companies').doc(orgId).collection('compras').doc(refGlobal.id);
    const p = products[compra.idx];
    const total = p.costo * compra.qty;
    const payload = {
      orgId,
      companyId: orgId,
      proveedor_id: proveedorRef.id,
      proveedor_nombre: 'Distribuidora Demo',
      sucursal_id: sucursalId,
      estado: 'completada',
      total,
      subtotal: total,
      fecha: toIsoDateDaysAgo(compra.daysAgo, 8 + index, 20),
      detalles: [
        {
          producto_id: productRefs[compra.idx].id,
          nombre: p.nombre,
          cantidad: compra.qty,
          precio_unitario: p.costo,
          subtotal: total
        }
      ],
      createdAt: now,
      updatedAt: now
    };
    batch2.set(refGlobal, payload);
    batch2.set(refCompany, payload);
  });

  const gastos = [
    { daysAgo: 4, categoria: 'alquiler', concepto: 'Alquiler local', monto: 85000, origen: 'externo' },
    { daysAgo: 3, categoria: 'servicios', concepto: 'Internet y telefonía', monto: 18000, origen: 'externo' },
    { daysAgo: 2, categoria: 'combustible', concepto: 'Reparto y compras', monto: 22000, origen: 'caja' },
    { daysAgo: 1, categoria: 'otros', concepto: 'Limpieza y descartables', monto: 9500, origen: 'caja' }
  ];
  gastos.forEach((g) => {
    const ref = db.collection('companies').doc(orgId).collection('gastos').doc();
    const fechaIso = toIsoDateDaysAgo(g.daysAgo, 10, 30);
    batch2.set(ref, {
      orgId,
      fecha: fechaIso.split('T')[0],
      fecha_iso: fechaIso,
      categoria: g.categoria,
      concepto: g.concepto,
      monto: g.monto,
      origen_fondos: g.origen,
      medio_pago: 'efectivo',
      incluir_en_costos: true,
      sucursal_id: sucursalId,
      observaciones: 'Dato demo precargado',
      usuario: 'demo@nexopos.local',
      fechaCreacion: now
    });
  });
  await batch2.commit();

  await seedRef.set({
    seeded: true,
    mode: 'demo_express',
    seededAt: now,
    byUid: ownerUid
  }, { merge: true });

  return {
    seeded: true,
    clients: clients.length,
    products: products.length,
    sales: sales.length,
    purchases: compras.length,
    expenses: gastos.length
  };
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

function demoEmailHash(emailNorm) {
  return crypto
    .createHash('sha256')
    .update('nexopos-demo-email\n', 'utf8')
    .update(String(emailNorm || '').trim().toLowerCase(), 'utf8')
    .digest('hex');
}

function demoPhoneHash(phoneNorm) {
  return crypto
    .createHash('sha256')
    .update('nexopos-demo-phone\n', 'utf8')
    .update(String(phoneNorm || '').trim(), 'utf8')
    .digest('hex');
}

function buildAdminPermissions() {
  return {
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
}

async function ensureDemoSharedTenantExistsAndSeeded() {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const orgId = DEMO_SHARED_ORG_ID;
  const orgRef = db.collection('tenants').doc(orgId);
  const companyRef = db.collection('companies').doc(orgId);
  const sucursalId = DEMO_SHARED_SUCURSAL_ID;

  await orgRef.set({
    nombre: 'NexoPOS Demo',
    slug: 'nexopos-demo',
    ownerEmail: 'demo@nexopos.local',
    ownerPhone: '',
    createdAt: now,
    updatedAt: now
  }, { merge: true });

  await companyRef.set({
    name: 'NexoPOS Demo',
    ownerUid: 'demo-system',
    ownerEmail: 'demo@nexopos.local',
    createdAt: now,
    updatedAt: now
  }, { merge: true });

  await orgRef.collection('sucursales').doc(sucursalId).set({
    nombre: 'Sucursal Principal',
    direccion: '',
    tipo: 'principal',
    activa: true,
    createdAt: now,
    updatedAt: now
  }, { merge: true });
  await companyRef.collection('sucursales').doc(sucursalId).set({
    nombre: 'Sucursal Principal',
    direccion: '',
    tipo: 'principal',
    activa: true,
    createdAt: now,
    updatedAt: now
  }, { merge: true });
  await db.collection('sucursales').doc(sucursalId).set({
    nombre: 'Sucursal Principal',
    direccion: '',
    orgId,
    tipo: 'principal',
    activa: true,
    createdAt: now,
    updatedAt: now
  }, { merge: true });

  const paidUntil = admin.firestore.Timestamp.fromDate(new Date(Date.now() + (3650 * 24 * 60 * 60 * 1000)));
  const demoLicensePayload = {
    billingModel: 'demo_shared',
    chosenPlan: 'premium',
    plan: 'premium',
    paidUntil,
    blocked: false,
    reason: '',
    demo: true,
    demoMode: 'shared',
    demoDurationHours: 48,
    updatedAt: now,
    createdAt: now
  };
  await companyRef.collection('config').doc('license').set(demoLicensePayload, { merge: true });
  await db.collection('licenses').doc(orgId).set(demoLicensePayload, { merge: true });

  try {
    const { presetPremiumModules } = require('../utils/modulePresets');
    const defaultModules = { ...presetPremiumModules(), updatedAt: now };
    await orgRef.collection('config').doc('modules').set(defaultModules, { merge: true });
    await companyRef.collection('config').doc('modules').set(defaultModules, { merge: true });
  } catch (e) {
    console.warn('[demo-shared] no se pudo inicializar módulos:', e.message);
  }

  await companyRef.collection('config').doc('empresa').set({
    razon_social: 'NexoPOS Demo',
    nombre_fantasia: 'NexoPOS Demo',
    slogan: 'Sistema de ejemplo con datos cargados',
    punto_venta: '0001',
    formato_predeterminado: 'termico',
    mostrar_logo: false,
    listas_precios_etiquetas: {
      mayorista: 'Lista 1',
      interior: 'Lista 2',
      posadas: 'Lista 3'
    },
    lista_precio_punto_venta_default: 'mayorista',
    fecha_creacion: now,
    updatedAt: now
  }, { merge: true });
  await orgRef.collection('config').doc('empresa').set({
    razon_social: 'NexoPOS Demo',
    nombre_fantasia: 'NexoPOS Demo',
    updatedAt: now
  }, { merge: true });

  try {
    await seedOrgCatalogDefaults(orgId);
    await seedExpressDemoData(orgId, sucursalId, 'demo-system');
  } catch (e) {
    console.warn('[demo-shared] no se pudo sembrar datos demo:', e.message);
  }

  return { orgId, sucursalId };
}

async function linkUserAsDemoAdmin(uid, ownerEmail, ownerPhone, orgId, sucursalId) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const permisosAdmin = buildAdminPermissions();

  await db.collection('usuariosOrg').doc(uid).set({
    uid,
    orgId,
    roles: ['OWNER'],
    sucursales: [sucursalId],
    updatedAt: now,
    createdAt: now
  }, { merge: true });

  await db.collection('companies').doc(orgId).collection('usuarios').doc(uid).set({
    uid,
    email: ownerEmail || '',
    telefono: ownerPhone || '',
    rol: 'Administrador',
    permisos: permisosAdmin,
    activo: true,
    sucursales: [sucursalId],
    updatedAt: now,
    createdAt: now
  }, { merge: true });

  const existingClaims = (await admin.auth().getUser(uid)).customClaims || {};
  await admin.auth().setCustomUserClaims(uid, { ...existingClaims, companyId: orgId, role: 'admin' });
}

async function assertDemoAvailableForEmail(ownerEmailNorm) {
  const emailNorm = normalizeOwnerEmail(ownerEmailNorm);
  if (!emailNorm) {
    throw new HttpsError('invalid-argument', 'No pudimos resolver el correo de tu cuenta.');
  }
  const ref = db.collection('demoUsedEmails').doc(demoEmailHash(emailNorm));
  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data() || {};
  const orgId = String(data.orgId || '').trim();
  if (!orgId) {
    // Registro corrupto o legado sin org asociada: lo limpiamos para no bloquear alta válida.
    await ref.delete().catch(() => {});
    return;
  }

  // Si ya no existe la empresa asociada a esa demo, liberar el correo automáticamente.
  const [companySnap, tenantSnap] = await Promise.all([
    db.collection('companies').doc(orgId).get().catch(() => null),
    db.collection('tenants').doc(orgId).get().catch(() => null)
  ]);
  const companyExists = Boolean(companySnap && companySnap.exists);
  const tenantExists = Boolean(tenantSnap && tenantSnap.exists);

  if (!companyExists && !tenantExists) {
    await ref.delete().catch(() => {});
    return;
  }

  throw new HttpsError(
    'permission-denied',
    'Este correo ya usó la demo de 48 hs. Si querés continuar, activá un plan pago.'
  );
}

async function registerDemoUsage(ownerEmailNorm, orgId, uid) {
  const emailNorm = normalizeOwnerEmail(ownerEmailNorm);
  const ref = db.collection('demoUsedEmails').doc(demoEmailHash(emailNorm));
  await ref.set({
    emailNormalized: emailNorm,
    orgId,
    createdByUid: uid,
    usedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function assertDemoAvailableForPhone(phoneNorm, uid = '') {
  const normalized = String(phoneNorm || '').trim();
  if (!normalized) {
    throw new HttpsError('invalid-argument', 'No pudimos validar tu celular para activar la demo.');
  }
  if (isUnlimitedDemoPhone(normalized)) return;
  const ref = db.collection('demoUsedPhones').doc(demoPhoneHash(normalized));
  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data() || {};
  let expiresAtMs = null;
  const expiresAt = data.expiresAt;
  if (expiresAt && typeof expiresAt.toMillis === 'function') {
    expiresAtMs = expiresAt.toMillis();
  } else if (expiresAt && typeof expiresAt._seconds === 'number') {
    expiresAtMs = expiresAt._seconds * 1000;
  }
  if (expiresAtMs != null && expiresAtMs <= Date.now()) {
    await ref.delete().catch(() => {});
    return;
  }

  const orgId = String(data.orgId || '').trim();
  if (!orgId) {
    await ref.delete().catch(() => {});
    return;
  }

  const [companySnap, tenantSnap] = await Promise.all([
    db.collection('companies').doc(orgId).get().catch(() => null),
    db.collection('tenants').doc(orgId).get().catch(() => null)
  ]);
  const companyExists = Boolean(companySnap && companySnap.exists);
  const tenantExists = Boolean(tenantSnap && tenantSnap.exists);
  if (!companyExists && !tenantExists) {
    await ref.delete().catch(() => {});
    return;
  }

  // Si la demo asociada ya venció, liberamos el número automáticamente.
  if (companyExists) {
    try {
      const licenseSnap = await db
        .collection('companies')
        .doc(orgId)
        .collection('config')
        .doc('license')
        .get();
      const license = licenseSnap.exists ? licenseSnap.data() || {} : {};
      const billingModel = String(license.billingModel || '').trim().toLowerCase();
      const isDemoLicense = license.demo === true || billingModel.startsWith('demo');
      let paidUntilMs = null;
      const paidUntil = license.paidUntil;
      if (paidUntil && typeof paidUntil.toMillis === 'function') {
        paidUntilMs = paidUntil.toMillis();
      } else if (paidUntil && typeof paidUntil._seconds === 'number') {
        paidUntilMs = paidUntil._seconds * 1000;
      }
      if (isDemoLicense && paidUntilMs != null && paidUntilMs <= Date.now()) {
        await ref.delete().catch(() => {});
        return;
      }
    } catch (e) {
      console.warn('[createTenant][demoUsedPhones] no se pudo evaluar vencimiento demo:', e.message);
    }
  }

  // Si el dueño original ya no existe en Auth (demo huérfana), liberamos el número.
  const createdByUid = String(data.createdByUid || '').trim();
  if (createdByUid) {
    try {
      await admin.auth().getUser(createdByUid);
    } catch (err) {
      if (String(err?.code || '').trim() === 'auth/user-not-found') {
        await ref.delete().catch(() => {});
        return;
      }
      throw err;
    }
  }

  if (uid && String(data.createdByUid || '').trim() === String(uid).trim()) {
    return;
  }

  throw new HttpsError(
    'permission-denied',
    'Este número de celular ya usó la demo de 48 hs. Si querés continuar, activá un plan pago.'
  );
}

async function registerDemoPhoneUsage(phoneNorm, orgId, uid) {
  const normalized = String(phoneNorm || '').trim();
  if (!normalized) return;
  if (isUnlimitedDemoPhone(normalized)) return;
  const ref = db.collection('demoUsedPhones').doc(demoPhoneHash(normalized));
  await ref.set({
    phoneNormalized: normalized,
    orgId,
    createdByUid: uid,
    usedAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + (48 * 60 * 60 * 1000)))
  }, { merge: true });
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
    const {
      nombre,
      slug,
      codigoAdministrador,
      adminLicenseCode,
      chosenPlan,
      plan,
      creationMode,
      demoPhone
    } = request.data || {};
    const codeInput = codigoAdministrador ?? adminLicenseCode;
    const selectedPlan = normalizePlan(chosenPlan || plan || 'basic');
    const mode = creationMode != null ? String(creationMode).trim().toLowerCase() : 'standard';
    const isDemoMode = mode === 'demo' || mode === 'demo_express';
    const isDemoExpress = mode === 'demo_express';
    const normalizedDemoPhone = isDemoMode ? normalizeDemoPhone(demoPhone) : '';

    let ownerEmail = null;
    let authUser;
    try {
      authUser = await admin.auth().getUser(uid);
      ownerEmail = authUser.email || null;
    } catch (error) {
      console.error('Error obteniendo email del usuario:', error);
      throw new HttpsError('internal', 'No se pudo obtener el email del usuario');
    }

    if (!ownerEmail && !isDemoMode) {
      throw new HttpsError('invalid-argument', 'Email del usuario requerido');
    }
    if (isDemoMode && !normalizedDemoPhone) {
      throw new HttpsError(
        'invalid-argument',
        'Para activar la demo necesitamos un número de celular válido.'
      );
    }

    if (!isDemoMode && !authUser.emailVerified) {
      throw new HttpsError(
        'failed-precondition',
        'Tenés que verificar tu correo electrónico antes de crear una empresa. Revisá la bandeja de entrada.'
      );
    }

    const ownerEmailNorm = normalizeOwnerEmail(ownerEmail || '');
    if (isDemoMode) {
      await assertDemoAvailableForPhone(normalizedDemoPhone, uid);
    } else {
      await assertTenantCreationCode(uid, codeInput, ownerEmailNorm);
    }

    if (isDemoMode) {
      const shared = await ensureDemoSharedTenantExistsAndSeeded();
      await linkUserAsDemoAdmin(uid, ownerEmail || '', normalizedDemoPhone, shared.orgId, shared.sucursalId);
      try {
        await registerDemoPhoneUsage(normalizedDemoPhone, shared.orgId, uid);
        if (ownerEmailNorm) {
          await registerDemoUsage(ownerEmailNorm, shared.orgId, uid);
        }
      } catch (e) {
        console.warn('No se pudo registrar uso de demo compartido:', e.message);
      }
      return {
        success: true,
        orgId: shared.orgId,
        sucursalId: shared.sucursalId,
        mode: isDemoExpress ? 'demo_express' : 'demo'
      };
    }
    
    // Si no se proporciona nombre, usar el dominio del email
    const nombreEmpresa = isDemoMode
      ? (nombre || `Demo ${String(normalizedDemoPhone || '').slice(-4)}`.trim())
      : (nombre || ownerEmail.split('@')[1].split('.')[0].toUpperCase());
    
    console.log(`🏢 [TENANT] Creando empresa para usuario: ${ownerEmail}, nombre: ${nombreEmpresa}`);

    const now = admin.firestore.FieldValue.serverTimestamp();
    const orgRef = db.collection('tenants').doc();

    await orgRef.set({
      nombre: nombreEmpresa,
      slug: slug || null,
      ownerEmail: ownerEmail,
      ownerPhone: isDemoMode ? normalizedDemoPhone : '',
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
      const permisosAdmin = buildAdminPermissions();
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

    // Licencia nueva: demo 48 hs o onboarding pago con kit inicial.
    try {
      let licensePayload;
      if (isDemoMode) {
        const paidUntil = admin.firestore.Timestamp.fromDate(new Date(Date.now() + (48 * 60 * 60 * 1000)));
        licensePayload = {
          billingModel: 'demo_48h',
          chosenPlan: selectedPlan,
          plan: 'premium',
          paidUntil,
          blocked: false,
          reason: '',
          demo: true,
          demoMode: isDemoExpress ? 'express' : 'standard',
          demoPhone: normalizedDemoPhone || '',
          demoDurationHours: 48,
          demoStartedAt: now,
          createdAt: now,
          updatedAt: now,
          createdBy: uid
        };
      } else {
        licensePayload = {
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
      }
      await db.collection('companies').doc(orgRef.id).collection('config').doc('license').set(licensePayload, { merge: true });
      await db.collection('licenses').doc(orgRef.id).set(licensePayload, { merge: true });
    } catch (e) {
      console.warn('No se pudo inicializar licencia inicial:', e.message);
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

    if (isDemoExpress) {
      try {
        const seeded = await seedExpressDemoData(orgRef.id, sucRef.id, uid);
        console.log('[createTenant][demo_express] seed:', seeded);
      } catch (e) {
        console.warn('No se pudo sembrar datos demo express:', e.message);
      }
    }

    if (isDemoMode) {
      try {
        await registerDemoPhoneUsage(normalizedDemoPhone, orgRef.id, uid);
        if (ownerEmailNorm) {
          await registerDemoUsage(ownerEmailNorm, orgRef.id, uid);
        }
      } catch (e) {
        console.warn('No se pudo registrar uso de demo:', e.message);
      }
    }

    return {
      success: true,
      orgId: orgRef.id,
      sucursalId: sucRef.id,
      mode: isDemoExpress ? 'demo_express' : isDemoMode ? 'demo' : 'standard'
    };
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
    const hasVerifiedEmail = Boolean(request.auth.token?.email_verified);
    const hasVerifiedPhone = Boolean(String(request.auth.token?.phone_number || '').trim());
    const rawEmail = String(request.auth.token?.email || '').trim().toLowerCase();
    const isDemoSyntheticEmail = /@nexopos\.demo\.local$/.test(rawEmail);
    if (!hasVerifiedEmail && !hasVerifiedPhone && !isDemoSyntheticEmail) {
      throw new HttpsError(
        'failed-precondition',
        'Tenés que verificar tu correo o tu celular antes de activar una empresa.'
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

    // En demos, asegurar seed de datos aunque la empresa se haya creado antes de este flujo.
    try {
      const licenseSnap = await db
        .collection('companies')
        .doc(orgId)
        .collection('config')
        .doc('license')
        .get();
      const license = licenseSnap.exists ? licenseSnap.data() || {} : {};
      const billingModel = String(license.billingModel || '').trim().toLowerCase();
      const isDemoLicense = license.demo === true || billingModel.startsWith('demo');
      if (isDemoLicense) {
        let sucursalId = '';
        const companySucursales = await db
          .collection('companies')
          .doc(orgId)
          .collection('sucursales')
          .limit(1)
          .get();
        if (!companySucursales.empty) {
          sucursalId = companySucursales.docs[0].id;
        } else {
          const tenantSucursales = await db
            .collection('tenants')
            .doc(orgId)
            .collection('sucursales')
            .limit(1)
            .get();
          if (!tenantSucursales.empty) {
            sucursalId = tenantSucursales.docs[0].id;
          }
        }
        if (sucursalId) {
          await seedExpressDemoData(orgId, sucursalId, uid);
        }
      }
    } catch (seedErr) {
      console.warn('[setActiveTenant] no se pudo asegurar seed demo:', seedErr.message);
    }

    return { success: true };
  } catch (error) {
    console.error('setActiveTenant error:', error);
    throw new HttpsError('internal', error.message || 'Error interno');
  }
});

exports.ensureDemoTenantAccess = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debe iniciar sesión');
    }
    const uid = request.auth.uid;
    const authEmail = String(request.auth.token?.email || '').trim().toLowerCase();
    if (!/@nexopos\.demo\.local$/.test(authEmail)) {
      throw new HttpsError(
        'failed-precondition',
        'Esta acción solo está disponible para cuentas demo.'
      );
    }

    const explicitPhone = normalizeDemoPhone(request.data?.demoPhone || '');
    const fromEmailMatch = authEmail.match(/^demo_(\d+)@nexopos\.demo\.local$/);
    const inferredPhone = normalizeDemoPhone(fromEmailMatch?.[1] || '');
    const demoPhone = explicitPhone || inferredPhone;
    if (!demoPhone) {
      throw new HttpsError('invalid-argument', 'No se pudo validar el celular demo.');
    }

    await assertDemoAvailableForPhone(demoPhone, uid);
    const shared = await ensureDemoSharedTenantExistsAndSeeded();
    await linkUserAsDemoAdmin(uid, authEmail, demoPhone, shared.orgId, shared.sucursalId);
    await registerDemoPhoneUsage(demoPhone, shared.orgId, uid);
    await registerDemoUsage(authEmail, shared.orgId, uid);

    return {
      success: true,
      orgId: shared.orgId,
      sucursalId: shared.sucursalId,
      mode: 'demo_shared'
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('ensureDemoTenantAccess error:', error);
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


