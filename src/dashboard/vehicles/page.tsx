// src/app/(dashboard)/vehicles/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, TextField, InputAdornment, IconButton, Chip, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper, Tooltip } from '@mui/material';
import { Search, Add, Visibility, Edit, Delete } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Vehicle } from '@/types';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const vehiclesRef = collection(db, 'vehicles');
        const q = query(vehiclesRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Vehicle[];
        setVehicles(data);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVehicles();
  }, []);

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.conductor?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = !filterDept || v.departamento === filterDept;
    return matchesSearch && matchesDept;
  });

  const getDocumentStatus = (vehicle: Vehicle) => {
    const now = new Date();
    const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    for (const doc of vehicle.documentos || []) {
      const expiry = new Date(doc.expiryDate);
      if (expiry < now) return { label: 'Vencido', color: 'error' as const };
      if (expiry < threshold) return { label: 'Próximo', color: 'warning' as const };
    }
    return { label: 'Vigente', color: 'success' as const };
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={600}>Vehículos</Typography>
          <Typography variant="body1" color="text.secondary">
            Gestiona el registro y seguimiento de vehículos
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => router.push('/dashboard/vehicles/new')}
        >
          Nuevo vehículo
        </Button>
      </Box>

      {/* Filtros y búsqueda */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Buscar por placa o conductor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 200 }}
              size="small"
            />
            <TextField
              select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              label="Departamento"
              SelectProps={{ native: true }}
              sx={{ minWidth: 180 }}
              size="small"
            >
              <option value="">Todos</option>
              <option value="CALDAS">Caldas</option>
              <option value="ANTIOQUIA">Antioquia</option>
              <option value="RISARALDA">Risaralda</option>
              {/* Agregar más departamentos según necesidad */}
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {/* Tabla de vehículos */}
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
              {filteredVehicles.map((vehicle) => {
                const status = getDocumentStatus(vehicle);
                return (
                  <TableRow key={vehicle.id} hover>
                    <TableCell>
                      <Typography fontWeight={500} fontFamily="monospace">{vehicle.placa}</Typography>
                    </TableCell>
                    <TableCell>{vehicle.conductor}</TableCell>
                    <TableCell>
                      <Chip label={vehicle.departamento} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={status.label} color={status.color} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {vehicle.documentos?.length || 0} documento(s)
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" onClick={() => router.push(`/dashboard/vehicles/${vehicle.id}`)}>
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
              {filteredVehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      {loading ? 'Cargando vehículos...' : 'No se encontraron vehículos'}
                    </Typography>
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