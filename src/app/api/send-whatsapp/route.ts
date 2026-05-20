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

// ✅ Tipo para errores de Meta
interface MetaError {
  error?: {
    message?: string;
    code?: number;
    type?: string;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Leer y validar cuerpo de la petición
    const body: WhatsAppPayload = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json({ error: 'Campo requerido faltante: "to"' }, { status: 400 });
    }

    // 2. Validar que venga message O template (exclusión mutua)
    const isText = 'message' in body && body.message;
    const isTemplate = 'template' in body && body.template;

    if (!isText && !isTemplate) {
      return NextResponse.json({ 
        error: 'Debe proporcionar "message" (texto libre) O "template" (plantilla aprobada)' 
      }, { status: 400 });
    }

    // 3. Obtener credenciales de entorno
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.error('❌ Credenciales de WhatsApp no configuradas en .env.local');
      return NextResponse.json({ error: 'Configuración de WhatsApp incompleta' }, { status: 500 });
    }

    // 4. Construir URL oficial de Meta (Graph API v18.0)
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    // 5. Construir cuerpo de la petición según el tipo de mensaje
    const messageBody = isText
      ? {
          messaging_product: 'whatsapp' as const,
          to,
          type: 'text' as const,
          text: { body: (body as TextMessagePayload).message },
        }
      : {
          messaging_product: 'whatsapp' as const,
          to,
          type: 'template' as const,
          template: (body as TemplateMessagePayload).template,
        };

    // 6. Enviar petición a Meta
    const metaResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageBody),
    });

    // 7. Manejar respuestas de error de Meta
    if (!metaResponse.ok) {
      const errorData: MetaError = await metaResponse.json();
      const errorMsg = errorData.error?.message || 'Error desconocido de Meta';
      const errorCode = errorData.error?.code;
      console.error('❌ Meta API Error:', errorMsg, '(code:', errorCode, ')');
      
      // Mensajes amigables para errores comunes
      if (errorCode === 131047) {
        return NextResponse.json({ 
          error: 'Número no verificado. El destinatario debe estar en la lista de números de prueba.' 
        }, { status: 400 });
      }
      if (errorCode === 131026) {
        return NextResponse.json({ 
          error: 'Permiso denegado. Verifica que la plantilla esté aprobada y el token tenga permisos.' 
        }, { status: 403 });
      }
      if (errorCode === 131014) {
        return NextResponse.json({ 
          error: 'Plantilla no encontrada. Verifica el nombre exacto de la plantilla.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ error: errorMsg }, { status: metaResponse.status });
    }

    // 8. Respuesta exitosa
    const data = await metaResponse.json();
    return NextResponse.json({ 
      success: true, 
      messageId: data.messages?.[0]?.id || 'sin-id',
      message: 'Mensaje enviado exitosamente' 
    }, { status: 200 });

  } catch (err: unknown) {
    // ✅ Type guard seguro (cumple ESLint, sin 'any')
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('❌ Error en /api/send-whatsapp:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}