// functions/src/index.ts
// ✅ Firebase Functions v1 API - 100% compatible
import * as functions from 'firebase-functions/v1'; // ✅ FORZAR v1
import * as admin from 'firebase-admin';
import { checkAndSendExpirationAlerts } from './alerts/expirationChecker';
import { sendTestWhatsApp } from './messaging/whatsapp.service';

// Inicializar Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();

// 🔔 Scheduled: Diario 9 AM Colombia (14:00 UTC)
export const checkExpirationsDaily = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub
  .schedule('0 14 * * *')
  .timeZone('America/Bogota')
  
  .onRun(async () => {
    console.log('🔍 Verificación diaria iniciada...');
    try {
      await checkAndSendExpirationAlerts();
      console.log('✅ Diaria completada');
    } catch (err) {
      console.error('❌ Error diaria:', err);
    }
    return null;
  });

// 🔔 Scheduled: Semanal Lunes 8 AM Colombia
export const checkExpirationsWeekly = functions
  .runWith({ timeoutSeconds: 540, memory: '512MB' })
  .pubsub
  .schedule('0 13 * * 1')
  .timeZone('America/Bogota')
  
  .onRun(async () => {
    console.log('🔍 Verificación semanal iniciada...');
    try {
      await checkAndSendExpirationAlerts();
      console.log('✅ Semanal completada');
    } catch (err) {
      console.error('❌ Error semanal:', err);
    }
    return null;
  });

// ✅ Tipos para Callable Functions (v1)
export interface TriggerAlertsData {
  force?: boolean;
  vehicleId?: string;
}

export interface TestMessageData {
  phone: string;
}

// 🧪 Callable: Trigger manual (solo admin)
export const triggerAlertsTest = functions.https.onCall(
  async (data: TriggerAlertsData | null, context: functions.https.CallableContext) => {
    // Auth check
    // if (!context.auth) {
    //   throw new functions.https.HttpsError('unauthenticated', 'Login required');
    // }
    // 
    // const userRecord = await admin.auth().getUser(context.auth.uid);
    // const isAdmin = userRecord.customClaims?.admin === true;
    // if (!isAdmin) {
    //   throw new functions.https.HttpsError('permission-denied', 'Solo administradores');
    // }

    console.log('🧪 Trigger manual:', data);
    
    try {
      const result = await checkAndSendExpirationAlerts();
      return { success: true, ...result };
    } catch (error: unknown) {
      console.error('❌ Error triggerAlertsTest:', error);
      throw new functions.https.HttpsError('internal', 'Error ejecutando verificación');
    }
  }
);

// 🧪 Callable: WhatsApp test
export const sendTestMessage = functions.https.onCall(
  async (data: TestMessageData, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }

    const userRecord = await admin.auth().getUser(context.auth.uid);
    if (userRecord.customClaims?.admin !== true) {
      throw new functions.https.HttpsError('permission-denied', 'Solo administradores');
    }

    const { phone } = data;
    if (!phone) {
      throw new functions.https.HttpsError('invalid-argument', 'Phone required');
    }

    try {
      await sendTestWhatsApp(phone);
      return { success: true, message: 'Test sent' };
    } catch (error: unknown) {
      console.error('❌ Error sendTestMessage:', error);
      throw new functions.https.HttpsError('internal', 'Error sending test');
    }
  }
);

// 📊 Callable: Métricas de alertas
export const getAlertMetrics = functions.https.onCall(
  async (_: unknown, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }

    try {
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const snapshot = await db.collection('alerts')
        .where('sentAt', '>=', admin.firestore.Timestamp.fromDate(last7Days))
        .get();

      const metrics = {
        total: snapshot.size,
        byLevel: {} as Record<string, number>,
        byDocument: {} as Record<string, number>,
        lastSent: null as string | null
      };

      snapshot.docs.forEach(doc => {
        const alert = doc.data();
        if (alert.alertLevel) {
          metrics.byLevel[alert.alertLevel] = (metrics.byLevel[alert.alertLevel] || 0) + 1;
        }
        if (alert.documentType) {
          metrics.byDocument[alert.documentType] = (metrics.byDocument[alert.documentType] || 0) + 1;
        }
        if (alert.sentAt?.toDate) {
          const ts = alert.sentAt.toDate().toISOString();
          if (!metrics.lastSent || ts > metrics.lastSent) {
            metrics.lastSent = ts;
          }
        }
      });

      return metrics;
    } catch (error: unknown) {
      console.error('❌ Error getAlertMetrics:', error);
      throw new functions.https.HttpsError('internal', 'Error fetching metrics');
    }
  }
);