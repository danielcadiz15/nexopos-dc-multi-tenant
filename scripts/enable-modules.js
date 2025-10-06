// scripts/enable-modules.js
const admin = require('firebase-admin');
const path = require('path');
const yargs = require('yargs');

// Inicializar Firebase Admin SDK
const serviceAccount = require(path.resolve(process.cwd(), 'serviceAccountKey.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'nexopos-dc',
});

const db = admin.firestore();

async function enableModules(orgId, modulesToEnable) {
  if (!orgId) throw new Error('Missing orgId');

  const payload = Object.fromEntries(
    modulesToEnable.map((m) => [m, true])
  );

  const now = admin.firestore.FieldValue.serverTimestamp();

  const refs = [
    db.doc(`companies/${orgId}/config/modules`)
  ];

  for (const ref of refs) {
    await ref.set({ ...payload, updatedAt: now }, { merge: true });
    console.log(`✔ Módulos habilitados en ${ref.path}:`, payload);
  }
}

const argv = yargs
  .option('org', { alias: 'o', type: 'string', demandOption: true, describe: 'Org/Tenant ID' })
  .option('modules', { alias: 'm', type: 'string', demandOption: false, describe: 'Lista separada por comas de módulos a habilitar' })
  .help().argv;

const modules = (argv.modules ? argv.modules.split(',') : ['ventas']).map((s) => s.trim()).filter(Boolean);

enableModules(argv.org, modules)
  .then(() => {
    console.log('✅ Listo.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  });


