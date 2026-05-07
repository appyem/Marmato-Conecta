'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { Box, Card, CardContent, Typography, Button, TextField, InputAdornment, Chip, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper, Tooltip, IconButton, LinearProgress } from '@mui/material';
import { Search, Add, Visibility, Edit, Delete } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ✅ Tipos explícitos (sin 'any')
interface VehicleDoc {
  type: string;
  expiryDate: string;
}

interface Vehicle {
  id: string;
  placa: string;
  conductor: string;
  departamento: string;
  documentos?: VehicleDoc[];
  isActive?: boolean;
}

type StatusConfig = { label: string; color: 'success' | 'warning' | 'error' };

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDept, setFilterDept] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  
  const router = useRouter();

  useEffect(() => {
    const fetchVehicles = async (): Promise<void> => {
      try {
        setLoading(true);
        const vehiclesRef = collection(db, 'vehicles');
        const snapshot = await getDocs(vehiclesRef);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
        setVehicles(data);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  // ✅ Función getStatus reescrita con early returns (sin variable mutable)
  const getStatus = (v: Vehicle): StatusConfig => {
    const now = new Date();
    const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const docs = v.documentos || [];

    // 1️⃣ Primero: ¿Hay algún documento vencido?
    for (const doc of docs) {
      const exp = new Date(doc.expiryDate);
      if (exp < now) {
        return { label: 'Vencido', color: 'error' };
      }
    }
    
    // 2️⃣ Segundo: ¿Hay algún documento por vencer en 30 días?
    for (const doc of docs) {
      const exp = new Date(doc.expiryDate);
      if (exp < threshold) {
        return { label: 'Próximo', color: 'warning' };
      }
    }
    
    // 3️⃣ Default: todo vigente
    return { label: 'Vigente', color: 'success' };
  };

  const uniqueDepts = Array.from(new Set(vehicles.map(v => v.departamento))).sort();

  const filtered = vehicles.filter(v => {
    const matchSearch = v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        v.conductor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDept = filterDept === '' || v.departamento === filterDept;
    return matchSearch && matchDept;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Vehículos</Typography>
          <Typography variant="body1" color="text.secondary">Gestiona el registro y seguimiento de vehículos</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => router.push('/dashboard/vehicles/new')}>
          Nuevo vehículo
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Buscar por placa o conductor..."
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              sx={{ flex: 1, minWidth: 200 }}
              size="small"
            />
            <TextField
              select
              value={filterDept}
              onChange={(e: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setFilterDept(e.target.value)}
              label="Departamento"
              SelectProps={{ native: true }}
              sx={{ minWidth: 180 }}
              size="small"
            >
              <option value="">Todos</option>
              {uniqueDepts.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><Typography fontWeight={600}>Placa</Typography></TableCell>
                <TableCell><Typography fontWeight={600}>Conductor</Typography></TableCell>
                <TableCell><Typography fontWeight={600}>Departamento</Typography></TableCell>
                <TableCell><Typography fontWeight={600}>Estado</Typography></TableCell>
                <TableCell><Typography fontWeight={600}>Documentos</Typography></TableCell>
                <TableCell align="right"><Typography fontWeight={600}>Acciones</Typography></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(v => {
                const status = getStatus(v);
                return (
                  <TableRow key={v.id} hover>
                    <TableCell><Typography fontWeight={500} fontFamily="monospace">{v.placa}</Typography></TableCell>
                    <TableCell>{v.conductor}</TableCell>
                    <TableCell><Chip label={v.departamento} size="small" variant="outlined" /></TableCell>
                    <TableCell><Chip label={status.label} color={status.color} size="small" /></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{v.documentos?.length || 0} doc(s)</Typography></TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" onClick={() => router.push(`/dashboard/vehicles/${v.id}`)}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton size="small" color="primary">
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error">
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No se encontraron vehículos</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}