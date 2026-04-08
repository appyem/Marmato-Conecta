
'use client';

import { Grid, Card, CardContent, Typography, Box, LinearProgress } from '@mui/material';
import { CarRepair, Warning, CheckCircle, TrendingUp } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  departamento?: string;
  documentos?: VehicleDoc[];
  isActive?: boolean;
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async (): Promise<void> => {
      try {
        const vehiclesRef = collection(db, 'vehicles');
        const q = query(vehiclesRef, where('isActive', '==', true));
        const snapshot = await getDocs(q);
        
        const vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<{ id: string } & VehicleData>;
        
        const byDepartment: Record<string, number> = {};
        const byStatus: Record<string, number> = { vigente: 0, cercano: 0, vencido: 0 };
        let upcomingExpirations = 0;
        const now = new Date();
        const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        vehicles.forEach((v) => {
          const dept = v.departamento || 'OTROS';
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

        setStats({
          totalVehicles: vehicles.length,
          vehiclesInMarmato: byDepartment['CALDAS'] || 0,
          upcomingExpirations,
          activeCampaigns: 3,
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600}>Dashboard</Typography>
        <Typography variant="body1" color="text.secondary">
          Bienvenido, {profile?.displayName}. Resumen de tu gestión.
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CarRepair />
                <Typography variant="h4" fontWeight={700}>{stats?.totalVehicles || 0}</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Vehículos registrados</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: stats?.vehiclesInMarmato ? 'success.main' : 'grey.400', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircle />
                <Typography variant="h4" fontWeight={700}>{stats?.vehiclesInMarmato || 0}</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Pagan en Marmato</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: stats?.upcomingExpirations ? 'warning.main' : 'grey.400', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Warning />
                <Typography variant="h4" fontWeight={700}>{stats?.upcomingExpirations || 0}</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Vencimientos próximos</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp />
                <Typography variant="h4" fontWeight={700}>{stats?.activeCampaigns || 0}</Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Campañas activas</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Vehículos por departamento</Typography>
              <Box sx={{ height: 300, minHeight: 300, width: '100%', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                  <BarChart data={stats?.byDepartment || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1a365d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Estado de documentos</Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats?.byStatus || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={(props) => {
                        const safeName = props.name ?? 'Sin nombre';
                        const safePercent = props.percent ?? 0;
                        return `${safeName} ${(safePercent * 100).toFixed(0)}%`;
                      }}
                    >
                      {(stats?.byStatus || []).map((entry, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
