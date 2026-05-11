'use client';

import { Grid, Card, CardContent, Typography, Box, LinearProgress, TextField, Button, FormControl, InputLabel, Select, MenuItem, Alert, SelectChangeEvent, IconButton } from '@mui/material';

import { CarRepair, Warning, CheckCircle, TrendingUp, TableChart, Notifications, Add, ArrowBack, Save, Assessment, ContentCopy, Edit, Delete } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

import { useEffect, useState, ChangeEvent, FormEvent, useCallback } from 'react';


import { 
  createUserWithEmailAndPassword 
} from 'firebase/auth';

import { collection, addDoc, query, where, getDocs, deleteDoc, doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';


import { db, auth } from '@/lib/firebase'; // ← Si no está 'auth', agrégalo

type DepartmentStat = { name: string; value: number };
type StatusStat = { name: string; value: number; color: string };

interface DashboardStats {
  totalVehicles: number;
  vehiclesInMarmato: number;
  upcomingExpirations: number;
  activeCampaigns: number;
  byDepartment: DepartmentStat[];
  byStatus: StatusStat[];
}

interface VehicleDoc {
  expiryDate: string;
  type?: string;
}

interface VehicleData {
  id?: string;
  placa: string;
  conductor: string;
  departamento: string;
  municipio?: string;
  transito?: string;  // ✅ AGREGAR ESTA LÍNEA
  documentos?: VehicleDoc[];
  isActive?: boolean;
}

// ✅ Tipo para nuevo vehículo (formulario)
interface NewVehicleForm {
  placa: string;
  conductor: string;
  departamento: string;
  municipio: string;  // ✅ Nuevo campo: ciudad/municipio libre
  soatExpiry?: string;
  tecnoExpiry?: string;
}

type StatusConfig = { label: string; color: 'success' | 'warning' | 'error' };
type DashboardTab = 'resumen' | 'vehiculos' | 'alertas' | 'campanas' | 'reportes' | 'brigadistas';

// ✅ Departamentos de Caldas (para dropdown)
const COLOMBIA_DEPARTAMENTOS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 
  'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 
  'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 
  'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 
  'San Andrés, Providencia y Santa Catalina', 'Santander', 'Sucre', 'Tolima', 
  'Valle del Cauca', 'Vaupés', 'Vichada'
].sort();

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('resumen');

  // ✅ Estado para vehículos
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDept, setFilterDept] = useState<string>('');

  // ✅ Estado para formulario de crear vehículo
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [formData, setFormData] = useState<NewVehicleForm>({
  placa: '',
  conductor: '',
  departamento: '',
  municipio: '',  // ✅ Inicializar campo nuevo
  soatExpiry: '',
  tecnoExpiry: ''
});

  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // ✅ Fetch de KPIs (siempre)
  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      try {
        setLoading(true);
        const vehiclesRef = collection(db, 'vehicles');
        const q = query(vehiclesRef, where('isActive', '==', true));
        const snapshot = await getDocs(q);
        
        const vehiclesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<{ id: string } & VehicleData>;
        
        const byDepartment: Record<string, number> = {};
        const byStatus: Record<string, number> = { vigente: 0, cercano: 0, vencido: 0 };
        let upcomingExpirations = 0;
        const now = new Date();
        const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        vehiclesData.forEach((v) => {
          const dept = v.departamento || v.transito || 'SIN DEPARTAMENTO';
          byDepartment[dept] = (byDepartment[dept] || 0) + 1;
          
          v.documentos?.forEach((doc) => {
            const expiry = new Date(doc.expiryDate);
            if (expiry < now) {
              byStatus.vencido = (byStatus.vencido || 0) + 1;
            } else if (expiry < threshold) {
              byStatus.cercano = (byStatus.cercano || 0) + 1;
              upcomingExpirations++;
            } else {
              byStatus.vigente = (byStatus.vigente || 0) + 1;
            }
          });
        });

        let activeCampaignsCount = 0;
        try {
          const campaignsRef = collection(db, 'campaigns');
          const qCamp = query(campaignsRef, where('isActive', '==', true), where('endDate', '>=', now));
          const campaignSnapshot = await getDocs(qCamp);
          activeCampaignsCount = campaignSnapshot.size;
        } catch (err) {
          console.warn('Warning: Could not fetch campaigns for KPI:', err);
        }

        setStats({
          totalVehicles: vehiclesData.length,
          vehiclesInMarmato: byDepartment['CALDAS'] || 0,
          upcomingExpirations,
          activeCampaigns: activeCampaignsCount,
          byDepartment: Object.entries(byDepartment).map(([name, value]) => ({ name, value })),
          byStatus: [
            { name: 'Vigente', value: byStatus.vigente || 0, color: '#22c55e' },
            { name: 'Próximo', value: byStatus.cercano || 0, color: '#eab308' },
            { name: 'Vencido', value: byStatus.vencido || 0, color: '#ef4444' },
          ]
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

    // ✅ Escuchar cambios de hash en tiempo real (Sidebar → Contenido)
  useEffect(() => {
    const updateTabFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (['resumen', 'vehiculos', 'alertas', 'campanas', 'reportes', 'brigadistas'].includes(hash)) {
        setActiveTab(hash as DashboardTab);
      }
    };

    updateTabFromHash(); // Ejecutar al montar
    window.addEventListener('hashchange', updateTabFromHash);
    return () => window.removeEventListener('hashchange', updateTabFromHash);
  }, []);

  // ✅ Fetch de vehículos (solo cuando se activa la tab)
  useEffect(() => {
    if (activeTab === 'vehiculos' && !showForm) {
      const fetchVehicles = async (): Promise<void> => {
        try {
          setVehiclesLoading(true);
          const vehiclesRef = collection(db, 'vehicles');
          const snapshot = await getDocs(vehiclesRef);
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleData));
          setVehicles(data);
        } catch (err) {
          console.error('Error fetching vehicles:', err);
        } finally {
          setVehiclesLoading(false);
        }
      };
      fetchVehicles();
    }
  }, [activeTab, showForm]);

  // ✅ Función getStatus
  const getStatus = (v: VehicleData): StatusConfig => {
    const now = new Date();
    const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const docs = v.documentos || [];
    for (const doc of docs) {
      const exp = new Date(doc.expiryDate);
      if (exp < now) return { label: 'Vencido', color: 'error' };
    }
    for (const doc of docs) {
      const exp = new Date(doc.expiryDate);
      if (exp < threshold) return { label: 'Próximo', color: 'warning' };
    }
    return { label: 'Vigente', color: 'success' };
  };

  const uniqueDepts = Array.from(new Set(vehicles.map(v => v.departamento))).sort();
  const filteredVehicles = vehicles.filter(v => {
    const matchSearch = v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        v.conductor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = filterDept === '' || v.departamento === filterDept;
    return matchSearch && matchDept;
  });

  

  // ✅ Handlers para formulario
  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
    setFormSuccess('');
  };

  // ✅ Agregar esta función justo después de handleFormChange:
const handleSelectChange = (event: SelectChangeEvent<string>): void => {
  const { name, value } = event.target;
  setFormData(prev => ({ ...prev, [name]: value }));
  setFormError('');
  setFormSuccess('');
};

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // ✅ Validaciones básicas
    if (!formData.placa.trim() || !formData.conductor.trim() || !formData.departamento) {
      setFormError('Placa, conductor y departamento son obligatorios');
      return;
    }

    try {
      setFormLoading(true);
      
      // ✅ Preparar documento para Firestore
      const newVehicle = {
  placa: formData.placa.toUpperCase().trim(),
  conductor: formData.conductor.trim(),
  departamento: formData.departamento,
  municipio: formData.municipio.trim(),  // ✅ Agregar municipio
  documentos: [] as VehicleDoc[],
  isActive: true,
  createdAt: new Date(),
  createdBy: user?.uid || 'system'
};

      // ✅ Agregar SOAT si hay fecha
      if (formData.soatExpiry) {
        newVehicle.documentos.push({ type: 'SOAT', expiryDate: formData.soatExpiry });
      }
      // ✅ Agregar Tecnomecánica si hay fecha
      if (formData.tecnoExpiry) {
        newVehicle.documentos.push({ type: 'Tecnomecánica', expiryDate: formData.tecnoExpiry });
      }

      // ✅ Guardar en Firestore
            // ✅ Guardar en Firestore (crear o editar)
      if (editingVehicleId) {
        // Modo edición: actualizar documento existente
        await updateDoc(doc(db, 'vehicles', editingVehicleId), newVehicle);
        setVehicles(prev => prev.map(v => v.id === editingVehicleId ? { ...v, ...newVehicle, id: editingVehicleId } : v));
        setEditingVehicleId(null); // Resetear estado de edición
      } else {
        // Modo creación: agregar nuevo documento
        const docRef = await addDoc(collection(db, 'vehicles'), newVehicle);
        setVehicles(prev => [...prev, { ...newVehicle, id: docRef.id }]);
      }

      // ✅ Feedback y reset
      setFormSuccess('Vehículo registrado exitosamente');
      setFormData({ 
  placa: '', 
  conductor: '', 
  departamento: '', 
  municipio: '',  // ✅ Resetear nuevo campo
  soatExpiry: '', 
  tecnoExpiry: '' 
});

   setStats(prev => prev ? { ...prev, totalVehicles: prev.totalVehicles + 1 } : null);
      
      // ✅ Refrescar lista después de 1 segundo
      setTimeout(() => {
        setShowForm(false);
        // Trigger re-fetch by toggling activeTab briefly
        if (activeTab === 'vehiculos') {
          const currentVehicles = [...vehicles];
          setVehicles([]);
          setTimeout(() => setVehicles(currentVehicles), 100);
        }
      }, 1500);

    } catch (err) {
      console.error('Error creating vehicle:', err);
      setFormError('Error al guardar. Intenta nuevamente.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelForm = (): void => {
    setEditingVehicleId(null);
    setShowForm(false);
    setFormData({ 
  placa: '', 
  conductor: '', 
  departamento: '', 
  municipio: '',  // ✅ Resetear nuevo campo
  soatExpiry: '', 
  tecnoExpiry: '' 
});
    setFormError('');
    setFormSuccess('');
  };


    // ✅ ESTADOS Y LÓGICA PARA REPORTES
  const [reportFilters, setReportFilters] = useState({ startDate: '', endDate: '', dept: '' });

  const handleReportChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setReportFilters(prev => ({ ...prev, [name]: value }));
  };

  // Filtrar vehículos existentes (sin llamadas extra a Firestore)
  const filteredForReport = vehicles.filter(v => {
    const matchDept = reportFilters.dept === '' || v.departamento === reportFilters.dept;
    let matchDate = true;
    if (reportFilters.startDate || reportFilters.endDate) {
      const docs = v.documentos || [];
      const hasInRange = docs.some(doc => {
        const d = new Date(doc.expiryDate);
        if (reportFilters.startDate && d < new Date(reportFilters.startDate)) return false;
        if (reportFilters.endDate && d > new Date(reportFilters.endDate)) return false;
        return true;
      });
      matchDate = hasInRange || docs.length === 0;
    }
    return matchDept && matchDate;
  });

  const reportSummary = {
    total: filteredForReport.length,
    vigente: filteredForReport.filter(v => getStatus(v).color === 'success').length,
    proximo: filteredForReport.filter(v => getStatus(v).color === 'warning').length,
    vencido: filteredForReport.filter(v => getStatus(v).color === 'error').length,
  };


    // ✅ FUNCIÓN PARA EXPORTAR CSV
  const handleExportCSV = (): void => {
    if (filteredForReport.length === 0) {
      alert("No hay datos para exportar con los filtros actuales");
      return;
    }

    // 1. Definir encabezados
    const headers = ["Placa", "Conductor", "Departamento", "Municipio", "Estado", "Docs"];

    // 2. Mapear datos
    const rows = filteredForReport.map(v => [
      v.placa,
      v.conductor,
      v.departamento,
      v.municipio || 'N/A',
      getStatus(v).label,
      v.documentos?.length || 0
    ]);

    // 3. Crear contenido CSV
    // Agregamos \uFEFF (BOM) para que Excel abra bien las tildes y ñ
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");

    // 4. Generar descarga
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Reporte_Marmato_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  
    // ✅ ESTADOS Y LÓGICA PARA BRIGADISTAS
  interface Brigadista {
    uid: string;
    email: string;
    displayName: string;
    role: 'brigadista' | 'admin';
    municipio?: string;
    telefono?: string;
    createdAt?: Timestamp | Date;
  }
  const [brigadistas, setBrigadistas] = useState<Brigadista[]>([]);
  const [showBrigForm, setShowBrigForm] = useState(false);
  const [brigLoading, setBrigLoading] = useState(false);
  const [brigMsg, setBrigMsg] = useState<{type:'success'|'error',text:string}|null>(null);
  const [brigForm, setBrigForm] = useState({ email: '', password: '', displayName: '', municipio: '', telefono: '' });

  const handleBrigChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setBrigForm(prev => ({ ...prev, [name]: value }));
    setBrigMsg(null);
  };

  const handleCreateBrigadista = async (e: FormEvent): Promise<void> => {
    e.preventDefault(); setBrigLoading(true); setBrigMsg(null);
    if (!brigForm.email || !brigForm.password || !brigForm.displayName) {
      setBrigMsg({ type: 'error', text: 'Email, contraseña y nombre son obligatorios' });
      setBrigLoading(false); return;
    }
    try {
      // 1. Crear usuario en Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, brigForm.email, brigForm.password);
      // 2. Guardar perfil en Firestore
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: brigForm.email,
        displayName: brigForm.displayName,
        role: 'brigadista',
        municipio: brigForm.municipio,
        telefono: brigForm.telefono,
        createdAt: new Date(),
        createdBy: user?.uid
      });
      // 3. Feedback
      setBrigMsg({ type: 'success', text: 'Brigadista creado exitosamente' });
      setBrigForm({ email: '', password: '', displayName: '', municipio: '', telefono: '' });
      setTimeout(() => setShowBrigForm(false), 1500);
      // 4. Refrescar lista
      fetchBrigadistas();
    } catch (err: unknown) {
      console.error('Error creando brigadista:', err);
      const message = err instanceof Error ? err.message : 'Error al crear usuario';
      setBrigMsg({ type: 'error', text: message });
    } finally { setBrigLoading(false); }
  };

  const fetchBrigadistas = useCallback(async (): Promise<void> => {
    try {
      // Nota: Para producción, usar índice compuesto o query más eficiente
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs
        .map(d => d.data() as Brigadista)
        .filter(u => u.role === 'brigadista');
      setBrigadistas(list);
    } catch (err: unknown) { 
  console.error('Error fetching brigadistas:', err instanceof Error ? err.message : String(err)); 
}
  }, []);

  useEffect(() => {
    if (activeTab === 'brigadistas') fetchBrigadistas();
  }, [activeTab, fetchBrigadistas]);

 

// ✅ Tipo para items de alerta
type AlertItem = {
  vehicleId: string;
  placa: string;
  conductor: string;
  departamento: string;
  municipio: string;
  docType: string;
  expiryDate: string;
  daysLeft: number;
  notified?: boolean;
};

// ✅ Calcular alertas a partir de vehicles
const calculateAlerts = (): { vencidos: AlertItem[]; proximos7: AlertItem[]; proximos30: AlertItem[] } => {
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const vencidos: AlertItem[] = [];
  const proximos7: AlertItem[] = [];
  const proximos30: AlertItem[] = [];

  vehicles.forEach(v => {
    v.documentos?.forEach(doc => {
      const exp = new Date(doc.expiryDate);
      const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const alert: AlertItem = {
        vehicleId: v.id || '',
        placa: v.placa,
        conductor: v.conductor,
        departamento: v.departamento,
        municipio: v.municipio || '',
        docType: doc.type || 'Documento',
        expiryDate: doc.expiryDate,
        daysLeft,
        notified: false
      };

      if (exp < now) vencidos.push(alert);
      else if (exp <= sevenDays) proximos7.push(alert);
      else if (exp <= thirtyDays) proximos30.push(alert);
    });
  });

  return { 
    vencidos: vencidos.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()),
    proximos7: proximos7.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()),
    proximos30: proximos30.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
  };
};

const alerts = calculateAlerts();

// ✅ Handler para marcar alerta como notificada
const handleMarkNotified = (vehicleId: string, docType: string): void => {
  console.log(`✓ Marcado como notificado: ${vehicleId} - ${docType}`);
};


  // ✅ Función para copiar mensaje de WhatsApp prellenado
  const copyWhatsAppMessage = (a: AlertItem): void => {
    const expiryDate = new Date(a.expiryDate).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    
    const message = `Hola ${a.conductor}, te recordamos que tu ${a.docType} con placa ${a.placa.toUpperCase()} vence el ${expiryDate}. Por favor regulariza tu situación para evitar sanciones. Conecta Marmato.`;
    
    // Codificar para URL de WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Copiar mensaje al portapapeles
    navigator.clipboard.writeText(message).then(() => {
      setCampaignMsg({ type: 'success', text: '✅ Mensaje copiado. Pégalo en WhatsApp para enviar.' });
      // Abrir WhatsApp en nueva pestaña (usuario decide a quién enviarlo)
      window.open(whatsappUrl, '_blank');
    }).catch(() => {
      setCampaignMsg({ type: 'error', text: '❌ No se pudo copiar el mensaje' });
    });
  };


  // ✅ TIPO Y ESTADOS PARA CAMPAÑAS
  interface Campaign {
    id?: string;
    name: string;
    type: 'SOAT' | 'Tecnomecánica' | 'General' | 'Impuesto Vehicular';
    targetDept: string;
    scheduledDate: string;
    status: 'programada' | 'enviada' | 'borrador';
    message: string;
  }
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCampaignForm, setShowCampaignForm] = useState<boolean>(false);
  const [campaignLoading, setCampaignLoading] = useState<boolean>(false);
  const [campaignMsg, setCampaignMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [lastCampaignId, setLastCampaignId] = useState<string | null>(null);
  const [campaignFormData, setCampaignFormData] = useState<Omit<Campaign, 'id' | 'status'>>({
    name: '', type: 'SOAT', targetDept: '', scheduledDate: '', message: ''
  });



    // ✅ HANDLERS Y FETCH PARA CAMPAÑAS
  const handleCampaignChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>): void => {
    const { name, value } = e.target;
    setCampaignFormData(prev => ({ ...prev, [name]: value }));
    setCampaignMsg(null);
  };

  const handleCreateCampaign = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault(); setCampaignLoading(true); setCampaignMsg(null);
    if (!campaignFormData.name.trim() || !campaignFormData.targetDept || !campaignFormData.scheduledDate) {
      setCampaignMsg({ type: 'error', text: 'Nombre, departamento y fecha son obligatorios' });
      setCampaignLoading(false); return;
    }
    try {
      const docRef = await addDoc(collection(db, 'campaigns'), { ...campaignFormData, status: 'programada' });
      setLastCampaignId(docRef.id); // ✅ Guardar ID para generar link
      setCampaignMsg({ type: 'success', text: 'Campaña programada exitosamente' });
      setCampaignFormData({ name: '', type: 'SOAT', targetDept: '', scheduledDate: '', message: '' });
      setTimeout(() => setShowCampaignForm(false), 1500);
    } catch (err) { console.error('Error fetching campañas:', err); }
    finally { setCampaignLoading(false); }
  };


    // ✅ Función para copiar link de campaña al portapapeles
  const copyCampaignLink = (campaignId: string): void => {
    // Usar origen real en producción, localhost en desarrollo
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const link = `${origin}/c/${campaignId}`;
    
    navigator.clipboard.writeText(link).then(() => {
      // Feedback visual temporal
      const originalMsg = campaignMsg?.text;
      setCampaignMsg({ type: 'success', text: '🔗 Link copiado al portapapeles' });
      setTimeout(() => {
        if (originalMsg) setCampaignMsg({ type: 'success', text: originalMsg });
      }, 3000);
    }).catch(() => {
      setCampaignMsg({ type: 'error', text: '❌ No se pudo copiar el link' });
    });
  };



     // ✅ Compartir campaña por WhatsApp Web con número y disclaimer institucional
  const shareCampaignWhatsApp = (campaignId: string, campaignName: string): void => {
    // 1. Solicitar número de teléfono
    const phoneNumber = window.prompt('Ingrese el número del brigadista (ej: 573001234567):');
    
    if (!phoneNumber || phoneNumber.trim() === '') {
      setCampaignMsg({ type: 'error', text: '❌ Operación cancelada o número vacío.' });
      return;
    }

    // 2. Limpiar y validar solo dígitos
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setCampaignMsg({ type: 'error', text: '❌ Número inválido. Ingrese al menos 10 dígitos con código de país (57).' });
      return;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const link = `${origin}/c/${campaignId}`;

    // 3. Mensaje institucional + enlace
    const message = `📢 *${campaignName} - Conecta Marmato*\n\n` +
      `🔗 Enlace de caracterización: ${link}\n\n` +
      `⚠️ *AVISO OFICIAL:*\n` +
      `Este enlace es de uso exclusivo y privado para brigadistas autorizados. La Alcaldía de Marmato no se hace responsable por el uso indebido de esta plataforma ni por la divulgación del enlace a terceros. La custodia, manejo y correcta utilización del mismo es responsabilidad exclusiva del brigadista asignado. Su uso indebido podrá acarrear las sanciones administrativas correspondientes.\n\n` +
      `Por favor, diligencie el formulario exclusivamente por este canal autorizado. Gracias por su compromiso. 🚗💙`;

    // 4. Codificar y abrir WhatsApp Web
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  // Fetch campañas al entrar a la tab
  useEffect(() => {
    if (activeTab === 'campanas') {
      const fetch = async (): Promise<void> => {
        try {
          const snap = await getDocs(collection(db, 'campaigns'));
          setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Campaign));
        } catch (err) { console.error('Error fetching campaigns:', err); }
      };
      fetch();
    }
  }, [activeTab]);




    // ✅ Editar campaña: recarga el formulario con los datos existentes
  const handleEditCampaign = (campaign: Campaign): void => {
    setCampaignFormData({
      name: campaign.name,
      type: campaign.type,
      targetDept: campaign.targetDept,
      scheduledDate: campaign.scheduledDate,
      message: campaign.message
    });
    setShowCampaignForm(true);
    setCampaignMsg({ type: 'success', text: `✏️ Editando: ${campaign.name}` });
  };

  // ✅ Eliminar campaña: confirmación + Firestore delete
  const handleDeleteCampaign = async (campaignId: string, campaignName: string): Promise<void> => {
    if (!window.confirm(`¿Eliminar campaña "${campaignName}"? Esta acción no se puede deshacer.`)) return;
    
    try {
      await deleteDoc(doc(db, 'campaigns', campaignId));
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      setCampaignMsg({ type: 'success', text: '🗑️ Campaña eliminada' });
    } catch (err: unknown) {
      console.error('Error deleting campaign:', err);
      const message = err instanceof Error ? err.message : 'Error al eliminar';
      setCampaignMsg({ type: 'error', text: message });
    }
  };



    // ✅ Editar vehículo: recarga el formulario con los datos existentes
  const handleEditVehicle = (vehicle: VehicleData): void => {
    setFormData({
      placa: vehicle.placa,
      conductor: vehicle.conductor,
      departamento: vehicle.departamento,
      municipio: vehicle.municipio || '',
      soatExpiry: vehicle.documentos?.find(d => d.type === 'SOAT')?.expiryDate || '',
      tecnoExpiry: vehicle.documentos?.find(d => d.type === 'Tecnomecánica')?.expiryDate || ''
    });
    setEditingVehicleId(vehicle.id || null);
    setShowForm(true);
    setFormSuccess('✏️ Editando vehículo');
  };

  // ✅ Eliminar vehículo: confirmación + Firestore delete
  const handleDeleteVehicle = async (vehicleId: string, placa: string): Promise<void> => {
    if (!window.confirm(`¿Eliminar vehículo con placa "${placa}"? Esta acción no se puede deshacer.`)) return;
    
    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      setFormSuccess('🗑️ Vehículo eliminado');
      // Limpiar mensaje después de 2 segundos
      setTimeout(() => setFormSuccess(''), 2000);
    } catch (err: unknown) {
      console.error('Error deleting vehicle:', err);
      const message = err instanceof Error ? err.message : 'Error al eliminar';
      setFormError(message);
    }
  };



  if (loading) {

   
  return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" fontWeight={600}>Dashboard</Typography>
        <Typography variant="body1" color="text.secondary">
          Bienvenido, {profile?.displayName}. Resumen de tu gestión.
        </Typography>
      </Box>

      

      {/* Contenido: Resumen */}
      {activeTab === 'resumen' && stats && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CarRepair /><Typography variant="h4" fontWeight={700}>{stats.totalVehicles}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Vehículos registrados</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: stats.vehiclesInMarmato ? 'success.main' : 'grey.400', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircle /><Typography variant="h4" fontWeight={700}>{stats.vehiclesInMarmato}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Pagan en Marmato</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: stats.upcomingExpirations ? 'warning.main' : 'grey.400', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Warning /><Typography variant="h4" fontWeight={700}>{stats.upcomingExpirations}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Vencimientos próximos</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <TrendingUp /><Typography variant="h4" fontWeight={700}>{stats.activeCampaigns}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Campañas activas</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card><CardContent>
                <Typography variant="h6" gutterBottom>Vehículos por departamento</Typography>
                <Box sx={{ height: 300, minHeight: 300, width: '100%', minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <BarChart data={stats.byDepartment}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} /><YAxis /><Tooltip /><Bar dataKey="value" fill="#1a365d" radius={[4, 4, 0, 0]} /></BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card><CardContent>
                <Typography variant="h6" gutterBottom>Estado de documentos</Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={stats.byStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={(props) => { const safeName = props.name ?? 'Sin nombre'; const safePercent = props.percent ?? 0; return `${safeName} ${(safePercent * 100).toFixed(0)}%`; }}>{stats.byStatus.map((entry, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent></Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Contenido: Vehículos */}
      {activeTab === 'vehiculos' && (
        <Box>
          {/* Header de la sección Vehículos */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>
              {showForm ? 'Nuevo Vehículo' : 'Listado de Vehículos'}
            </Typography>
            <Box>
              {showForm ? (
                <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleCancelForm} size="small">
                  Cancelar
                </Button>
              ) : (
                <Button variant="contained" startIcon={<Add />} onClick={() => setShowForm(true)} size="small">
                  Nuevo vehículo
                </Button>
              )}
            </Box>
          </Box>

          {/* FORMULARIO DE CREAR VEHÍCULO */}
          {showForm && (
            <Card sx={{ mb: 3, border: '1px solid', borderColor: 'primary.light' }}>
              <CardContent>
                {formError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError('')}>{formError}</Alert>}
                {formSuccess && <Alert severity="success" sx={{ mb: 2 }}>{formSuccess}</Alert>}
                
                <form onSubmit={handleSubmit}>
                  <Grid container spacing={2}>
                    {/* Placa */}
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth required label="Placa" name="placa" value={formData.placa} onChange={handleFormChange} placeholder="ABC123" InputProps={{ sx: { textTransform: 'uppercase' } }} disabled={formLoading} />
                    </Grid>
                    {/* Conductor */}
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth required label="Conductor" name="conductor" value={formData.conductor} onChange={handleFormChange} placeholder="Nombre completo" disabled={formLoading} />
                    </Grid>
                    {/* Departamento */}
                    <Grid item xs={12} sm={6}>
  <FormControl fullWidth required>
    <InputLabel>Departamento</InputLabel>
    <Select 
      label="Departamento" 
      name="departamento" 
      value={formData.departamento} 
      onChange={handleSelectChange} 
      disabled={formLoading}
    >
      <MenuItem value=""><em>Seleccionar departamento...</em></MenuItem>
      {COLOMBIA_DEPARTAMENTOS.map(dept => (
        <MenuItem key={dept} value={dept}>{dept}</MenuItem>
      ))}
    </Select>
  </FormControl>
</Grid>
  

  {/* Municipio/Ciudad (texto libre) */}
<Grid item xs={12} sm={6}>
  <TextField 
    fullWidth 
    required 
    label="Municipio/Ciudad" 
    name="municipio" 
    value={formData.municipio} 
    onChange={handleFormChange} 
    placeholder="Ej: Marmato, Manizales, Bogotá..." 
    disabled={formLoading} 
  />
</Grid> 


                    {/* SOAT Expiry */}
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth type="date" label="Vencimiento SOAT" name="soatExpiry" value={formData.soatExpiry} onChange={handleFormChange} InputLabelProps={{ shrink: true }} disabled={formLoading} />
                    </Grid>
                    {/* Tecnomecánica Expiry */}
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth type="date" label="Vencimiento Tecnomecánica" name="tecnoExpiry" value={formData.tecnoExpiry} onChange={handleFormChange} InputLabelProps={{ shrink: true }} disabled={formLoading} />
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button variant="outlined" onClick={handleCancelForm} disabled={formLoading}>Cancelar</Button>
                    <Button type="submit" variant="contained" startIcon={<Save />} disabled={formLoading}>
                      {formLoading ? 'Guardando...' : 'Guardar Vehículo'}
                    </Button>
                  </Box>
                </form>
              </CardContent>
            </Card>
          )}

          {/* LISTA DE VEHÍCULOS (solo si no está mostrando el formulario) */}
          {!showForm && (
            <>
              {/* Filtros */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField placeholder="Buscar por placa o conductor..." value={searchTerm} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: <><CarRepair sx={{ mr: 1, color: 'action.active' }} /></> }} sx={{ flex: 1, minWidth: 200 }} size="small" />
                    <TextField select value={filterDept} onChange={(e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setFilterDept(e.target.value)} label="Departamento" SelectProps={{ native: true }} sx={{ minWidth: 180 }} size="small">
                      <option value="">Todos</option>
                      {uniqueDepts.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </TextField>
                  </Box>
                </CardContent>
              </Card>

              {/* Tabla */}
              <Card>
                <CardContent>
                  {vehiclesLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><LinearProgress sx={{ width: '100%', maxWidth: 400 }} /></Box>
                  ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                      <TableChart sx={{ minWidth: 650 }} />
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                            <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Placa</th>
                            <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Conductor</th>
                            <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Departamento</th>
                            <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Estado</th>
                            <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Documentos</th>
                            <th style={{ textAlign: 'left', padding: '12px', fontWeight: 600 }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVehicles.map(v => {
                            const status = getStatus(v);


                            return (
                              <tr key={v.id || v.placa} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 500 }}>{v.placa}</td>
                                <td style={{ padding: '12px' }}>{v.conductor}</td>
                                <td style={{ padding: '12px' }}>{v.departamento}</td>
                                <td style={{ padding: '12px' }}><span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', backgroundColor: status.color === 'success' ? '#dcfce7' : status.color === 'warning' ? '#fef3c7' : '#fee2e2', color: status.color === 'success' ? '#166534' : status.color === 'warning' ? '#92400e' : '#991b1b' }}>{status.label}</span></td>
                                <td style={{ padding: '12px', color: '#666' }}>{v.documentos?.length || 0} doc(s)</td>
                                <td style={{ padding: '12px' }}><Box sx={{ display: 'flex', gap: 0.5 }}><IconButton size="small" onClick={() => handleEditVehicle(v)} aria-label="Editar"><Edit fontSize="small" /></IconButton><IconButton size="small" onClick={() => handleDeleteVehicle(v.id!, v.placa)} aria-label="Eliminar" color="error"><Delete fontSize="small" /></IconButton></Box></td>
                              </tr>
                            );
                          })}
                          {filteredVehicles.length === 0 && (
                            <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>No se encontraron vehículos</td></tr>
                          )}
                        </tbody>
                      </table>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </Box>
      )}

      {/* Alertas y Campañas (placeholders) */}
      {activeTab === 'alertas' && (
  <Box>
    <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>🔔 Panel de Alertas</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
      Documentos por vencer o vencidos. Prioriza por urgencia.
    </Typography>

    {/* Estado de carga */}
    {vehiclesLoading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><LinearProgress sx={{ width: '100%', maxWidth: 400 }} /></Box>
    ) : (
      <Grid container spacing={3}>
        {/* 🔴 VENCIDOS */}
        <Grid item xs={12}>
          <Card sx={{ border: '2px solid', borderColor: 'error.main', bgcolor: 'error.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Warning color="error" /><Typography variant="h6" fontWeight={600} color="error.main">Vencidos ({alerts.vencidos.length})</Typography>
              </Box>
              {alerts.vencidos.length === 0 ? (
                <Typography color="text.secondary">¡Sin documentos vencidos! 🎉</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {alerts.vencidos.map((a: AlertItem, idx: number) => (
                    <Box key={`${a.vehicleId}-${a.docType}-${idx}`} sx={{ p: 2, bgcolor: 'white', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography fontWeight={500}>{a.placa} • {a.conductor}</Typography>
                        <Typography variant="body2" color="text.secondary">{a.docType} venció el {new Date(a.expiryDate).toLocaleDateString('es-CO')}</Typography>
                        <Typography variant="caption" color="error.main">📍 {a.departamento} - {a.municipio}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
  <Button size="small" variant="text" color="primary" onClick={() => copyWhatsAppMessage(a)}>
    📱 WhatsApp
  </Button>
  <Button size="small" variant="outlined" color="error" onClick={() => handleMarkNotified(a.vehicleId, a.docType)} disabled={a.notified}>
    {a.notified ? '✓ Notificado' : 'Marcar notificado'}
  </Button>
</Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 🟡 Vencen en ≤7 días */}
        <Grid item xs={12}>
          <Card sx={{ border: '2px solid', borderColor: 'warning.main', bgcolor: 'warning.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Warning color="warning" /><Typography variant="h6" fontWeight={600} color="warning.main">Vencen en ≤7 días ({alerts.proximos7.length})</Typography>
              </Box>
              {alerts.proximos7.length === 0 ? (
                <Typography color="text.secondary">Sin alertas críticas esta semana</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {alerts.proximos7.map((a, idx) => (
                    <Box key={`${a.vehicleId}-${a.docType}-${idx}`} sx={{ p: 2, bgcolor: 'white', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography fontWeight={500}>{a.placa} • {a.conductor}</Typography>
                        <Typography variant="body2" color="text.secondary">{a.docType} vence el {new Date(a.expiryDate).toLocaleDateString('es-CO')} ({a.daysLeft} días)</Typography>
                        <Typography variant="caption" color="text.secondary">📍 {a.departamento} - {a.municipio}</Typography>
                      </Box>
                      <Button size="small" variant="outlined" color="warning" onClick={() => handleMarkNotified(a.vehicleId, a.docType)} disabled={a.notified}>
                        {a.notified ? '✓ Notificado' : 'Recordar'}
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 🟠 Vencen en 8-30 días */}
        <Grid item xs={12}>
          <Card sx={{ border: '1px solid', borderColor: 'orange.300', bgcolor: 'orange.50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Notifications color="action" /><Typography variant="h6" fontWeight={600} color="orange.700">Vencen en 8-30 días ({alerts.proximos30.length})</Typography>
              </Box>
              {alerts.proximos30.length === 0 ? (
                <Typography color="text.secondary">Sin alertas en el próximo mes</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {alerts.proximos30.map((a, idx) => (
                    <Box key={`${a.vehicleId}-${a.docType}-${idx}`} sx={{ p: 2, bgcolor: 'white', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography fontWeight={500}>{a.placa} • {a.conductor}</Typography>
                        <Typography variant="body2" color="text.secondary">{a.docType} vence el {new Date(a.expiryDate).toLocaleDateString('es-CO')} ({a.daysLeft} días)</Typography>
                        <Typography variant="caption" color="text.secondary">📍 {a.departamento} - {a.municipio}</Typography>
                      </Box>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button size="small" variant="text" color="primary" onClick={() => copyWhatsAppMessage(a)}>
                          📱 WhatsApp
                        </Button>
                        <Button size="small" variant="text" onClick={() => handleMarkNotified(a.vehicleId, a.docType)} disabled={a.notified}>
                          {a.notified ? '✓' : 'Notificar'}
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    )}
  </Box>
)}
            {activeTab === 'campanas' && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>📢 Gestión de Campañas</Typography>
            <Button variant="contained" startIcon={<Add />} size="small" onClick={() => setShowCampaignForm(!showCampaignForm)}>
              {showCampaignForm ? 'Ver Listado' : 'Nueva Campaña'}
            </Button>
          </Box>

          {campaignMsg && <Alert severity={campaignMsg.type} sx={{ mb: 2 }} onClose={() => setCampaignMsg(null)}>{campaignMsg.text}</Alert>}


          {lastCampaignId && (
  <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
    <Button 
      variant="outlined" 
      size="small" 
      onClick={() => copyCampaignLink(lastCampaignId)}
      startIcon={<ContentCopy />}
    >
      🔗 Copiar Link
    </Button>
    <Typography variant="caption" color="text.secondary">
      Comparte este link por WhatsApp
    </Typography>
  </Box>
)}


          {showCampaignForm ? (
            <Card sx={{ border: '1px solid', borderColor: 'primary.light', mb: 3 }}><CardContent>
              <form onSubmit={handleCreateCampaign}><Grid container spacing={2}>
                <Grid item xs={12} sm={6}><TextField fullWidth required label="Nombre de campaña" name="name" value={campaignFormData.name} onChange={handleCampaignChange} disabled={campaignLoading} /></Grid>
                <Grid item xs={12} sm={3}><FormControl fullWidth><InputLabel>Tipo</InputLabel><Select name="type" value={campaignFormData.type} onChange={handleCampaignChange} label="Tipo" disabled={campaignLoading}><MenuItem value="SOAT">SOAT</MenuItem><MenuItem value="Tecnomecánica">Tecnomecánica</MenuItem><MenuItem value="General">General</MenuItem><MenuItem value="Impuesto Vehicular">Impuesto Vehicular</MenuItem></Select></FormControl></Grid>
                <Grid item xs={12} sm={3}><FormControl fullWidth><InputLabel>Departamento</InputLabel><Select name="targetDept" value={campaignFormData.targetDept} onChange={handleCampaignChange} label="Departamento" disabled={campaignLoading}>{COLOMBIA_DEPARTAMENTOS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}</Select></FormControl></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth required type="date" label="Fecha de envío" name="scheduledDate" value={campaignFormData.scheduledDate} onChange={handleCampaignChange} InputLabelProps={{ shrink: true }} disabled={campaignLoading} /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Mensaje personalizado" name="message" value={campaignFormData.message} onChange={handleCampaignChange} multiline rows={2} disabled={campaignLoading} /></Grid>
              </Grid><Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}><Button variant="outlined" onClick={() => setShowCampaignForm(false)} disabled={campaignLoading}>Cancelar</Button><Button type="submit" variant="contained" disabled={campaignLoading}>{campaignLoading ? 'Guardando...' : 'Programar Campaña'}</Button></Box></form>
            </CardContent></Card>
          ) : (
            <Card><CardContent>
              {campaigns.length === 0 ? <Typography color="text.secondary" align="center">No hay campañas programadas</Typography> : (
                <Box sx={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '2px solid #e0e0e0' }}><th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th><th style={{ padding: '12px', textAlign: 'left' }}>Tipo</th><th style={{ padding: '12px', textAlign: 'left' }}>Destino</th><th style={{ padding: '12px', textAlign: 'left' }}>Fecha</th><th style={{ padding: '12px', textAlign: 'left' }}>Estado</th><th style={{ padding: '12px', textAlign: 'left' }}>Link</th><th style={{ padding: '12px', textAlign: 'left' }}>Acciones</th></tr></thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c.id || c.name} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px' }}>{c.name}</td>
                        <td style={{ padding: '12px' }}>{c.type}</td>
                        <td style={{ padding: '12px' }}>{c.targetDept}</td>
                        <td style={{ padding: '12px' }}>{new Date(c.scheduledDate).toLocaleDateString('es-CO')}</td>
                        <td style={{ padding: '12px' }}><span style={{ padding: '4px 10px', borderRadius: '10px', fontSize: '12px', backgroundColor: c.status === 'programada' ? '#dbeafe' : c.status === 'enviada' ? '#dcfce7' : '#f1f5f9', color: c.status === 'programada' ? '#1e40af' : c.status === 'enviada' ? '#166534' : '#475569' }}>{c.status}</span></td>
                         <td style={{ padding: '12px' }}>
  <Box sx={{ display: 'flex', gap: 0.5 }}>
    <Button size="small" variant="text" color="success" onClick={() => shareCampaignWhatsApp(c.id!, c.name)} startIcon={<span style={{ fontSize: 16 }}>💬</span>}>
     WhatsApp
    </Button>
    <Button variant="text" size="small" onClick={() => copyCampaignLink(c.id!)} startIcon={<ContentCopy fontSize="small" />}>Copiar</Button>
  </Box>
</td>
                        <td style={{ padding: '12px' }}><Box sx={{ display: 'flex', gap: 0.5 }}><IconButton size="small" onClick={() => handleEditCampaign(c)} aria-label="Editar"><Edit fontSize="small" /></IconButton><IconButton size="small" onClick={() => handleDeleteCampaign(c.id!, c.name)} aria-label="Eliminar" color="error"><Delete fontSize="small" /></IconButton></Box></td>
                      </tr>
                    ))}
                  </tbody>
                </table></Box>
              )}
            </CardContent></Card>
          )}
        </Box>
      )}

            {/* ✅ TAB REPORTES */}
      {activeTab === 'reportes' && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
  <Typography variant="h6" fontWeight={600}>📊 Reportes Avanzados</Typography>
  <Button 
    variant="contained" 
    onClick={handleExportCSV} 
    startIcon={<Assessment />} 
    disabled={filteredForReport.length === 0}
  >
    Descargar CSV
  </Button>
</Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Filtra vehículos por fecha y departamento para análisis rápido.</Typography>

          {/* Filtros */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField label="Fecha inicio" name="startDate" type="date" value={reportFilters.startDate} onChange={handleReportChange} InputLabelProps={{ shrink: true }} size="small" />
                <TextField label="Fecha fin" name="endDate" type="date" value={reportFilters.endDate} onChange={handleReportChange} InputLabelProps={{ shrink: true }} size="small" />
                <TextField select label="Departamento" name="dept" value={reportFilters.dept} onChange={handleReportChange} SelectProps={{ native: true }} size="small" sx={{ minWidth: 180 }}>
                  <option value="">Todos</option>
                  {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </TextField>
              </Box>
            </CardContent>
          </Card>

          {/* Resumen */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}><Card sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.50' }}><Typography variant="h4" color="primary.main">{reportSummary.total}</Typography><Typography variant="body2">Total</Typography></Card></Grid>
            <Grid item xs={6} md={3}><Card sx={{ p: 2, textAlign: 'center', bgcolor: 'success.50' }}><Typography variant="h4" color="success.main">{reportSummary.vigente}</Typography><Typography variant="body2">Vigentes</Typography></Card></Grid>
            <Grid item xs={6} md={3}><Card sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.50' }}><Typography variant="h4" color="warning.main">{reportSummary.proximo}</Typography><Typography variant="body2">Próximos</Typography></Card></Grid>
            <Grid item xs={6} md={3}><Card sx={{ p: 2, textAlign: 'center', bgcolor: 'error.50' }}><Typography variant="h4" color="error.main">{reportSummary.vencido}</Typography><Typography variant="body2">Vencidos</Typography></Card></Grid>
          </Grid>

          {/* Tabla de Resultados */}
          <Card>
            <CardContent>
              {vehicles.length === 0 ? <Typography align="center" color="text.secondary">Carga la pestaña Vehículos primero para generar reportes.</Typography> : (
                <Box sx={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Placa</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Conductor</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Depto</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Estado</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Docs</th>
                    </tr></thead>
                    <tbody>
                      {filteredForReport.map(v => {
                        const st = getStatus(v);
                        return (
                          <tr key={`rep-${v.id}`} style={{ borderBottom: '1px solid #f5f5f5' }}>
                            <td style={{ padding: '10px', fontFamily: 'monospace' }}>{v.placa}</td>
                            <td style={{ padding: '10px' }}>{v.conductor}</td>
                            <td style={{ padding: '10px' }}>{v.departamento}</td>
                            <td style={{ padding: '10px' }}><span style={{ padding: '3px 8px', borderRadius: '8px', fontSize: '11px', backgroundColor: st.color === 'success' ? '#dcfce7' : st.color === 'warning' ? '#fef3c7' : '#fee2e2', color: st.color === 'success' ? '#166534' : st.color === 'warning' ? '#92400e' : '#991b1b' }}>{st.label}</span></td>
                            <td style={{ padding: '10px' }}>{v.documentos?.length || 0}</td>
                          </tr>
                        );
                      })}
                      {filteredForReport.length === 0 && <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Sin resultados para los filtros aplicados</td></tr>}
                    </tbody>
                  </table>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

          {/* ✅ TAB BRIGADISTAS */}
      {activeTab === 'brigadistas' && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>👥 Gestión de Brigadistas</Typography>
            <Button variant="contained" startIcon={<Add />} size="small" onClick={() => setShowBrigForm(!showBrigForm)}>
              {showBrigForm ? 'Ver Listado' : 'Nuevo Brigadista'}
            </Button>
          </Box>

          {brigMsg && <Alert severity={brigMsg.type} sx={{ mb: 2 }} onClose={() => setBrigMsg(null)}>{brigMsg.text}</Alert>}

          {showBrigForm ? (
            <Card sx={{ border: '1px solid', borderColor: 'primary.light', mb: 3 }}><CardContent>
              <form onSubmit={handleCreateBrigadista}><Grid container spacing={2}>
                <Grid item xs={12} sm={6}><TextField fullWidth required label="Email" name="email" type="email" value={brigForm.email} onChange={handleBrigChange} disabled={brigLoading} /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth required label="Contraseña" name="password" type="password" value={brigForm.password} onChange={handleBrigChange} disabled={brigLoading} /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth required label="Nombre completo" name="displayName" value={brigForm.displayName} onChange={handleBrigChange} disabled={brigLoading} /></Grid>
                <Grid item xs={12} sm={6}><TextField select fullWidth label="Departamento" name="municipio" value={brigForm.municipio} onChange={handleBrigChange} SelectProps={{ native: true }} disabled={brigLoading}>
                  <option value="">Seleccionar...</option>
                  {COLOMBIA_DEPARTAMENTOS.map(m => <option key={m} value={m}>{m}</option>)}
                </TextField></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Teléfono" name="telefono" value={brigForm.telefono} onChange={handleBrigChange} disabled={brigLoading} /></Grid>
              </Grid><Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}><Button variant="outlined" onClick={() => setShowBrigForm(false)} disabled={brigLoading}>Cancelar</Button><Button type="submit" variant="contained" disabled={brigLoading}>{brigLoading ? 'Creando...' : 'Crear Brigadista'}</Button></Box></form>
            </CardContent></Card>
          ) : (
            <Card><CardContent>
              {brigadistas.length === 0 ? <Typography color="text.secondary" align="center">No hay brigadistas registrados</Typography> : (
                <Box sx={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '2px solid #e0e0e0' }}><th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th><th style={{ padding: '12px', textAlign: 'left' }}>Email</th><th style={{ padding: '12px', textAlign: 'left' }}>Municipio</th><th style={{ padding: '12px', textAlign: 'left' }}>Teléfono</th><th style={{ padding: '12px', textAlign: 'left' }}>Creado</th></tr></thead>
                  <tbody>
                    {brigadistas.map(b => (
                      <tr key={b.uid} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px' }}>{b.displayName}</td>
                        <td style={{ padding: '12px' }}>{b.email}</td>
                        <td style={{ padding: '12px' }}>{b.municipio || '-'}</td>
                        <td style={{ padding: '12px' }}>{b.telefono || '-'}</td>
                        <td style={{ padding: '12px' }}>{b.createdAt ? new Date(b.createdAt instanceof Date ? b.createdAt : b.createdAt.toDate()).toLocaleDateString('es-CO') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></Box>
              )}
            </CardContent></Card>
          )}
        </Box>
      )}


    </Box>
  );     
}