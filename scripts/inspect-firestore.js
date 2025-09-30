// scripts/inspect-firestore.js
// Uso: node scripts/inspect-firestore.js <orgId>

const admin = require('firebase-admin');
const path = require('path');

async function main() {
  const orgId = process.argv[2] || process.env.ORG_ID;
  if (!orgId) {
    console.error('Uso: node scripts/inspect-firestore.js <orgId>');
    process.exit(1);
  }

  const keyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(require(keyPath)),
    projectId: 'nexopos-dc',
  });

  const db = admin.firestore();
  console.log(`🔎 Inspeccionando Firestore para orgId=${orgId} ...`);

  // Sucursales
  const sucSnap = await db.collection('companies').doc(orgId).collection('sucursales').get();
  console.log(`🏪 Sucursales (${sucSnap.size}):`);
  sucSnap.forEach(d => console.log(` - ${d.id}:`, d.data().nombre || d.data().tipo || 'sin_nombre'));

  // Verificar sucursal '1'
  const suc1 = await db.collection('companies').doc(orgId).collection('sucursales').doc('1').get();
  console.log(`✔ Existe sucursal '1': ${suc1.exists}`);
  if (suc1.exists) console.log('  Datos sucursal 1:', suc1.data());

  // Productos
  const prodSnap = await db.collection('companies').doc(orgId).collection('productos').limit(5).get();
  console.log(`🧾 Productos (muestra de ${prodSnap.size}):`);
  prodSnap.forEach(d => console.log(` - ${d.id}:`, d.data().nombre || d.data().codigo || 'producto'));

  // Stock sucursal '1'
  const stockSnap = await db.collection('companies').doc(orgId).collection('stock_sucursal')
    .where('sucursal_id', '==', '1').limit(10).get();
  console.log(`📦 Stock en sucursal '1' (muestra ${stockSnap.size}):`);
  stockSnap.forEach(d => console.log(` - ${d.id}:`, d.data().producto_id, d.data().cantidad));

  // Movimientos de stock recientes
  const movSnap = await db.collection('companies').doc(orgId).collection('movimientos_stock')
    .orderBy('fecha', 'desc').limit(5).get();
  console.log(`📜 Movimientos de stock recientes (${movSnap.size}):`);
  movSnap.forEach(d => console.log(` - ${d.id}:`, d.data().tipo, d.data().producto_id, d.data().cantidad));

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error inspeccionando Firestore:', err);
  process.exit(1);
});
