export type FieldType = 'text' | 'number' | 'select' | 'date' | 'image' | 'document' | 'textarea' | 'checkbox';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: { label: string; value: string }[]; // Para select
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

export interface Campaign {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdBy: string; // UID del admin
  brigadistas: string[]; // UIDs asignados
  targetSegment?: {
    tipoVehiculo?: string[];
    estadoSOAT?: 'vigente' | 'vencido' | 'cercano';
    departamento?: string[];
  };
  formFields: FormField[];
  publicUrl: string; // Enlace único para ciudadanos
  stats: {
    totalResponses: number;
    completedResponses: number;
    lastResponseAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignResponse {
  id: string;
  campaignId: string;
  userId?: string; // Si está autenticado
  anonymousToken?: string; // Para respuestas anónimas
  data: Record<string, any>;
  submittedAt: Date;
  location?: {
    lat?: number;
    lng?: number;
    municipio?: string;
  };
  deviceInfo?: {
    userAgent: string;
    platform: string;
  };
}