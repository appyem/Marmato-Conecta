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
  vehiculos?: string[]; // IDs de vehículos registrados
}