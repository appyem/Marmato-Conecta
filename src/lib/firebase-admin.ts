// src/lib/firebase-admin.ts
// ✅ Inicialización de Firebase Admin SDK para entorno serverless (Vercel)
import admin from 'firebase-admin';

// Evitar inicializar múltiples veces en serverless (hot reload)
if (!admin.apps.length) {
  try {
    // Obtener credenciales desde variable de entorno (JSON stringificado)
    const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT no está configurada en las variables de entorno');
    }

    // Parsear y inicializar
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
      // Opcional: especificar databaseURL si tu proyecto lo requiere
      // databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error inicializando Firebase Admin';
    console.error('❌ Error initializing Firebase Admin:', message);
    throw error;
  }
}

// Exportar instancias tipadas
export const db = admin.firestore();
export const auth = admin.auth();
export type FieldValue = admin.firestore.FieldValue;
export const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;
