// src/types/index.ts

export type UserRole = 'admin' | 'brigadista' | 'ciudadano';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  municipio?: string;
  telefono?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  // Para brigadistas
  zonaAsignada?: string[];
  // Para ciudadanos
  vehiculos?: string[];
}

export interface Vehicle {
  id: string;
  placa: string;
  conductor: string;
  cedula?: string;
  telefono: string;
  departamento: string;
  municipio?: string;
  tipoVehiculo: 'carro' | 'moto' | 'camion' | 'bus' | 'otro';
  documentos: VehicleDocument[];
  fotos?: string[];
  isActive: boolean;
  userId?: string;
  brigadistaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VehicleDocument {
  type: 'SOAT' | 'Tecnomecánica' | 'Licencia' | 'Otros';
  expiryDate: string;
  imageUrl?: string;
  lastAlertSent?: Record<string, unknown>;
}

export interface Alert {
  id: string;
  vehicleId: string;
  placa: string;
  documentType: string;
  daysRemaining: number;
  alertLevel: 'info' | 'warning' | 'urgent' | 'critical' | 'overdue';
  message: string;
  sentAt: Date;
  channels: {
    whatsapp: boolean;
    sms: boolean;
  };
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdBy: string;
  brigadistas: string[];
  targetSegment?: {
    tipoVehiculo?: string[];
    estadoDocumento?: string;
    departamento?: string[];
  };
  formFields: FormField[];
  publicUrl: string;
  stats: {
    totalResponses: number;
    completedResponses: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'image' | 'document' | 'textarea' | 'checkbox';
  required: boolean;
  options?: { label: string; value: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  placeholder?: string;
  helperText?: string;
}

// Departamentos de Colombia para selects
export const DEPARTAMENTOS_COLOMBIA = [
  'AMAZONAS', 'ANTIOQUIA', 'ARAUCA', 'ATLANTICO', 'BOLIVAR', 'BOYACA', 'CALDAS',
  'CAQUETA', 'CASANARE', 'CAUCA', 'CESAR', 'CHOCO', 'CORDOBA', 'CUNDINAMARCA',
  'GUAINIA', 'GUAVIARE', 'HUILA', 'LA_GUAJIRA', 'MAGDALENA', 'META', 'NARINO',
  'NORTE_DE_SANTANDER', 'PUTUMAYO', 'QUINDIO', 'RISARALDA', 'SAN_ANDRES',
  'SANTANDER', 'SUCRE', 'TOLIMA', 'VALLE', 'VAUPES', 'VIDES'
] as const;

export type DepartamentoColombia = typeof DEPARTAMENTOS_COLOMBIA[number];