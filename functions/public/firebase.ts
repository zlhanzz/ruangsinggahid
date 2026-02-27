import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyAWBv4ydhr-SDAEB2HUTWChAYEFB1iv96o",
  authDomain: "ruangsinggahid-3afb2.firebaseapp.com",
  projectId: "ruangsinggahid-3afb2",
  storageBucket: "ruangsinggahid-3afb2.firebasestorage.app",
  messagingSenderId: "232383071006",
  appId: "1:232383071006:web:1bce60a234671f4e2eff0f",
  measurementId: "G-4HWDYN8V65"
};

// Initialize Firebase (Modular)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Modular Firestore with Long Polling to prevent "Backend didn't respond" errors
let dbModular;
try {
  dbModular = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch (e) {
  dbModular = getFirestore(app);
}

const authModular = getAuth(app);
const storageModular = getStorage(app);
const googleProvider = new GoogleAuthProvider();

export { dbModular, app, authModular, storageModular, googleProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged };
// For backward compatibility within the app during transition
export const auth = authModular;
export const db = dbModular;
export const storage = storageModular;
export default app;
