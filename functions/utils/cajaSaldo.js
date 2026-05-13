const admin = require('firebase-admin');

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} companyId
 * @param {string} sucursalId
 * @param {number} delta — positivo aumenta el neto de caja (más ingreso que egreso).
 */
async function incrementarSaldoSucursal(db, companyId, sucursalId, delta) {
  const sid = sucursalId || 'principal';
  const branchRef = db.collection('companies').doc(companyId).collection('caja').doc(sid);
  await branchRef.set(
    {
      saldo_acumulado: admin.firestore.FieldValue.increment(delta),
      fecha_actualizacion_saldo: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

async function computeSaldoDesdeMovimientos(db, companyId, sucursalId) {
  const snap = await db
    .collection('companies')
    .doc(companyId)
    .collection('caja')
    .doc(sucursalId)
    .collection('movimientos')
    .get();
  let s = 0;
  snap.forEach((d) => {
    const m = d.data();
    const v = parseFloat(m.monto) || 0;
    if (m.tipo === 'ingreso') s += v;
    else if (m.tipo === 'egreso') s -= v;
  });
  return s;
}

module.exports = { incrementarSaldoSucursal, computeSaldoDesdeMovimientos };
