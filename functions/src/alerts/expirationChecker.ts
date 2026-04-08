// functions/src/alerts/expirationChecker.ts
import { db } from '../config'; // ✅ Ahora existe
import { getAlertConfigForDays, shouldSendAlert } from './alertLevels';
import { daysUntil, getNowColombia, getAlertMessage } from '../utils/dateUtils';
import { sendWhatsAppMessage } from '../messaging/whatsapp.service';
import { sendSMSMessage } from '../messaging/sms.service';
import { Timestamp } from 'firebase-admin/firestore';

export interface VehicleDocument {
  type: 'SOAT' | 'Tecnomecánica';
  expiryDate: string; // ISO string
  lastAlertSent?: { [level: string]: Timestamp };
}

export interface Vehicle {
  id: string;
  placa: string;
  conductor: string;
  telefono: string;
  departamento: string;
  documentos: VehicleDocument[];
  userId?: string;
  brigadistaId?: string;
}

/**
 * Función principal: Verificar vencimientos y enviar alertas
 */
export async function checkAndSendExpirationAlerts(): Promise<{
  checked: number;
  alerted: number;
  errors: number;
}> {
  const now = getNowColombia();
  let checked = 0, alerted = 0, errors = 0;

  try {
    // Obtener vehículos con documentos próximos a vencer
    const vehiclesSnapshot = await db.collection('vehicles')
      .where('isActive', '==', true)
      .get();

    for (const doc of vehiclesSnapshot.docs) {
      try {
        const vehicle = doc.data() as Vehicle;
        checked++;

        for (const document of vehicle.documentos) {
          const daysRemaining = daysUntil(document.expiryDate);
          const alertConfig = getAlertConfigForDays(daysRemaining);
          
          if (!alertConfig) continue; // No requiere alerta aún

          // Verificar si ya se envió alerta en este nivel recientemente
          const lastAlert = document.lastAlertSent?.[alertConfig.level];
          if (lastAlert && !shouldSendAlert(lastAlert.toDate(), alertConfig, now)) {
            continue;
          }

          // Preparar mensaje personalizado
          const message = getAlertMessage(
            document.type,
            daysRemaining,
            vehicle.placa,
            vehicle.conductor
          );

          // Enviar notificaciones según configuración
          const sendPromises: Promise<void>[] = [];

          if (alertConfig.sendWhatsApp && vehicle.telefono) {
            sendPromises.push(
              sendWhatsAppMessage(vehicle.telefono, message, {
                vehicleId: vehicle.id,
                documentType: document.type,
                alertLevel: alertConfig.level
              })
            );
          }

          if (alertConfig.sendSMS && vehicle.telefono) {
            sendPromises.push(
              sendSMSMessage(vehicle.telefono, message)
            );
          }

          // Ejecutar envíos en paralelo
          await Promise.allSettled(sendPromises);

          // Actualizar último envío de alerta en Firestore
          await db.collection('vehicles').doc(vehicle.id).update({
            [`documentos.${vehicle.documentos.indexOf(document)}.lastAlertSent.${alertConfig.level}`]: Timestamp.now(),
            updatedAt: Timestamp.now()
          });

          // Registrar en colección de alerts para métricas
          await db.collection('alerts').add({
            vehicleId: vehicle.id,
            placa: vehicle.placa,
            documentType: document.type,
            daysRemaining,
            alertLevel: alertConfig.level,
            message,
            sentAt: Timestamp.now(),
            channels: {
              whatsapp: alertConfig.sendWhatsApp,
              sms: alertConfig.sendSMS
            }
          });

          alerted++;
          console.log(`✅ Alerta enviada: ${vehicle.placa} - ${document.type} (${daysRemaining} días)`);
        }
      } catch (err) {
        errors++;
        console.error(`❌ Error procesando vehículo ${doc.id}:`, err);
      }
    }

    console.log(`📊 Resumen: ${checked} verificados, ${alerted} alertas enviadas, ${errors} errores`);
    return { checked, alerted, errors };

  } catch (error) {
    console.error('❌ Error en checkAndSendExpirationAlerts:', error);
    throw error;
  }
}