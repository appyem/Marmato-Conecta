// functions/src/utils/dateUtils.ts
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

export const TIMEZONE = 'America/Bogota';

/**
 * Obtener fecha actual en Colombia
 */
export function getNowColombia(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Calcular días restantes hasta una fecha
 * @returns Número positivo = días restantes, negativo = días de atraso
 */
export function daysUntil(targetDate: Date | string): number {
  const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate;
  if (!isValid(target)) return -999;
  
  const now = getNowColombia();
  // Normalizar a medianoche para comparación justa
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  
  return differenceInDays(targetMidnight, nowMidnight);
}

/**
 * Formatear fecha para mostrar al usuario
 */
export function formatDateColombia(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
}

/**
 * Obtener mensaje personalizado según días restantes
 */
export function getAlertMessage(
  documentType: 'SOAT' | 'Tecnomecánica',
  daysRemaining: number,
  placa: string,
  conductor: string
): string {
  const messages: Record<string, string> = {
    '30': `🟢 ${conductor}, tu ${documentType} para el vehículo ${placa} vence en 30 días. ¡Planifica con tiempo!`,
    '15': `🟡 ${conductor}, recordatorio: tu ${documentType} de ${placa} vence en 15 días.`,
    '7': `🟠 ${conductor}, ¡ATENCIÓN! Tu ${documentType} de ${placa} vence en 7 días.`,
    '0': `🔴 ${conductor}, tu ${documentType} de ${placa} VENCE HOY. ¡Renóvalo ya!`,
    '-1': `⚫ ${conductor}, tu ${documentType} de ${placa} está VENCIDO desde hace ${Math.abs(daysRemaining)} días. Regulariza tu situación.`
  };

  // Buscar mensaje más cercano
  const thresholds = [30, 15, 7, 0, -1];
  const threshold = thresholds.find(t => daysRemaining >= t) ?? -1;
  
  return messages[threshold.toString()] || messages['-1'];
}

/**
 * Determinar nivel de alerta y color
 */
export function getAlertLevel(daysRemaining: number): {
  level: 'info' | 'warning' | 'urgent' | 'critical' | 'overdue';
  color: string;
  priority: number;
} {
  if (daysRemaining >= 30) return { level: 'info', color: 'green', priority: 1 };
  if (daysRemaining >= 15) return { level: 'warning', color: 'yellow', priority: 2 };
  if (daysRemaining >= 7) return { level: 'urgent', color: 'orange', priority: 3 };
  if (daysRemaining >= 0) return { level: 'critical', color: 'red', priority: 4 };
  return { level: 'overdue', color: 'black', priority: 5 };
}