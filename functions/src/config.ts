// functions/src/config.ts
import * as admin from 'firebase-admin';

// Inicializar Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// ✅ Exportar instancias
export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

// ✅ Configuración
export const appConfig = {
  timezone: process.env.ALERT_TIMEZONE || 'America/Bogota',
};

// ✅ Helper para teléfonos Colombia
export function formatPhoneColombia(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('57')) return `+${cleaned}`;
  if (cleaned.startsWith('+')) return phone;
  return `+57${cleaned}`;
}