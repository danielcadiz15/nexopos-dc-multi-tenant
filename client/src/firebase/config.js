// src/firebase/config.js - Configuración Firebase NexoPOS DC
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

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

export default app;