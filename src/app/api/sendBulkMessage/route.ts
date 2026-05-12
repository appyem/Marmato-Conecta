// src/app/api/sendBulkMessage/route.ts
// ✅ API Route para envío masivo de WhatsApp/SMS (sin Firebase Blaze)

import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import axios from 'axios';

// ✅ Inicializar Firebase Admin (solo una vez)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// ✅ Interfaces
interface BulkMessageRequest {
  campaignId: string;
  recipientIds?: string[];
  message: string;
  channel: 'whatsapp' | 'sms';
}

interface BulkMessageResponse {
  success: boolean;
  sent: number;
  failed: number;
  errors: Array<{ vehicleId: string; error: string }>;
  summary: string;
}

// ✅ Helper: Enviar WhatsApp vía Meta API
async function sendWhatsAppMeta(to: string, message: string): Promise<void> {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error('Meta WhatsApp credentials not configured');
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to: to.replace('+', '').replace(/\D/g, ''),
      type: 'text',
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
}

// ✅ Helper: Enviar SMS vía Twilio
async function sendSMSTwilio(to: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio SMS credentials not configured');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const formattedTo = to.startsWith('+') ? to : `+57${to.replace(/\D/g, '')}`;
  
  const params = new URLSearchParams();
  params.append('From', from);
  params.append('To', formattedTo);
  params.append('Body', message);

  await axios.post(url, params, {
    auth: { username: accountSid, password: authToken },
  });
}

// ✅ POST Handler
export async function POST(request: NextRequest): Promise<NextResponse<BulkMessageResponse>> {
  try {
    // 1. Validar autenticación (Firebase ID Token en header)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, sent: 0, failed: 0, errors: [], summary: 'No autorizado' },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace('Bearer ', '');
    let decodedToken: admin.auth.DecodedIdToken;
    
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json(
        { success: false, sent: 0, failed: 0, errors: [], summary: 'Token inválido' },
        { status: 401 }
      );
    }

    // 2. Verificar que sea admin
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return NextResponse.json(
        { success: false, sent: 0, failed: 0, errors: [], summary: 'Solo administradores' },
        { status: 403 }
      );
    }

    // 3. Parsear body
    const body: BulkMessageRequest = await request.json();
    const { campaignId, recipientIds, message, channel } = body;

    if (!campaignId || !message || !channel || !['whatsapp', 'sms'].includes(channel)) {
      return NextResponse.json(
        { success: false, sent: 0, failed: 0, errors: [], summary: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // 4. Consultar vehículos de la campaña
    let vehiclesQuery = db.collection('vehicles').where('campaignId', '==', campaignId);
    
    // Si hay recipientIds, filtrar (Firestore limita 'in' a 10 elementos)
    if (recipientIds?.length) {
      const batchIds = recipientIds.slice(0, 10);
      vehiclesQuery = vehiclesQuery.where(admin.firestore.FieldPath.documentId(), 'in', batchIds);
    }

    const snapshot = await vehiclesQuery.get();
    
    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        sent: 0,
        failed: 0,
        errors: [],
        summary: 'No se encontraron vehículos para esta campaña',
      });
    }

    // 5. Procesar envíos
    const result: BulkMessageResponse = {
      success: true,
      sent: 0,
      failed: 0,
      errors: [],
      summary: '',
    };

    for (const doc of snapshot.docs) {
      const vehicle = doc.data();
      const phone = vehicle.telefono;

      if (!phone) {
        result.errors.push({ vehicleId: doc.id, error: 'Sin teléfono registrado' });
        result.failed++;
        continue;
      }

      try {
        if (channel === 'whatsapp') {
          await sendWhatsAppMeta(phone, message);
        } else {
          await sendSMSTwilio(phone, message);
        }
        result.sent++;
        console.log(`✓ Enviado a ${phone}`);
      } catch (sendErr: unknown) {
        const errorMsg = sendErr instanceof Error ? sendErr.message : 'Error de envío';
        result.errors.push({ vehicleId: doc.id, error: errorMsg });
        result.failed++;
        console.error(`✗ Falló envío a ${phone}:`, errorMsg);
      }
    }

    result.summary = `Enviados: ${result.sent}, Fallidos: ${result.failed}`;
    console.log(`✅ Envío masivo completado: ${result.summary}`);

    return NextResponse.json(result);

  } catch (err: unknown) {
    console.error('❌ Error en sendBulkMessage API:', err);
    const errorMsg = err instanceof Error ? err.message : 'Error interno del servidor';
    
    return NextResponse.json(
      { success: false, sent: 0, failed: 0, errors: [], summary: errorMsg },
      { status: 500 }
    );
  }
}
