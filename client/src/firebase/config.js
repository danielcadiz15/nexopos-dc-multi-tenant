// src/firebase/config.js - Configuración Firebase NexoPOS DC
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Proyecto: nexopos-dc
const firebaseConfig = {
  apiKey: "AIzaSyC9NZn3-laGW6_pLwKL_3Y3EVLBdnLQy_k",
  authDomain: "nexopos-dc.firebaseapp.com",
  projectId: "nexopos-dc",
  storageBucket: "nexopos-dc.firebasestorage.app",
  messagingSenderId: "796585469999",
  appId: "1:796585469999:web:dc1e17692e4c10137abeda"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');

const usarEmuladores = process.env.REACT_APP_USE_EMULATORS === 'true';
const modoEmuladores = (process.env.REACT_APP_EMULATORS_MODE || 'full').toLowerCase();
const soloFunctionsEmuladas = modoEmuladores === 'api-only';

/** Evita doble conexión en React Strict Mode (doble montaje en dev). */
let emuladoresConectados = false;

if (
  usarEmuladores &&
  typeof window !== 'undefined' &&
  !emuladoresConectados
) {
  emuladoresConectados = true;
  if (!soloFunctionsEmuladas) {
    try {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    } catch (e) {
      if (!String(e?.message || e).includes('already been initialized')) console.warn('[firebase] Auth emulator:', e);
    }
    try {
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    } catch (e) {
      if (!String(e?.message || e).includes('already been initialized')) console.warn('[firebase] Firestore emulator:', e);
    }
  }
  try {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  } catch (e) {
    if (!String(e?.message || e).includes('already been initialized')) console.warn('[firebase] Functions emulator:', e);
  }
  // eslint-disable-next-line no-console
  console.info(
    soloFunctionsEmuladas
      ? '[firebase] Functions emulator :5001 · Auth/Firestore = proyecto remoto'
      : '[firebase] Emuladores: Auth :9099, Firestore :8080, Functions :5001'
  );
}

export default app;
