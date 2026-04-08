// functions/src/messaging/sms.service.ts
// ✅ Servicio de envío de SMS (Twilio por defecto)

export interface SMSMessageOptions {
  vehicleId?: string;
  documentType?: string;
  alertLevel?: string;
  [key: string]: unknown;
}

/**
 * Enviar SMS usando Twilio
 */
export async function sendSMSMessage(
  to: string,
  message: string,
  options?: SMSMessageOptions
): Promise<void> {
  // Formato: +573001234567
  const formattedTo = to.startsWith('+') ? to : `+57${to.replace(/\D/g, '')}`;
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;

  // Si no hay credenciales, loggear y salir (no fallar en desarrollo)
  if (!accountSid || !authToken || !from) {
    console.warn('⚠️ Twilio SMS credentials not configured - skipping SMS');
    return;
  }

  try {
    // Usar axios para llamar a Twilio API
    const axios = await import('axios');
    
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const params = new URLSearchParams();
    params.append('From', from);
    params.append('To', formattedTo);
    params.append('Body', message);

    await axios.default.post(url, params, {
      auth: { username: accountSid, password: authToken }
    });
    
    console.log(`📱 SMS enviado a ${formattedTo}`);
  } catch (error) {
    console.error(`❌ Error enviando SMS a ${formattedTo}:`, error);
    // No lanzar error para no detener el flujo de alertas
  }
}

/**
 * Enviar SMS de prueba
 */
export async function sendTestSMS(to: string): Promise<void> {
  return sendSMSMessage(to, '🔔 [TEST] Conecta Marmato: SMS funcionando correctamente.');
}