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
export const enableOfflinePersistence = async (): Promise<boolean> => {
  try {
    await enableIndexedDbPersistence(db);
    console.log('✅ Persistencia offline habilitada');
    return true;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'failed-precondition') {
      console.warn('⚠️ Múltiples tabs abiertas - offline limitado');
    } else if (error.code === 'unimplemented') {
      console.error('❌ Browser no soporta persistencia offline');
    } else {
      console.error('❌ Error habilitando offline:', error.message);
    }
    return false;
  }
};



export default app;