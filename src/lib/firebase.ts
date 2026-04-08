import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCk-mGoU-VcrweWDeoT_tCqszAj-veEtbw",
  authDomain: "conecta-marmato.firebaseapp.com",
  projectId: "conecta-marmato",
  storageBucket: "conecta-marmato.firebasestorage.app",
  messagingSenderId: "5245494397",
  appId: "1:5245494397:web:a40a73d5992692a5d1fd14"
};

// Singleton pattern para evitar múltiples inicializaciones
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Habilitar persistencia offline (para brigadistas)
export const enableOfflinePersistence = async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log('✅ Persistencia offline habilitada');
    return true;
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Múltiples tabs abiertas - offline limitado');
    } else if (err.code === 'unimplemented') {
      console.error('❌ Browser no soporta persistencia offline');
    }
    return false;
  }
};

export default app;