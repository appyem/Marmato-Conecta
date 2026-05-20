// src/app/api/whatsapp-webhook/route.ts
// ✅ Webhook oficial para RECIBIR mensajes y estados de entrega de Meta WhatsApp
import { NextRequest, NextResponse } from 'next/server';
import { db, serverTimestamp } from '@/lib/firebase-admin';

// ✅ Token de verificación (debe coincidir con el que pondrás en Meta)
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'marmato-verify-token-2026';

// ✅ Interfaces estrictas para el payload de Meta (sin 'any')
interface MetaMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'reaction' | 'location' | 'contacts' | 'interactive';
  text?: { body: string };
}

interface MetaContact {
  wa_id: string;
  profile: { name: string };
}

interface MetaStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  conversation?: { id: string; origin?: { type: string } };
  pricing?: { pricing_model: string; billable: boolean };
}

interface MetaChangeValue {
  messaging_product: string;
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaStatus[];
}

interface MetaEntry {
  id: string;
  changes: Array<{ value: MetaChangeValue; field: string }>;
}

interface MetaPayload {
  object: string;
  entry: MetaEntry[];
}

// ✅ GET: Verificación del webhook (Meta lo llama al configurar)
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('✅ Webhook verificado correctamente por Meta');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('❌ Intento de verificación fallido. Token no coincide.');
  return new NextResponse('Forbidden', { status: 403 });
}

// ✅ POST: Recepción de mensajes y actualizaciones de estado
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: MetaPayload = await request.json();

    // Meta envía un payload por cada evento. Procesamos cada entrada.
    for (const entry of body.entry) {
      const value = entry.changes[0]?.value;
      if (!value) continue;

      // 1️⃣ Si viene un MENSAJE NUEVO
      if (value.messages && value.messages.length > 0) {
        const msg = value.messages[0];
        const contact = value.contacts?.[0];
        const fromNumber = msg.from;
        const fromName = contact?.profile.name || 'Desconocido';

        // Solo procesamos mensajes de texto (por ahora)
        if (msg.type === 'text' && msg.text?.body) {
          await db.collection('whatsapp_messages').add({
            from: fromNumber,
            fromName,
            to: value.metadata.display_phone_number,
            body: msg.text.body.trim(),
            type: 'text',
            direction: 'inbound',
            timestamp: serverTimestamp(),
            metaMessageId: msg.id,
            read: false,
            replied: false
          });
          console.log(`📥 Mensaje recibido de ${fromNumber}: ${msg.text.body}`);
        }
      }

      // 2️⃣ Si viene un ESTADO DE ENTREGA (sent, delivered, read, failed)
      if (value.statuses && value.statuses.length > 0) {
        const status = value.statuses[0];
        await db.collection('whatsapp_messages').add({
          metaMessageId: status.id,
          direction: 'outbound',
          status: status.status,
          timestamp: serverTimestamp(),
          conversationId: status.conversation?.id || null,
          billable: status.pricing?.billable || false
        });
        console.log(`📤 Estado actualizado: ${status.id} → ${status.status}`);
      }
    }

    // ✅ Meta espera 200 OK inmediatamente. Si fallamos, reintenta.
    return new NextResponse(JSON.stringify({ success: true }), { status: 200 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error procesando webhook';
    console.error('❌ Error en webhook:', message);
    return new NextResponse(JSON.stringify({ error: message }), { status: 500 });
  }
}
