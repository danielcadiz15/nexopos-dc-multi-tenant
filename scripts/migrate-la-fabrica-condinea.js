/**
 * Migración controlada de la base "la-fabrica-1" a NexoPOS multi-tenant.
 *
 * Uso seguro:
 *   node scripts/migrate-la-fabrica-condinea.js --dry-run
 *   node scripts/migrate-la-fabrica-condinea.js --commit
 *
 * Credenciales:
 *   - ADC: gcloud auth application-default login
 *   - o variables:
 *     SOURCE_SERVICE_ACCOUNT=C:\keys\la-fabrica.json
 *     TARGET_SERVICE_ACCOUNT=C:\keys\nexopos.json
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const DEFAULT_SOURCE_PROJECT = 'la-fabrica-1';
const DEFAULT_TARGET_PROJECT = 'nexopos-dc';
const DEFAULT_ORG_ID = 'condinea';
const DEFAULT_COMPANY_NAME = 'Condinea';
const DEFAULT_MONTHS_TO_MIGRATE = 6;

const DIRECT_COLLECTIONS = [
  'productos',
  'categorias',
  'proveedores',
  'clientes',
  'sucursales',
  'usuarios',
  'roles',
  'ventas',
  'compras',
  'gastos',
  'devoluciones',
  'listas_precios',
  'transferencias',
  'stock_sucursal',
  'movimientos_stock',
  'promociones',
  'recetas',
  'produccion',
  'materias_primas',
  'vehiculos',
  'servicios_vehiculos',
  'combustible',
  'notificaciones',
  'auditoria',
  'auditoria_inventario',
  'cargas_combustible',
  'config',
  'control_stock',
  'gastos_vehiculos',
  'historial_precios',
  'movimientos_caja',
  'movimientos_stock_materias_primas',
  'ordenes_produccion',
  'recetas_detalles',
  'saldo_caja',
  'solicitudes_ajuste',
  'stock_materias_primas',
  'ventas_eliminadas'
];

const COLLECTION_ALIASES = {
  'stock-sucursal': 'stock_sucursal',
  'control-stock': 'control_stock',
  'solicitudes-ajuste': 'solicitudes_ajuste',
  configuracion_empresa: 'config',
  movimientos_caja: 'movimientos_caja',
  saldo_caja: 'saldo_caja',
  ordenes_produccion: 'ordenes_produccion',
  recetas_detalles: 'recetas_detalles',
  cargas_combustible: 'cargas_combustible',
  gastos_vehiculos: 'gastos_vehiculos',
  historial_precios: 'historial_precios',
  movimientos_stock_materias_primas: 'movimientos_stock_materias_primas',
  stock_materias_primas: 'stock_materias_primas',
  'auditoria-inventario': 'auditoria_inventario',
  stock: 'stock_sucursal',
  stockSucursal: 'stock_sucursal',
  movimientosStock: 'movimientos_stock',
  listasPrecios: 'listas_precios',
  ventasEliminadas: 'ventas_eliminadas',
  ventas_eliminadas: 'ventas_eliminadas'
};

const TIME_FILTERED_COLLECTIONS = new Set([
  'ventas',
  'ventas_eliminadas',
  'compras',
  'gastos',
  'devoluciones',
  'transferencias',
  'movimientos_stock',
  'movimientos_caja',
  'movimientos_stock_materias_primas',
  'notificaciones',
  'auditoria',
  'auditoria_inventario',
  'cargas_combustible',
  'gastos_vehiculos',
  'historial_precios',
  'ordenes_produccion',
  'produccion',
  'servicios_vehiculos',
  'solicitudes_ajuste',
  'combustible'
]);

// El origen viejo usa principalmente colecciones raíz. Evitamos listar subcolecciones por cada documento,
// porque vuelve muy lento el commit en colecciones grandes como movimientos_stock.
const RECURSIVE_SOURCE_COLLECTIONS = new Set([]);

function parseArgs(argv) {
  const out = {
    sourceProject: DEFAULT_SOURCE_PROJECT,
    targetProject: DEFAULT_TARGET_PROJECT,
    orgId: DEFAULT_ORG_ID,
    companyName: DEFAULT_COMPANY_NAME,
    dryRun: true,
    commit: false,
    only: null,
    months: DEFAULT_MONTHS_TO_MIGRATE,
    from: null,
    to: null,
    backupAll: true,
    reportDir: path.resolve(process.cwd(), 'tmp', 'migration-reports'),
    backupDir: path.resolve(process.cwd(), 'tmp', 'migration-backups')
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--commit') {
      out.commit = true;
      out.dryRun = false;
    } else if (arg === '--dry-run') {
      out.commit = false;
      out.dryRun = true;
    } else if (arg === '--source-project') {
      out.sourceProject = next;
      i += 1;
    } else if (arg === '--target-project') {
      out.targetProject = next;
      i += 1;
    } else if (arg === '--org') {
      out.orgId = next;
      i += 1;
    } else if (arg === '--company-name') {
      out.companyName = next;
      i += 1;
    } else if (arg === '--only') {
      out.only = String(next || '').split(',').map((s) => s.trim()).filter(Boolean);
      i += 1;
    } else if (arg === '--report-dir') {
      out.reportDir = path.resolve(process.cwd(), next);
      i += 1;
    } else if (arg === '--backup-dir') {
      out.backupDir = path.resolve(process.cwd(), next);
      i += 1;
    } else if (arg === '--months') {
      out.months = Math.max(0, Math.floor(Number(next || DEFAULT_MONTHS_TO_MIGRATE)));
      i += 1;
    } else if (arg === '--from') {
      out.from = next || null;
      i += 1;
    } else if (arg === '--to') {
      out.to = next || null;
      i += 1;
    } else if (arg === '--no-backup') {
      out.backupAll = false;
    }
  }
  return out;
}

function credentialFor(envVar) {
  const keyPath = process.env[envVar];
  if (!keyPath) return admin.credential.applicationDefault();
  return admin.credential.cert(require(path.resolve(keyPath)));
}

function initApp(name, projectId, envVar) {
  return admin.initializeApp(
    {
      credential: credentialFor(envVar),
      projectId
    },
    name
  );
}

function normalizeCollectionName(name) {
  return COLLECTION_ALIASES[name] || name;
}

function shouldMigrateCollection(sourceName, only) {
  const targetName = normalizeCollectionName(sourceName);
  if (only && only.length > 0) return only.includes(sourceName) || only.includes(targetName);
  return (
    DIRECT_COLLECTIONS.includes(sourceName) ||
    DIRECT_COLLECTIONS.includes(targetName) ||
    Object.prototype.hasOwnProperty.call(COLLECTION_ALIASES, sourceName) ||
    sourceName === 'config' ||
    sourceName === 'caja'
  );
}

function serializeForReport(value) {
  if (!value) return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeForReport);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serializeForReport(v);
    return out;
  }
  return value;
}

function toMillis(value) {
  if (!value) return null;
  if (typeof value === 'number') return value < 10000000000 ? value * 1000 : value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

function getDocDateMillis(data) {
  const fields = [
    'fecha',
    'fechaCreacion',
    'createdAt',
    'created_at',
    'fecha_creacion',
    'timestamp',
    'fechaActualizacion',
    'updatedAt',
    'fecha_venta',
    'fecha_compra',
    'fecha_emision',
    'fecha_eliminacion',
    'fecha_ajuste',
    'fecha_pago',
    'fecha_servicio'
  ];
  for (const field of fields) {
    const ms = toMillis(data[field]);
    if (ms) return ms;
  }
  return null;
}

function cutoffDate(months) {
  if (!months || months <= 0) return null;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

function parseDateBound(value, endOfDay = false) {
  if (!value) return null;
  const raw = String(value).trim();
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])))
    : new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Fecha inválida para filtro de migración: ${value}. Usá formato YYYY-MM-DD.`);
  }
  if (endOfDay) parsed.setUTCHours(23, 59, 59, 999);
  return parsed;
}

function migrationWindow(args) {
  const from = parseDateBound(args.from);
  const to = parseDateBound(args.to, true);
  if (from && to && from.getTime() > to.getTime()) {
    throw new Error(`Rango de fechas inválido: --from ${args.from} es posterior a --to ${args.to}.`);
  }
  const cutoff = from ? null : cutoffDate(args.months);
  return {
    from,
    to,
    cutoff,
    fromMs: from ? from.getTime() : null,
    toMs: to ? to.getTime() : null,
    cutoffMs: cutoff ? cutoff.getTime() : null
  };
}

function shouldTimeFilter(sourceName) {
  return TIME_FILTERED_COLLECTIONS.has(normalizeCollectionName(sourceName));
}

function isWithinCutoff(data, cutoffMs) {
  if (!cutoffMs) return true;
  const ms = getDocDateMillis(data);
  // Si no tiene fecha confiable, lo conservamos para no perder datos accidentalmente.
  if (!ms) return true;
  return ms >= cutoffMs;
}

function isWithinDateWindow(data, window) {
  const ms = getDocDateMillis(data);
  // Si no tiene fecha confiable, lo conservamos para no perder datos accidentalmente.
  if (!ms) return true;
  if (window.fromMs && ms < window.fromMs) return false;
  if (window.toMs && ms > window.toMs) return false;
  return isWithinCutoff(data, window.cutoffMs);
}

function safeDocId(value) {
  return String(value || '')
    .trim()
    .replace(/[\/#[\]?*]/g, '_')
    .slice(0, 900);
}

function stockDocId(sourceDoc, data) {
  const sucursalId = data.sucursal_id || data.sucursalId || data.sucursal || data.branchId;
  const productoId = data.producto_id || data.productoId || data.producto || data.productId;
  if (sucursalId && productoId) return `${safeDocId(sucursalId)}__${safeDocId(productoId)}`;
  return sourceDoc.id;
}

function stampTenant(data, orgId) {
  return {
    ...data,
    orgId,
    migratedFromProject: DEFAULT_SOURCE_PROJECT,
    migratedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

async function ensureTargetTenant(targetDb, orgId, companyName, commit) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const payloadCompany = {
    name: companyName,
    nombre: companyName,
    slug: orgId,
    migratedFromProject: DEFAULT_SOURCE_PROJECT,
    updatedAt: now,
    createdAt: now
  };
  const payloadTenant = {
    nombre: companyName,
    slug: orgId,
    migratedFromProject: DEFAULT_SOURCE_PROJECT,
    updatedAt: now,
    createdAt: now
  };

  if (!commit) {
    return {
      planned: [`companies/${orgId}`, `tenants/${orgId}`, `licenses/${orgId}`]
    };
  }

  await targetDb.collection('companies').doc(orgId).set(payloadCompany, { merge: true });
  await targetDb.collection('tenants').doc(orgId).set(payloadTenant, { merge: true });
  await targetDb.collection('licenses').doc(orgId).set({
    plan: 'premium',
    chosenPlan: 'premium',
    blocked: false,
    migratedFromProject: DEFAULT_SOURCE_PROJECT,
    updatedAt: now
  }, { merge: true });
  await targetDb.collection('companies').doc(orgId).collection('config').doc('modules').set({
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
    promociones: true,
    caja: true,
    gastos: true,
    devoluciones: true,
    auditoria: true,
    vehiculos: true,
    produccion: true,
    recetas: true,
    materias_primas: true,
    configuracion: true,
    sucursales: true,
    usuarios: true,
    updatedAt: now
  }, { merge: true });

  return { written: true };
}

async function commitBatchIfNeeded(targetDb, batchState, force = false) {
  if (!batchState.batch) batchState.batch = targetDb.batch();
  if (batchState.count > 0 && (force || batchState.count >= 400)) {
    await batchState.batch.commit();
    batchState.batch = targetDb.batch();
    batchState.count = 0;
  }
}

function targetDocumentRef({ sourceName, sourceDoc, data, targetCol, targetDb, orgId }) {
  const normalized = normalizeCollectionName(sourceName);
  if (normalized === 'stock_sucursal') {
    return targetDb.collection('companies').doc(orgId).collection('stock_sucursal').doc(stockDocId(sourceDoc, data));
  }
  if (normalized === 'movimientos_caja') {
    const sucursalId = safeDocId(data.sucursal_id || data.sucursalId || data.sucursal || data.branchId || 'principal');
    return targetDb.collection('companies').doc(orgId).collection('caja').doc(sucursalId).collection('movimientos').doc(sourceDoc.id);
  }
  if (normalized === 'saldo_caja') {
    const sucursalId = safeDocId(data.sucursal_id || data.sucursalId || data.sucursal || data.branchId || sourceDoc.id || 'principal');
    return targetDb.collection('companies').doc(orgId).collection('caja').doc(sucursalId);
  }
  return targetCol.doc(sourceDoc.id);
}

function transformForTarget(sourceName, sourceDoc, data, orgId) {
  const normalized = normalizeCollectionName(sourceName);
  const stamped = stampTenant(data, orgId);
  if (normalized === 'movimientos_caja') {
    return {
      ...stamped,
      referencia_tipo: stamped.referencia_tipo || 'migracion_la_fabrica',
      referencia_id: stamped.referencia_id || sourceDoc.id
    };
  }
  if (normalized === 'saldo_caja') {
    return {
      ...stamped,
      migratedSourceCollection: sourceName
    };
  }
  if (normalized === 'stock_sucursal') {
    return {
      ...stamped,
      migratedSourceCollection: sourceName
    };
  }
  return stamped;
}

async function copyDocumentRecursive({ sourceName, sourceDoc, targetCol, targetDb, orgId, commit, batchState, report, dateWindow, depth = 0 }) {
  const data = sourceDoc.data() || {};
  if (shouldTimeFilter(sourceName) && !isWithinDateWindow(data, dateWindow)) {
    report.filteredOut += 1;
    return;
  }

  report.docs += 1;
  const targetDoc = targetDocumentRef({ sourceName, sourceDoc, data, targetCol, targetDb, orgId });

  if (commit) {
    batchState.batch.set(targetDoc, transformForTarget(sourceName, sourceDoc, data, orgId), { merge: true });
    batchState.count += 1;
    await commitBatchIfNeeded(targetDb, batchState);
  }

  if (depth > 8 || !RECURSIVE_SOURCE_COLLECTIONS.has(normalizeCollectionName(sourceName))) return;
  const subcollections = await sourceDoc.ref.listCollections();
  for (const subcol of subcollections) {
    const targetSubcol = targetDoc.collection(subcol.id);
    await copyCollectionRecursive({
      sourceName: subcol.id,
      sourceCol: subcol,
      targetCol: targetSubcol,
      targetDb,
      orgId,
      commit,
      batchState,
      report,
      dateWindow,
      depth: depth + 1
    });
  }
}

async function countCollection(sourceCol) {
  try {
    const countSnap = await sourceCol.count().get();
    return countSnap.data().count || 0;
  } catch {
    const snap = await sourceCol.get();
    return snap.size;
  }
}

async function copyCollectionRecursive({ sourceName, sourceCol, targetCol, targetDb, orgId, commit, batchState, report, dateWindow, depth = 0 }) {
  if (!commit) {
    let count = 0;
    let filteredOut = 0;
    if (shouldTimeFilter(sourceName)) {
      const snap = await sourceCol.get();
      for (const doc of snap.docs) {
        if (isWithinDateWindow(doc.data() || {}, dateWindow)) count += 1;
        else filteredOut += 1;
      }
    } else {
      count = await countCollection(sourceCol);
    }
    report.docs += count;
    report.filteredOut += filteredOut;
    report.collections[sourceCol.path] = {
      targetPath: targetCol.path,
      docs: count,
      filteredOut,
      monthsFilter: shouldTimeFilter(sourceName) ? report.monthsFilter : null,
      fromDate: shouldTimeFilter(sourceName) ? report.fromDate : null,
      toDate: shouldTimeFilter(sourceName) ? report.toDate : null,
      dryRunFastCount: true
    };
    return;
  }

  const snap = await sourceCol.get();
  report.collections[sourceCol.path] = {
    targetPath: targetCol.path,
    docs: snap.size
  };

  for (const doc of snap.docs) {
    await copyDocumentRecursive({
      sourceName,
      sourceDoc: doc,
      targetCol,
      targetDb,
      orgId,
      commit,
      batchState,
      report,
      dateWindow,
      depth
    });
  }
}

function targetCollectionFor(sourceName, targetDb, orgId) {
  const normalized = normalizeCollectionName(sourceName);
  if (normalized === 'config') return targetDb.collection('companies').doc(orgId).collection('config');
  if (normalized === 'movimientos_caja' || normalized === 'saldo_caja') {
    return targetDb.collection('companies').doc(orgId).collection('caja');
  }
  return targetDb.collection('companies').doc(orgId).collection(normalized);
}

async function inspectRootCollections(sourceDb) {
  const cols = await sourceDb.listCollections();
  return cols.map((c) => c.id).sort();
}

async function backupRootCollections(sourceDb, rootCollections, backupDir, report) {
  const backupRunDir = path.join(backupDir, `la-fabrica-1-${Date.now()}`);
  fs.mkdirSync(backupRunDir, { recursive: true });

  let totalDocs = 0;
  for (const collectionName of rootCollections) {
    const snap = await sourceDb.collection(collectionName).get();
    const docs = snap.docs.map((doc) => ({
      id: doc.id,
      path: doc.ref.path,
      data: serializeForReport(doc.data() || {})
    }));
    totalDocs += docs.length;
    fs.writeFileSync(
      path.join(backupRunDir, `${collectionName.replace(/[\\/:*?"<>|]/g, '_')}.json`),
      JSON.stringify({ collection: collectionName, docs }, null, 2)
    );
  }

  const manifest = {
    project: DEFAULT_SOURCE_PROJECT,
    createdAt: new Date().toISOString(),
    collections: rootCollections,
    rootDocs: totalDocs,
    note: 'Backup local de colecciones raíz. No se escribe en NexoPOS.'
  };
  fs.writeFileSync(path.join(backupRunDir, '_manifest.json'), JSON.stringify(manifest, null, 2));
  report.backup = { dir: backupRunDir, rootDocs: totalDocs };
  return report.backup;
}

async function inspectTargetExisting(targetDb, orgId, rootCollections) {
  const out = {
    companyExists: false,
    collections: {},
    totalDocs: 0
  };
  const companyRef = targetDb.collection('companies').doc(orgId);
  out.companyExists = (await companyRef.get()).exists;
  const targetNames = [...new Set(rootCollections.map(normalizeCollectionName).filter((name) => name !== 'movimientos_caja' && name !== 'saldo_caja'))];
  targetNames.push('caja');
  for (const name of targetNames) {
    if (!shouldMigrateCollection(name, null) && name !== 'caja') continue;
    try {
      const count = await countCollection(companyRef.collection(name));
      if (count > 0) {
        out.collections[name] = count;
        out.totalDocs += count;
      }
    } catch {}
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const dateWindow = migrationWindow(args);
  const sourceApp = initApp('source-la-fabrica', args.sourceProject, 'SOURCE_SERVICE_ACCOUNT');
  const targetApp = initApp('target-nexopos', args.targetProject, 'TARGET_SERVICE_ACCOUNT');
  const sourceDb = admin.firestore(sourceApp);
  const targetDb = admin.firestore(targetApp);

  const report = {
    mode: args.commit ? 'commit' : 'dry-run',
    sourceProject: args.sourceProject,
    targetProject: args.targetProject,
    orgId: args.orgId,
    companyName: args.companyName,
    startedAt: new Date().toISOString(),
    rootCollections: [],
    skippedCollections: [],
    collections: {},
    docs: 0,
    filteredOut: 0,
    monthsFilter: args.months,
    fromDate: dateWindow.from?.toISOString() || null,
    toDate: dateWindow.to?.toISOString() || null,
    cutoffDate: dateWindow.cutoff?.toISOString() || null,
    tenant: null,
    backup: null,
    targetExisting: null,
    warnings: []
  };

  console.log(`\n=== Migración ${report.mode.toUpperCase()} ===`);
  console.log(`Origen:  ${args.sourceProject}`);
  console.log(`Destino: ${args.targetProject} -> companies/${args.orgId}`);
  if (dateWindow.from || dateWindow.to) {
    console.log(`Filtro por rango: ${report.fromDate || '(sin inicio)'} -> ${report.toDate || '(sin fin)'}`);
  } else {
    console.log(`Filtro por antigüedad: últimos ${args.months} meses desde ${report.cutoffDate}`);
  }

  const rootCollections = await inspectRootCollections(sourceDb);
  report.rootCollections = rootCollections;
  console.log(`Colecciones raíz encontradas: ${rootCollections.join(', ') || '(ninguna)'}`);

  if (rootCollections.includes('stock-sucursal') && rootCollections.includes('stock_sucursal')) {
    report.warnings.push(
      'Existen stock-sucursal y stock_sucursal; se consolidan en companies/{orgId}/stock_sucursal usando sucursal_id + producto_id para evitar duplicados.'
    );
  }

  if (args.backupAll) {
    console.log('Generando backup local de todas las colecciones raíz del origen...');
    const backup = await backupRootCollections(sourceDb, rootCollections, args.backupDir, report);
    console.log(`Backup local: ${backup.dir} (${backup.rootDocs} documentos raíz)`);
  }

  report.targetExisting = await inspectTargetExisting(targetDb, args.orgId, rootCollections);
  if (report.targetExisting.totalDocs > 0) {
    report.warnings.push(
      `El destino companies/${args.orgId} ya contiene ${report.targetExisting.totalDocs} documentos en subcolecciones. El commit usará merge.`
    );
    console.log(`Advertencia: destino con datos existentes (${report.targetExisting.totalDocs} docs).`);
  }

  report.tenant = await ensureTargetTenant(targetDb, args.orgId, args.companyName, args.commit);

  const batchState = { batch: targetDb.batch(), count: 0 };
  for (const sourceName of rootCollections) {
    if (!shouldMigrateCollection(sourceName, args.only)) {
      report.skippedCollections.push(sourceName);
      continue;
    }

    const sourceCol = sourceDb.collection(sourceName);
    const targetCol = targetCollectionFor(sourceName, targetDb, args.orgId);
    console.log(`- ${sourceName} -> ${targetCol.path}`);
    await copyCollectionRecursive({
      sourceName,
      sourceCol,
      targetCol,
      targetDb,
      orgId: args.orgId,
      commit: args.commit,
      batchState,
      report,
      dateWindow
    });
  }

  await commitBatchIfNeeded(targetDb, batchState, true);

  report.finishedAt = new Date().toISOString();
  fs.mkdirSync(args.reportDir, { recursive: true });
  const reportPath = path.join(
    args.reportDir,
    `la-fabrica-to-${args.orgId}-${report.mode}-${Date.now()}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(serializeForReport(report), null, 2));

  console.log(`\nDocumentos detectados${args.commit ? ' / migrados' : ''}: ${report.docs}`);
  console.log(`Documentos filtrados por fecha: ${report.filteredOut}`);
  if (report.backup?.dir) {
    console.log(`Backup completo local: ${report.backup.dir}`);
  }
  if (report.skippedCollections.length) {
    console.log(`Colecciones omitidas: ${report.skippedCollections.join(', ')}`);
  }
  console.log(`Reporte: ${reportPath}`);
  if (!args.commit) {
    console.log('\nDry-run terminado. Para escribir en NexoPOS ejecutá el mismo comando con --commit.');
  }
}

main().catch((error) => {
  console.error('Error en migración:', error);
  process.exit(1);
});
