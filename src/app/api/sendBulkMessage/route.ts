// src/app/api/sendBulkMessage/route.ts
// ✅ Evita pre-renderizado en build + inicialización segura para Vercel
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';

// ✅ Inicialización segura (no crash en build si faltan env vars)
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey,
      }),
    });
  } else {
    console.warn('⚠️ Firebase Admin credentials missing. API will activate after deploy.');
  }
}

// ✅ POST handler: _request se usará al implementar la lógica real
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest): Promise<NextResponse> {
  if (!admin.apps.length) {
    return NextResponse.json({ error: 'Servicio no configurado. Verifica env vars en Vercel.' }, { status: 500 });
  }

  try {
    // 🔍 Aquí va tu lógica de validación y envío (la que ya tenías)
    // Cuando implementes la lógica real:
    // - Usa admin.firestore() para consultar: await admin.firestore().collection('vehicles').where(...)
    // - Usa _request para leer el body: const body = await _request.json()
    
    return NextResponse.json({ success: true, message: 'Endpoint listo.' });
  } catch (err: unknown) {
    // ✅ Type guard seguro: sin 'any', sin ESLint errors
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}