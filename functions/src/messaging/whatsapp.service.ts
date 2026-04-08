// functions/src/messaging/whatsapp.service.ts
import axios from 'axios';

export interface WhatsAppMessageOptions {
  vehicleId?: string;
  documentType?: string;
  alertLevel?: string;
  [key: string]: unknown;
}

/**
 * Enviar mensaje por WhatsApp usando Twilio (configurable)
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
  options?: WhatsAppMessageOptions
): Promise<void> {
  // Formato: +573001234567 (Colombia)
  const formattedTo = to.startsWith('+') ? to : `+57${to.replace(/\D/g, '')}`;
  
  const mode = process.env.WHATSAPP_MODE || 'twilio';

  try {
    if (mode === 'twilio') {
      await sendViaTwilio(formattedTo, message);
    } else if (mode === 'meta') {
      await sendViaMeta(formattedTo, message, options);
    } else {
      console.warn(`⚠️ Modo WhatsApp no configurado: ${mode}`);
    }
    
    console.log(`📱 WhatsApp enviado a ${formattedTo}`);
  } catch (error) {
    console.error(`❌ Error enviando WhatsApp a ${formattedTo}:`, error);
    throw error;
  }
}

/**
 * Implementación con Twilio
 */
async function sendViaTwilio(to: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio credentials not configured');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const params = new URLSearchParams();
  params.append('From', from);
  params.append('To', to);
  params.append('Body', message);

  await axios.post(url, params, {
    auth: { username: accountSid, password: authToken }
  });
}

/**
 * Implementación con Meta WhatsApp API
 */
async function sendViaMeta(
  to: string,
  message: string,
  options?: WhatsAppMessageOptions
): Promise<void> {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error('Meta WhatsApp credentials not configured');
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  await axios.post(url, {
    messaging_product: 'whatsapp',
    to: to.replace('+', ''),
    type: 'text',
    text: { body: message }
  }, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Enviar mensaje de prueba (para desarrollo)
 */
export async function sendTestWhatsApp(to: string): Promise<void> {
  return sendWhatsAppMessage(to, '🔔 [TEST] Conecta Marmato: Sistema de alertas funcionando correctamente.');
}