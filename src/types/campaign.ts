export type FieldType = 'text' | 'number' | 'select' | 'date' | 'image' | 'document' | 'textarea' | 'checkbox';

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
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
    estadoSOAT?: 'vigente' | 'vencido' | 'cercano';
    departamento?: string[];
  };
  formFields: FormField[];
  publicUrl: string;
  stats: {
    totalResponses: number;
    completedResponses: number;
    lastResponseAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Tipo seguro para respuestas dinámicas
export type FormFieldValue = string | number | boolean | Date | File | null;

export interface CampaignResponse {
  id: string;
  campaignId: string;
  userId?: string;
  anonymousToken?: string;
  data: Record<string, FormFieldValue>; // ✅ Reemplaza 'any'
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