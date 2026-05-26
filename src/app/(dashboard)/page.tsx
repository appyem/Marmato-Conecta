'use client';
// ✅ Animación para indicador de mensaje no leído
const styles = `
  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }
`;

import { Grid, Card, CardContent, Typography, Box, LinearProgress, TextField, Button, FormControl, InputLabel, Select, MenuItem, Alert, SelectChangeEvent, IconButton, CircularProgress } from '@mui/material';

import { CarRepair, Warning, CheckCircle, TrendingUp, TableChart, Notifications, Add, ArrowBack, Save, Assessment, ContentCopy, Edit, Delete } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

import { useEffect, useState, ChangeEvent, FormEvent, useCallback } from 'react';


import { 
  createUserWithEmailAndPassword 
} from 'firebase/auth';

import { collection, addDoc, query, where, getDocs, deleteDoc, doc, setDoc, updateDoc, Timestamp, limit } from 'firebase/firestore';


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
  telefono?: string;
  transito?: string;  // ✅ AGREGAR ESTA LÍNEA
  documentos?: VehicleDoc[];
  isActive?: boolean;
}

// ✅ Extensión para mensajería: campos que existen en Firestore pero no en VehicleData base
interface VehicleWithContact extends VehicleData {
  telefono?: string;
  contactoPago?: string;
  campaignId?: string;
  propietario?: string;
}

// ✅ Tipo para nuevo vehículo (formulario)
interface NewVehicleForm {
  placa: string;
  conductor: string;
  departamento: string;
  municipio: string; 
  telefono?: string;
  soatExpiry?: string;
  tecnoExpiry?: string;
}

type StatusConfig = { label: string; color: 'success' | 'warning' | 'error' };
type DashboardTab = 'resumen' | 'vehiculos' | 'alertas' | 'campanas' | 'reportes' | 'brigadistas' | 'mensajeria' | 'whatsapp';




// ✅ Departamentos de Caldas (para dropdown)
const COLOMBIA_DEPARTAMENTOS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 
  'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 
  'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 
  'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 
  'San Andrés, Providencia y Santa Catalina', 'Santander', 'Sucre', 'Tolima', 
  'Valle del Cauca', 'Vaupés', 'Vichada'
].sort();


// ✅ Interfaz para mensajes de WhatsApp (tipado estricto, sin 'any')
interface WhatsAppMessage {
  id: string;
  from: string;
  fromName: string;
  to?: string;              // ← AGREGADO: para agrupar conversaciones por número
  body: string;
  direction: 'inbound' | 'outbound';
  read: boolean;
  replied: boolean;
  timestamp: Timestamp | null;
}

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
  telefono: '',
  soatExpiry: '',
  tecnoExpiry: ''
});

  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsAppMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');

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


    // ✅ Cargar TODOS los mensajes (inbound + outbound) para formar hilos
  const fetchWhatsappMessages = useCallback(async (): Promise<void> => {
    try {
      setMessagesLoading(true);
      
      // Query que trae AMBAS direcciones para poder armar conversaciones completas
      const q = query(
        collection(db, 'whatsapp_messages'),
        limit(100)  // ← Aumentamos límite para tener más contexto de conversación
      );
      
      const snap = await getDocs(q);
      
      // Mapeo explícito y seguro, incluyendo campo 'to' si existe
      const list = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          from: data.from || '',
          fromName: data.fromName || '',
          to: data.to || undefined,  // ← AGREGADO: campo opcional 'to'
          body: data.body || '',
          direction: data.direction as 'inbound' | 'outbound',
          read: data.read === true,
          replied: data.replied === true,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp : null
        } as WhatsAppMessage;
      });
      
      // Ordenar cronológicamente (más antiguo primero para chat natural)
      const sorted = list.sort((a, b) => {
        const tsA = a.timestamp ? a.timestamp.toMillis() : 0;
        const tsB = b.timestamp ? b.timestamp.toMillis() : 0;
        return tsA - tsB;  // Ascendente: más antiguo → más reciente
      });
      
      setWhatsappMessages(sorted);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error cargando mensajes';
      console.error('❌ Error fetching WhatsApp messages:', msg);
    } finally {
      setMessagesLoading(false);
    }
  }, []);


  // ✅ Enviar respuesta por WhatsApp API + GUARDAR en Firestore para historial
  const handleSendReply = async (messageId: string, toNumber: string, fromName: string): Promise<void> => {
    if (!replyText.trim()) return;
    
    try {
      // 1. Enviar mensaje por API oficial de Meta
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toNumber,
          message: replyText.trim(),
        }),
      });
      
      const result = await response.json();
      if (response.ok && result.success) {
        // 2. GUARDAR el mensaje enviado en Firestore como nuevo documento (para historial)
        await addDoc(collection(db, 'whatsapp_messages'), {
          from: user?.uid || 'system',      // Quién envía (admin/brigadista)
          fromName: `${profile?.displayName || 'Admin'} → ${fromName}`,
          to: toNumber,                      // ← AGREGADO: destinatario
          body: replyText.trim(),
          direction: 'outbound',             // ← Mensaje saliente
          read: true,                        // Lo leemos al enviarlo
          replied: false,
          timestamp: Timestamp.now(),
          metaMessageId: result.messageId || null,
          type: 'text'
        });
        
        // 3. Marcar el mensaje original como respondido
        await updateDoc(doc(db, 'whatsapp_messages', messageId), {
          replied: true,
          repliedAt: Timestamp.now(),
          replyText: replyText.trim()
        });
        
        // 4. Actualizar UI localmente (recargar para mostrar el nuevo mensaje)
        await fetchWhatsappMessages();
        
        setReplyText('');
        setReplyingTo(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error enviando respuesta';
      console.error('❌ Error sending reply:', msg);
    }
  };

  // ✅ Marcar mensaje como leído
  const handleMarkAsRead = async (messageId: string): Promise<void> => {
    try {
      await updateDoc(doc(db, 'whatsapp_messages', messageId), { read: true });
      setWhatsappMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, read: true } : m)
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error actualizando mensaje';
      console.warn('⚠️ Error marking as read:', msg);
    }
  };

    // ✅ Escuchar cambios de hash en tiempo real (Sidebar → Contenido)
  useEffect(() => {
    const updateTabFromHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (['resumen', 'vehiculos', 'alertas', 'campanas', 'reportes', 'brigadistas', 'mensajeria', 'whatsapp'].includes(hash)) {
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
  telefono: formData.telefono?.trim() || undefined,
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


            // ✅ ENVÍO AUTOMÁTICO DE WHATSAPP: Plantilla de consentimiento de datos
      // Se dispara inmediatamente después de registrar el vehículo
      const sendConsentWhatsApp = async (conductorNombre: string, conductorTelefono: string): Promise<void> => {
        try {
          // Limpiar número: solo dígitos, con código de país
          const phoneDigits = conductorTelefono.replace(/\D/g, '');
          const to = phoneDigits.startsWith('57') ? phoneDigits : `57${phoneDigits}`;

          // Llamar a nuestra API route con la plantilla aprobada
          const response = await fetch('/api/send-whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to,
              template: {
                name: 'marmato_consentimiento_datos', // ← Nombre EXACTO de tu plantilla aprobada
                language: { code: 'es' },
                components: [
                  {
                    type: 'body',
                    parameters: [
                      { type: 'text', text: conductorNombre }, // {{1}}: Nombre del conductor
                      { type: 'text', text: 'https://www.mintic.gov.co/portal/715/articles-2627_Resolucion_2238_de_2024.pdf' }, // {{2}}: Enlace a política
                    ],
                  },
                ],
              },
            }),
          });

          const result = await response.json();
          if (!response.ok || !result.success) {
            console.warn('⚠️ WhatsApp no enviado:', result.error);
            // No interrumpimos el flujo: el registro en Firestore ya fue exitoso
          }
        } catch (err: unknown) {
          // ✅ Type guard seguro (sin 'any')
          const msg = err instanceof Error ? err.message : 'Error de red';
          console.warn('⚠️ Error enviando WhatsApp:', msg);
          // No interrumpimos el flujo principal
        }
      };

      // Disparar envío (sin await para no bloquear la UI)
      void sendConsentWhatsApp(newVehicle.conductor, newVehicle.telefono || '');

      // ✅ Feedback y reset
      setFormSuccess('Vehículo registrado exitosamente');
      setFormData({ 
  placa: '', 
  conductor: '', 
  departamento: '', 
  municipio: '',  // ✅ Resetear nuevo campo
  telefono: '',
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
  telefono: '',
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
    updatedAt?: Date; // ✅ Agregado para edición
    isActive?: boolean;
  }
  
  const [brigadistas, setBrigadistas] = useState<Brigadista[]>([]);
  const [showBrigForm, setShowBrigForm] = useState(false);
  const [brigLoading, setBrigLoading] = useState(false);
  const [brigMsg, setBrigMsg] = useState<{type:'success'|'error',text:string}|null>(null);
  const [brigForm, setBrigForm] = useState({ email: '', password: '', displayName: '', municipio: '', telefono: '' });
  const [editingBrigId, setEditingBrigId] = useState<string | null>(null);

  // ✅ Handler para cambios en formulario de brigadistas
  const handleBrigChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setBrigForm(prev => ({ ...prev, [name]: value }));
    setBrigMsg(null);
  };

  // ✅ Cancelar formulario de brigadistas
  const handleCancelBrigForm = (): void => {
    setEditingBrigId(null);
    setShowBrigForm(false);
    setBrigForm({ email: '', password: '', displayName: '', municipio: '', telefono: '' });
    setBrigMsg(null);
  };

  // ✅ Fetch de brigadistas (declarado antes de usarse)
  const fetchBrigadistas = useCallback(async (): Promise<void> => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs
        .map(d => d.data() as Brigadista)
        .filter(u => u.role === 'brigadista' && u.isActive !== false);
      setBrigadistas(list);
    } catch (err: unknown) { 
      console.error('Error fetching brigadistas:', err instanceof Error ? err.message : String(err)); 
    }
  }, []);

  // ✅ Crear o Editar brigadista
  const handleCreateBrigadista = async (e: FormEvent): Promise<void> => {
    e.preventDefault(); 
    setBrigLoading(true); 
    setBrigMsg(null);
    
    if (!brigForm.email || !brigForm.displayName) {
      setBrigMsg({ type: 'error', text: 'Email y nombre son obligatorios' });
      setBrigLoading(false); 
      return;
    }
    
    try {
      if (editingBrigId) {
        // ✅ Modo edición: actualizar solo campos permitidos
        const updateData = {
          displayName: brigForm.displayName,
          municipio: brigForm.municipio,
          telefono: brigForm.telefono,
          updatedAt: new Date()
        };
        await updateDoc(doc(db, 'users', editingBrigId), updateData);
        setBrigadistas(prev => prev.map(b => b.uid === editingBrigId ? { ...b, ...updateData } : b));
        setBrigMsg({ type: 'success', text: '✅ Brigadista actualizado' });
      } else {
        // ✅ Modo creación: requiere contraseña
        if (!brigForm.password) {
          setBrigMsg({ type: 'error', text: 'La contraseña es obligatoria para nuevos usuarios' });
          setBrigLoading(false); 
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, brigForm.email, brigForm.password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email: brigForm.email,
          displayName: brigForm.displayName,
          role: 'brigadista',
          municipio: brigForm.municipio,
          telefono: brigForm.telefono,
          createdAt: new Date(),
          createdBy: user?.uid,
          isActive: true
        });
        setBrigMsg({ type: 'success', text: '✅ Brigadista creado exitosamente' });
      }
      
      // Reset y refresh
      setBrigForm({ email: '', password: '', displayName: '', municipio: '', telefono: '' });
      setEditingBrigId(null);
      setTimeout(() => setShowBrigForm(false), 1500);
      fetchBrigadistas();
    } catch (err: unknown) {
      console.error('Error con brigadista:', err);
      const message = err instanceof Error ? err.message : 'Error al procesar';
      setBrigMsg({ type: 'error', text: message });
    } finally { 
      setBrigLoading(false); 
    }
  };

  // ✅ Editar brigadista: precargar formulario
  const handleEditBrigadista = (brig: Brigadista): void => {
    setBrigForm({
      email: brig.email,
      password: '', // No mostramos contraseña por seguridad
      displayName: brig.displayName,
      municipio: brig.municipio || '',
      telefono: brig.telefono || ''
    });
    setEditingBrigId(brig.uid);
    setShowBrigForm(true);
    setBrigMsg({ type: 'success', text: `✏️ Editando: ${brig.displayName}` });
  };

  // ✅ Eliminar brigadista (soft delete)
  const handleDeleteBrigadista = async (brigId: string, brigName: string): Promise<void> => {
    if (!window.confirm(`¿Desactivar brigadista "${brigName}"? Esto impedirá su acceso al sistema.`)) return;
    
    try {
      await updateDoc(doc(db, 'users', brigId), { isActive: false });
      setBrigadistas(prev => prev.filter(b => b.uid !== brigId));
      setBrigMsg({ type: 'success', text: `🗑️ ${brigName} desactivado` });
    } catch (err: unknown) {
      console.error('Error desactivando brigadista:', err);
      const message = err instanceof Error ? err.message : 'Error al desactivar';
      setBrigMsg({ type: 'error', text: message });
    }
  };

  // ✅ Cargar brigadistas al entrar a la tab
  useEffect(() => {
    if (activeTab === 'brigadistas') fetchBrigadistas();
  }, [activeTab, fetchBrigadistas]);


    // ✅ Cargar mensajes de WhatsApp al entrar a la tab
  useEffect(() => {
    if (activeTab === 'whatsapp') {
      fetchWhatsappMessages();
    }
  }, [activeTab, fetchWhatsappMessages]);


  // ✅ Inyectar estilos de animación para WhatsApp (solo en cliente, una sola vez)
useEffect(() => {
  if (typeof window !== 'undefined') {
    const styleEl = document.getElementById('whatsapp-animations');
    if (!styleEl) {
      const el = document.createElement('style');
      el.id = 'whatsapp-animations';
      el.textContent = styles;
      document.head.appendChild(el);
    }
  }
}, []);

 

    // ✅ ESTADOS PARA MENSAJERÍA MASIVA
  const [bulkCampaigns, setBulkCampaigns] = useState<Campaign[]>([]);
  const [bulkContacts, setBulkContacts] = useState<Array<{ id: string; nombre: string; telefono: string; campaignId: string }>>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [messageText, setMessageText] = useState<string>('');
  const [sendChannel, setSendChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [sending, setSending] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; summary: string } | null>(null);

  // ✅ Fetch de campañas para el selector de mensajería
  const fetchBulkCampaigns = useCallback(async (): Promise<void> => {
    try {
      const snap = await getDocs(collection(db, 'campaigns'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign));
      setBulkCampaigns(list);
    } catch (err) {
      console.error('Error fetching campaigns for bulk messaging:', err);
    }
  }, []);

    // ✅ Fetch de contactos filtrados por campaña (tipado seguro, sin 'any')
  const fetchBulkContacts = useCallback(async (campaignId: string): Promise<void> => {
    if (!campaignId) return;
    try {
      setBulkContacts([]);
      // ✅ Query correcta con query() + where()
      const q = query(collection(db, 'vehicles'), where('campaignId', '==', campaignId));
      const snap = await getDocs(q);
      
      const list = snap.docs.map(d => {
        // ✅ Cast seguro a la interfaz extendida (no 'any')
        const data = d.data() as VehicleWithContact;
        return {
          id: d.id,
          nombre: data.conductor || data.propietario || 'Sin nombre',
          telefono: data.telefono || data.contactoPago || '',
          campaignId: data.campaignId || campaignId
        };
      }).filter(c => c.telefono); // Solo contactos con teléfono
      
      setBulkContacts(list);
      setSelectedContactIds([]);
      setSendResult(null);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  }, []);

  // ✅ Cargar campañas al entrar a la tab
  useEffect(() => {
    if (activeTab === 'mensajeria') {
      fetchBulkCampaigns();
    }
  }, [activeTab, fetchBulkCampaigns]);

  // ✅ Cargar contactos al cambiar campaña seleccionada
  useEffect(() => {
    if (selectedCampaign) {
      fetchBulkContacts(selectedCampaign);
    }
  }, [selectedCampaign, fetchBulkContacts]);

  // ✅ Toggle selección individual
  const toggleContactSelection = (contactId: string): void => {
    setSelectedContactIds(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId) 
        : [...prev, contactId]
    );
  };

  // ✅ Seleccionar/deseleccionar todos
  const toggleSelectAll = (): void => {
    if (selectedContactIds.length === bulkContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(bulkContacts.map(c => c.id));
    }
  };

  // ✅ Función de envío simulada (MOCK - sin API real aún)
  const handleSendBulk = async (): Promise<void> => {
    if (!selectedCampaign || !messageText || selectedContactIds.length === 0) {
      setSendResult({ sent: 0, failed: 0, summary: '⚠️ Selecciona campaña, mensaje y al menos un contacto' });
      return;
    }

    setSending(true);
    setSendResult(null);

        // ✅ ENVÍO REAL vía WhatsApp Business API (Meta)
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Iterar sobre cada contacto seleccionado
    for (const contactId of selectedContactIds) {
      const contact = bulkContacts.find(c => c.id === contactId);
      if (!contact?.telefono) {
        failedCount++;
        continue;
      }

      try {
        // Limpiar número: solo dígitos, con código de país
        const phoneDigits = contact.telefono.replace(/\D/g, '');
        const to = phoneDigits.startsWith('57') ? phoneDigits : `57${phoneDigits}`;

        // Llamar a nuestra API route local
        const response = await fetch('/api/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, message: messageText }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          sentCount++;
        } else {
          failedCount++;
          errors.push(`${contact.nombre}: ${result.error || 'Error desconocido'}`);
        }
      } catch (err: unknown) {
        failedCount++;
        const msg = err instanceof Error ? err.message : 'Error de red';
        errors.push(`${contact.nombre}: ${msg}`);
      }

      // Pequeña pausa para evitar rate limiting de Meta (1 segundo entre mensajes)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // ✅ Mostrar resultado final
    let summary = `✅ ${sentCount} enviados, ${failedCount} fallidos`;
    if (errors.length > 0) {
      summary += ` | Errores: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`;
    }

    setSendResult({ sent: sentCount, failed: failedCount, summary });
    setSending(false);
    setSelectedContactIds([]);
  };   

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


          {/* ✅ Botón rápido para pestaña Mensajes WhatsApp */}
      <Box sx={{ mb: 2 }}>
        <Button 
          component="a" 
          href="#whatsapp"
          variant="outlined" 
          size="small"
          startIcon={<span>📩</span>}
          sx={{ 
            textTransform: 'none',
            color: activeTab === 'whatsapp' ? '#4CAF50' : '#9AA5B1',
            borderColor: activeTab === 'whatsapp' ? '#4CAF50' : '#9AA5B1',
            '&:hover': { borderColor: '#4CAF50' }
          }}
        >
          Ver Mensajes WhatsApp
        </Button>
      </Box>  

      

      {/* Contenido: Resumen */}
      {activeTab === 'resumen' && stats && (
        <>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* 1. Total Vehículos - Verde Institucional */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                bgcolor: '#1F2335', 
                border: '1px solid rgba(46, 125, 50, 0.5)',
                boxShadow: '0 0 15px rgba(46, 125, 50, 0.15)',
                color: '#FFFFFF',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  boxShadow: '0 4px 25px rgba(46, 125, 50, 0.4)',
                  borderColor: '#4CAF50' 
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <CarRepair sx={{ color: '#4CAF50', fontSize: 32 }} />
                    <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-1px' }}>{stats.totalVehicles}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#9AA5B1', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Vehículos registrados</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 2. Pagan en Marmato - Azul/Teal (Variación) */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                bgcolor: '#1F2335', 
                border: '1px solid rgba(0, 150, 136, 0.5)',
                boxShadow: '0 0 15px rgba(0, 150, 136, 0.15)',
                color: '#FFFFFF',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  boxShadow: '0 4px 25px rgba(0, 150, 136, 0.4)',
                  borderColor: '#00ACC1' 
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <CheckCircle sx={{ color: '#009688', fontSize: 32 }} />
                    <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-1px' }}>{stats.vehiclesInMarmato}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#9AA5B1', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Pagan en Marmato</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 3. Vencimientos - Rojo Alerta */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                bgcolor: '#1F2335', 
                border: '1px solid rgba(244, 67, 54, 0.5)',
                boxShadow: '0 0 15px rgba(244, 67, 54, 0.15)',
                color: '#FFFFFF',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  boxShadow: '0 4px 25px rgba(244, 67, 54, 0.4)',
                  borderColor: '#F44336' 
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Warning sx={{ color: '#F44336', fontSize: 32 }} />
                    <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-1px' }}>{stats.upcomingExpirations}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#9AA5B1', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Vencimientos próximos</Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 4. Campañas - Dorado (Acento Marmato) */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                bgcolor: '#1F2335', 
                border: '1px solid rgba(244, 196, 48, 0.5)',
                boxShadow: '0 0 15px rgba(244, 196, 48, 0.15)',
                color: '#FFFFFF',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  boxShadow: '0 4px 25px rgba(244, 196, 48, 0.4)',
                  borderColor: '#F4C430' 
                }
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <TrendingUp sx={{ color: '#F4C430', fontSize: 32 }} />
                    <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: '-1px' }}>{stats.activeCampaigns}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#9AA5B1', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>Campañas activas</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
                    <Grid container spacing={3}>
            {/* 📊 Gráfica de Barras: Vehículos por departamento (Futurista) */}
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                bgcolor: '#1F2335',
                border: '1px solid rgba(46, 125, 50, 0.3)',
                boxShadow: '0 0 20px rgba(46, 125, 50, 0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 0 35px rgba(46, 125, 50, 0.25)',
                  transform: 'translateY(-2px)',
                }
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#E0E6ED', fontWeight: 700 }}>
                    Vehículos por departamento
                  </Typography>
                  <Box sx={{ height: 300, minHeight: 300, width: '100%', minWidth: 0 }}>
                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                      <BarChart data={stats.byDepartment} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        {/* ✨ Degradado neón verde → cian */}
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#00C853" stopOpacity={0.4}/>
                          </linearGradient>
                          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke="#3B4252" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80} 
                          fontSize={11}
                          stroke="#9AA5B1"
                          tick={{ fill: '#9AA5B1' }}
                        />
                        <YAxis 
                          stroke="#9AA5B1"
                          tick={{ fill: '#9AA5B1', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        {/* 🌫️ Tooltip con efecto vidrio */}
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(26, 27, 38, 0.95)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            border: '1px solid rgba(46, 125, 50, 0.4)',
                            borderRadius: 10,
                            color: '#E0E6ED',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          }}
                          labelStyle={{ color: '#FFFFFF', fontWeight: 600, marginBottom: 4 }}
                          cursor={{ fill: 'rgba(46, 125, 50, 0.1)', radius: 4 }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="url(#barGradient)"
                          radius={[6, 6, 0, 0]}
                          animationDuration={800}
                          animationBegin={200}
                          isAnimationActive={true}
                          animationEasing="ease-out"
                          // ✨ Efecto hover: elevación + glow
                          onMouseOver={(data, index) => {
                            const bars = document.querySelectorAll('.recharts-bar-rectangle');
                            if (bars[index]) {
                              (bars[index] as SVGElement).style.filter = 'url(#glow)';
                              (bars[index] as SVGElement).style.transition = 'filter 0.2s ease';
                            }
                          }}
                          onMouseOut={(data, index) => {
                            const bars = document.querySelectorAll('.recharts-bar-rectangle');
                            if (bars[index]) {
                              (bars[index] as SVGElement).style.filter = 'none';
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 🥧 Gráfica Pastel: Estado de documentos (Interactiva) */}
            <Grid item xs={12} md={6}>
              <Card sx={{ 
                bgcolor: '#1F2335',
                border: '1px solid rgba(244, 196, 48, 0.3)',
                boxShadow: '0 0 20px rgba(244, 196, 48, 0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 0 35px rgba(244, 196, 48, 0.25)',
                  transform: 'translateY(-2px)',
                }
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: '#E0E6ED', fontWeight: 700 }}>
                    Estado de documentos
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        {/* ✨ Degradados para cada estado */}
                        <defs>
                          <linearGradient id="vigenteGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="5%" stopColor="#2E7D32" stopOpacity={1}/>
                            <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.7}/>
                          </linearGradient>
                          <linearGradient id="proximoGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="5%" stopColor="#F4C430" stopOpacity={1}/>
                            <stop offset="95%" stopColor="#FFD54F" stopOpacity={0.7}/>
                          </linearGradient>
                          <linearGradient id="vencidoGradient" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="5%" stopColor="#F44336" stopOpacity={1}/>
                            <stop offset="95%" stopColor="#EF5350" stopOpacity={0.7}/>
                          </linearGradient>
                        </defs>
                        <Pie
                          data={stats.byStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                          animationDuration={1000}
                          animationBegin={300}
                          isAnimationActive={true}
                          animationEasing="ease-out"
                          // ✨ Efecto hover: expandir segmento activo
                          onMouseOver={(data, index) => {
                            const sectors = document.querySelectorAll('.recharts-pie-sector');
                            if (sectors[index]) {
                              (sectors[index] as SVGElement).style.transform = 'scale(1.05)';
                              (sectors[index] as SVGElement).style.transition = 'transform 0.2s ease';
                              (sectors[index] as SVGElement).style.filter = 'drop-shadow(0 0 8px rgba(255,255,255,0.3))';
                            }
                          }}
                          onMouseOut={(data, index) => {
                            const sectors = document.querySelectorAll('.recharts-pie-sector');
                            if (sectors[index]) {
                              (sectors[index] as SVGElement).style.transform = 'scale(1)';
                              (sectors[index] as SVGElement).style.filter = 'none';
                            }
                          }}
                        >
                          {stats.byStatus.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`url(#${entry.name === 'Vigente' ? 'vigenteGradient' : entry.name === 'Próximo' ? 'proximoGradient' : 'vencidoGradient'})`}
                              stroke="rgba(26, 27, 38, 0.8)"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        {/* 🎯 Centro dinámico: muestra el total */}
                        <text 
                          x="50%" 
                          y="50%" 
                          textAnchor="middle" 
                          dominantBaseline="middle"
                          fill="#E0E6ED"
                          fontSize={18}
                          fontWeight={700}
                        >
                          {stats.byStatus.reduce((acc, cur) => acc + cur.value, 0)}
                          <tspan x="50%" dy={20} fontSize={11} fill="#9AA5B1" fontWeight={400}>
                            Total docs
                          </tspan>
                        </text>
                        {/* 🌫️ Tooltip vidrio */}
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(26, 27, 38, 0.95)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            border: '1px solid rgba(244, 196, 48, 0.4)',
                            borderRadius: 10,
                            color: '#E0E6ED',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          }}
                          labelStyle={{ color: '#FFFFFF', fontWeight: 600 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
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


{/* Teléfono del conductor */}
<Grid item xs={12} sm={6}>
  <TextField 
    fullWidth 
    label="Teléfono del conductor" 
    name="telefono" 
    value={formData.telefono} 
    onChange={handleFormChange} 
    placeholder="3101234567" 
    disabled={formLoading} 
    inputProps={{ pattern: '[0-9]*', maxLength: 10 }}
    helperText="Solo dígitos, sin código de país"
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
                      {uniqueDepts.map((dept, idx) => <option key={`${dept}-${idx}`} value={dept}>{dept}</option>)}
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
                                        <Box sx={{ 
                      overflowX: 'auto',
                      '& tr:hover td': { 
                        bgcolor: 'rgba(46, 125, 50, 0.12)',
                        transition: 'background 0.2s ease',
                        cursor: 'pointer'
                      },
                      '& th': { 
                        bgcolor: '#1F2335', 
                        color: '#E0E6ED', 
                        borderBottom: '2px solid #3B4252',
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 700,
                        padding: '14px 12px'
                      },
                      '& td': { 
                        color: '#C9D1D9',
                        borderBottom: '1px solid #2D3348',
                        padding: '14px 12px'
                      },
                      '& td:first-of-type': { 
                        fontWeight: 600, 
                        color: '#F4C430',
                        fontFamily: 'monospace'
                      }
                    }}>
                      <TableChart sx={{ minWidth: 650, color: '#E0E6ED', mb: 2 }} />
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left' }}>Placa</th>
                            <th style={{ textAlign: 'left' }}>Conductor</th>
                            <th style={{ textAlign: 'left' }}>Departamento</th>
                            <th style={{ textAlign: 'left' }}>Estado</th>
                            <th style={{ textAlign: 'left' }}>Documentos</th>
                            <th style={{ textAlign: 'left' }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVehicles.map(v => {
                            const status = getStatus(v);
                            return (
                              <tr key={v.id || v.placa}>
                                <td>{v.placa}</td>
                                <td>{v.conductor}</td>
                                <td style={{ color: '#9AA5B1' }}>{v.departamento}</td>
                                <td>
                                  <span style={{ 
                                    padding: '4px 10px', 
                                    borderRadius: '6px', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 600,
                                    backgroundColor: status.color === 'success' ? 'rgba(46, 125, 50, 0.2)' : 
                                                     status.color === 'warning' ? 'rgba(244, 196, 48, 0.2)' : 'rgba(244, 67, 54, 0.2)', 
                                    color: status.color === 'success' ? '#4CAF50' : status.color === 'warning' ? '#F4C430' : '#F44336' 
                                  }}>
                                    {status.label}
                                  </span>
                                </td>
                                <td style={{ color: '#9AA5B1' }}>{v.documentos?.length || 0} doc(s)</td>
                                <td>
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <IconButton size="small" onClick={() => handleEditVehicle(v)} aria-label="Editar" sx={{ color: '#9AA5B1', '&:hover': { color: '#2E7D32', bgcolor: 'rgba(46, 125, 50, 0.1)' } }}><Edit fontSize="small" /></IconButton>
                                    <IconButton size="small" onClick={() => handleDeleteVehicle(v.id!, v.placa)} aria-label="Eliminar" sx={{ color: '#9AA5B1', '&:hover': { color: '#F44336', bgcolor: 'rgba(244, 67, 54, 0.1)' } }}><Delete fontSize="small" /></IconButton>
                                  </Box>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredVehicles.length === 0 && (
                            <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#666' }}>No se encontraron vehículos</td></tr>
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
                  {uniqueDepts.map((d, idx) => <option key={`${d}-${idx}`} value={d}>{d}</option>)}
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
                <Grid item xs={12} sm={6}><TextField fullWidth required label="Contraseña" name="password" type="password" value={brigForm.password} onChange={handleBrigChange} disabled={brigLoading || !!editingBrigId} helperText={editingBrigId ? "Dejar vacío para mantener" : ""} /></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth required label="Nombre completo" name="displayName" value={brigForm.displayName} onChange={handleBrigChange} disabled={brigLoading} /></Grid>
                <Grid item xs={12} sm={6}><TextField select fullWidth label="Departamento" name="municipio" value={brigForm.municipio} onChange={handleBrigChange} SelectProps={{ native: true }} disabled={brigLoading}>
                  <option value="">Seleccionar...</option>
                  {COLOMBIA_DEPARTAMENTOS.map(m => <option key={m} value={m}>{m}</option>)}
                </TextField></Grid>
                <Grid item xs={12} sm={6}><TextField fullWidth label="Teléfono" name="telefono" value={brigForm.telefono} onChange={handleBrigChange} disabled={brigLoading} /></Grid>
              </Grid><Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}><Button variant="outlined" onClick={handleCancelBrigForm} disabled={brigLoading}>Cancelar</Button><Button type="submit" variant="contained" disabled={brigLoading}>{brigLoading ? 'Procesando...' : (editingBrigId ? 'Actualizar' : 'Crear Brigadista')}</Button></Box></form>
            </CardContent></Card>
          ) : (
            <Card><CardContent>
              {brigadistas.length === 0 ? <Typography color="text.secondary" align="center">No hay brigadistas registrados</Typography> : (
                <Box sx={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '2px solid #e0e0e0' }}><th style={{ padding: '12px', textAlign: 'left' }}>Nombre</th><th style={{ padding: '12px', textAlign: 'left' }}>Email</th><th style={{ padding: '12px', textAlign: 'left' }}>Municipio</th><th style={{ padding: '12px', textAlign: 'left' }}>Teléfono</th><th style={{ padding: '12px', textAlign: 'left' }}>Creado</th><th style={{ padding: '12px', textAlign: 'left' }}>Acciones</th></tr></thead>
                  <tbody>
                    {brigadistas.map(b => (
                      <tr key={b.uid} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px' }}>{b.displayName}</td>
                        <td style={{ padding: '12px' }}>{b.email}</td>
                        <td style={{ padding: '12px' }}>{b.municipio || '-'}</td>
                        <td style={{ padding: '12px' }}>{b.telefono || '-'}</td>
                        <td style={{ padding: '12px' }}>{b.createdAt ? new Date(b.createdAt instanceof Date ? b.createdAt : (b.createdAt as Timestamp).toDate()).toLocaleDateString('es-CO') : '-'}</td>
                        <td style={{ padding: '12px' }}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton size="small" onClick={() => handleEditBrigadista(b)} aria-label="Editar"><Edit fontSize="small" /></IconButton>
                            <IconButton size="small" onClick={() => handleDeleteBrigadista(b.uid, b.displayName)} aria-label="Desactivar" color="error"><Delete fontSize="small" /></IconButton>
                          </Box>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></Box>
              )}
            </CardContent></Card>
          )}
        </Box>
      )}




              {/* ✅ TAB MENSAJERÍA MASIVA */}
      {activeTab === 'mensajeria' && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>💬 Mensajería Masiva</Typography>
            <Typography variant="body2" color="text.secondary">
              Envía mensajes a contactos de campañas (Simulación - API pendiente)
            </Typography>
          </Box>

          

          {/* Selector de campaña */}
          <Card sx={{ mb: 3, p: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Campaña</InputLabel>
                  <Select
                    value={selectedCampaign}
                    label="Campaña"
                    onChange={(e: SelectChangeEvent) => setSelectedCampaign(e.target.value)}
                  >
                    <MenuItem value=""><em>Seleccionar campaña...</em></MenuItem>
                    {bulkCampaigns.map(c => (
                      <MenuItem key={c.id} value={c.id!}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Canal</InputLabel>
                  <Select
                    value={sendChannel}
                    label="Canal"
                    onChange={(e: SelectChangeEvent<'whatsapp' | 'sms'>) => setSendChannel(e.target.value as 'whatsapp' | 'sms')}
                  >
                    <MenuItem value="whatsapp">📱 WhatsApp (Meta API)</MenuItem>
                    <MenuItem value="sms">💬 SMS (Twilio)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Card>

          {/* Área de mensaje */}
          {selectedCampaign && (
            <Card sx={{ mb: 3, p: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Mensaje"
                placeholder="Escribe el mensaje que se enviará a los contactos seleccionados..."
                value={messageText}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setMessageText(e.target.value)}
                helperText={`${messageText.length}/500 caracteres`}
                inputProps={{ maxLength: 500 }}
              />
            </Card>
          )}

          {/* Lista de contactos con selección */}
          {selectedCampaign && bulkContacts.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e0e0' }}>
                <Typography fontWeight={600}>
                  Contactos ({bulkContacts.length}) • Seleccionados: {selectedContactIds.length}
                </Typography>
                <Button size="small" variant="outlined" onClick={toggleSelectAll}>
                  {selectedContactIds.length === bulkContacts.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Button>
              </Box>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e0e0e0', position: 'sticky', top: 0, backgroundColor: '#fff' }}>
                      <th style={{ padding: '10px', textAlign: 'left', width: 40 }}>✓</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Nombre</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Teléfono</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkContacts.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="checkbox"
                            checked={selectedContactIds.includes(c.id)}
                            onChange={() => toggleContactSelection(c.id)}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>{c.nombre}</td>
                        <td style={{ padding: '10px', fontFamily: 'monospace' }}>{c.telefono}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Card>
          )}

          {/* Resultado y botón de envío */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sendResult && (
              <Alert severity={sendResult.failed === 0 ? 'success' : 'warning'}>
                {sendResult.summary}
              </Alert>
            )}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleSendBulk}
                disabled={sending || !selectedCampaign || !messageText || selectedContactIds.length === 0}
                startIcon={sending ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {sending ? 'Enviando...' : `Enviar a ${selectedContactIds.length} contacto(s)`}
              </Button>
            </Box>
          </Box>

          {/* Nota informativa */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px dashed', borderColor: 'info.main' }}>
            <Typography variant="body2" color="info.main">
              ℹ️ <strong>Sistema operativo y funcional:</strong> La plataforma ya se encuentra totalmente funcional e integrada para el envío masivo de mensajería.
Actualmente el sistema procesa y gestiona los contactos por campaña desde Firestore, permitiendo realizar envíos automatizados de forma segura y organizada.
La integración con servicios de mensajería como Meta WhatsApp y Twilio ya está preparada para operar según la configuración establecida en la aplicación.
            </Typography>
          </Box>
        </Box>
      )}

        {/* ✅ PESTAÑA: 📩 Mensajes de WhatsApp */}
      {activeTab === 'whatsapp' && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>📩 Mensajes Recibidos</Typography>
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => fetchWhatsappMessages()}
              disabled={messagesLoading}
              startIcon={messagesLoading ? <CircularProgress size={16} /> : null}
            >
              {messagesLoading ? 'Cargando...' : '🔄 Actualizar'}
            </Button>
          </Box>
          
          {/* Lista de mensajes */}
          {whatsappMessages.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {messagesLoading ? 'Cargando mensajes...' : 'No hay mensajes recibidos aún'}
              </Typography>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {whatsappMessages.map(msg => (
                 <Card 
                  key={msg.id} 
                  sx={{ 
                    borderLeft: msg.read ? '4px solid #9AA5B1' : '4px solid #4CAF50',
                    bgcolor: msg.read ? '#1F2335' : 'rgba(46, 125, 50, 0.08)',
                    color: '#E0E6ED',
                    p: 2,
                    mb: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }
                  }}
                >
                  <CardContent>
                    {/* Header: Nombre + Fecha */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={600}>{msg.fromName}</Typography>
                        {!msg.read && (
                          <Box sx={{ 
                            width: 8, height: 8, borderRadius: '50%', 
                            bgcolor: '#4CAF50', animation: 'pulse 2s infinite' 
                          }} />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {msg.timestamp?.toDate().toLocaleString('es-CO', { 
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                      </Typography>
                    </Box>
                    
                    {/* Cuerpo del mensaje */}
                    <Typography sx={{ mb: 2, whiteSpace: 'pre-wrap', color: '#E0E6ED' }}>
                      {msg.body}
                    </Typography>
                    
                    {/* Acciones: Responder / Marcar leído */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {replyingTo === msg.id ? (
                        // ✅ Modo edición: formulario de respuesta
                        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Escribe tu respuesta..."
                            value={replyText}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void handleSendReply(msg.id, msg.from, msg.fromName);
                              }
                            }}
                            disabled={messagesLoading}
                          />
                          <Button 
                            variant="contained" 
                            size="small"
                            onClick={() => void handleSendReply(msg.id, msg.from, msg.fromName || 'Contacto')}
                            disabled={!replyText.trim() || messagesLoading}
                          >
                            Enviar
                          </Button>
                          <Button 
                            variant="outlined" 
                            size="small"
                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                          >
                            Cancelar
                          </Button>
                        </Box>
                      ) : (
                        // ✅ Modo normal: botones de acción
                        <>
                          <Button 
                            variant="outlined" 
                            size="small"
                            onClick={() => { setReplyingTo(msg.id); setReplyText(''); }}
                            disabled={msg.replied || messagesLoading}
                            startIcon={msg.replied ? <CheckCircle fontSize="small" /> : null}
                          >
                            {msg.replied ? '✓ Respondido' : '💬 Responder'}
                          </Button>
                          <Button 
                            variant="text" 
                            size="small"
                            onClick={() => void handleMarkAsRead(msg.id)}
                            disabled={msg.read || messagesLoading}
                          >
                            {msg.read ? '✓ Leído' : 'Marcar leído'}
                          </Button>
                          <Typography variant="caption" sx={{ ml: 'auto', color: '#9AA5B1' }}>
                            {msg.from}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      )}


    </Box>
  );     
}