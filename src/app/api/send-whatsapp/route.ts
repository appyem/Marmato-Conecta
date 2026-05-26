// src/app/api/send-whatsapp/route.ts
// ✅ Ruta segura para enviar mensajes por WhatsApp Business API (Meta)
// Soporta: texto libre (ventana 24h) + plantillas aprobadas (cualquier momento)
import { NextRequest, NextResponse } from 'next/server';

// ✅ Tipos estrictos para payload de texto libre
interface TextMessagePayload {
  to: string;
  message: string;
  template?: never; // Exclusión mutua: si hay message, no hay template
}

// ✅ Tipos estrictos para payload de plantilla
interface TemplateMessagePayload {
  to: string;
  template: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: 'body' | 'button' | 'header';
      parameters?: Array<{
        type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
        text?: string;
        currency?: { fallback_value: string; code: string; amount_1000: number };
        date_time?: { fallback_value: string };
        image?: { link: string };
        document?: { link: string };
        video?: { link: string };
      }>;
    }>;
  };
  message?: never; // Exclusión mutua: si hay template, no hay message
}

// ✅ Tipo union: O texto libre O plantilla (nunca ambos)
type WhatsAppPayload = TextMessagePayload | TemplateMessagePayload;


export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload: WhatsAppPayload = await request.json();

    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      console.error('❌ Faltan variables de entorno: WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID');
      return NextResponse.json({ success: false, error: 'Configuración incompleta' }, { status: 500 });
    }

    const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;

    // 🔍 LOG: Ver payload completo que se enviará a Meta
    console.log('📡 API -> Enviando a Meta:', { url, payload, phoneId });

    const metaRes = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: payload.to,
        type: payload.template ? 'template' : 'text',
        ...(payload.template ? { template: payload.template } : { text: { body: payload.message } }),
      }),
    });

    const metaData = await metaRes.json();

    // 🔍 LOG: Respuesta EXACTA de Meta
    console.log('📥 META Response:', {
      status: metaRes.status,
      statusText: metaRes.statusText,
      data: metaData
    });

    if (!metaRes.ok || metaData.error) {
      return NextResponse.json(
        { success: false, error: metaData.error?.message || 'Error en Meta API', details: metaData },
        { status: metaRes.status }
      );
    }

    return NextResponse.json({ success: true, messageId: metaData.messages?.[0]?.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    console.error('💥 CRASH /api/send-whatsapp:', { message: msg, stack: err instanceof Error ? err.stack : undefined });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}