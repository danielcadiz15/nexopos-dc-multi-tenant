const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FUNCTION_NAME) {
  try {
    admin.initializeApp();
  } catch (e) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
} else {
  admin.initializeApp();
}

const db = admin.firestore();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: npm run make-admin -- <email>');
    process.exit(1);
  }
  const user = await admin.auth().getUserByEmail(email);
  await db.collection('adminUsers').doc(user.uid).set({
    createdAt: new Date().toISOString(),
    email
  }, { merge: true });
  console.log('OK admin:', email, 'uid:', user.uid);
}

main().catch(err=>{ console.error(err); process.exit(1); });



