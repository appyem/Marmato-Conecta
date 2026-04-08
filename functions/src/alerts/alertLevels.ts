// functions/src/alerts/alertLevels.ts

export interface AlertConfig {
  thresholdDays: number;
  level: 'info' | 'warning' | 'urgent' | 'critical' | 'overdue';
  color: string;
  emoji: string;
  sendWhatsApp: boolean;
  sendSMS: boolean;
  sendEmail: boolean;
  repeatInterval?: 'daily' | 'weekly'; // Para recordatorios recurrentes
}

export const ALERT_LEVELS: AlertConfig[] = [
  {
    thresholdDays: 30,
    level: 'info',
    color: '#22c55e', // green-500
    emoji: '🟢',
    sendWhatsApp: true,
    sendSMS: false,
    sendEmail: true,
    repeatInterval: 'weekly'
  },
  {
    thresholdDays: 15,
    level: 'warning',
    color: '#eab308', // yellow-500
    emoji: '🟡',
    sendWhatsApp: true,
    sendSMS: false,
    sendEmail: true,
    repeatInterval: 'weekly'
  },
  {
    thresholdDays: 7,
    level: 'urgent',
    color: '#f97316', // orange-500
    emoji: '🟠',
    sendWhatsApp: true,
    sendSMS: true,
    sendEmail: true,
    repeatInterval: 'daily'
  },
  {
    thresholdDays: 0,
    level: 'critical',
    color: '#ef4444', // red-500
    emoji: '🔴',
    sendWhatsApp: true,
    sendSMS: true,
    sendEmail: true,
    repeatInterval: 'daily'
  },
  {
    thresholdDays: -1, // Vencido
    level: 'overdue',
    color: '#000000',
    emoji: '⚫',
    sendWhatsApp: true,
    sendSMS: true,
    sendEmail: true,
    repeatInterval: 'weekly'
  }
];

/**
 * Obtener configuración de alerta para días dados
 */
export function getAlertConfigForDays(daysRemaining: number): AlertConfig | null {
  // Buscar el nivel más específico que aplique
  return [...ALERT_LEVELS]
    .sort((a, b) => b.thresholdDays - a.thresholdDays)
    .find(config => daysRemaining >= config.thresholdDays) || null;
}

/**
 * Verificar si ya se envió alerta para este vehículo/documento en este nivel
 * (Para evitar spam)
 */
export function shouldSendAlert(
  lastAlertDate: Date | null,
  config: AlertConfig,
  now: Date
): boolean {
  if (!lastAlertDate) return true;
  
  const hoursSinceLast = (now.getTime() - lastAlertDate.getTime()) / (1000 * 60 * 60);
  
  switch (config.repeatInterval) {
    case 'daily': return hoursSinceLast >= 24;
    case 'weekly': return hoursSinceLast >= 168; // 7 días
    default: return true; // Solo una vez
  }
}