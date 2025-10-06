// scripts/grant-admin.js
// Uso:
//   node scripts/grant-admin.js --uid <UID> --email <EMAIL> --org <ORG_ID>
// Requiere: serviceAccountKey.json en la raíz del repo y permisos de Owner/Editor.

const admin = require('firebase-admin');
const path = require('path');

function getArg(flag, fallback = undefined) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function main() {
  const uid = getArg('--uid');
  const email = getArg('--email');
  const orgId = getArg('--org');

  if (!uid || !email || !orgId) {
    console.error('Uso: node scripts/grant-admin.js --uid <UID> --email <EMAIL> --org <ORG_ID>');
    process.exit(1);
  }

  const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(require(keyPath)),
    projectId: 'nexopos-dc'
  });

  const db = admin.firestore();

  console.log('▶ Asignando rol admin vía usuariosOrg ...');
  await db.collection('usuariosOrg').doc(uid).set({
    email,
    rol: 'admin',
    orgId,
    permisos: {
      usuarios: { configurar_roles: true, editar: true },
      ventas: { eliminar: true }
    },
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log('✔ usuariosOrg actualizado.');

  console.log('▶ Asegurando registro en colección usuarios ...');
  await db.collection('usuarios').doc(uid).set({
    email,
    rol: 'admin',
    activo: true,
    fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  console.log('✔ usuarios actualizado.');

  console.log('▶ Estableciendo custom claims ...');
  await admin.auth().setCustomUserClaims(uid, { rol: 'admin', activo: true });
  console.log('✔ Custom claims asignados.');

  console.log('✅ Listo. El usuario ahora es admin para la org:', orgId);
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });



