'use client';

import { Box, Typography, Container, LinearProgress, Card, CardContent, Grid, TextField, Button, FormControl, InputLabel, Select, MenuItem, Alert, FormHelperText, SelectChangeEvent } from '@mui/material';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CharacterizationPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // ✅ Aquí validaremos la campaña en Firestore en el Paso 3
    console.log('🔗 Cargando caracterización para campaña:', campaignId);
    setTimeout(() => setLoading(false), 800); // Simulación de carga
  }, [campaignId]);


  // ✅ Estados para el formulario
  const [formData, setFormData] = useState({
    placa: '',
    conductor: '',
    propietario: '',
    cedula: '',
    telefono: '',
    transito: '',
    contactoPago: '',
    soatExpiry: '',
    tecnoExpiry: '',
    impuestoExpiry: '',
    tipoVehiculo: ''
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formMsg, setFormMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  // ✅ Handler para cambios en inputs
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormMsg(null);
  };

    // ✅ Handler específico para Select de MUI
  const handleSelectChange = (event: SelectChangeEvent<string>): void => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormMsg(null);
  };

  // ✅ Validación básica
  const validateForm = (): boolean => {
    if (!formData.placa.trim() || !formData.conductor.trim() || !formData.propietario.trim() || 
        !formData.cedula.trim() || !formData.telefono.trim() || !formData.transito.trim() || 
        !formData.contactoPago.trim() || !formData.tipoVehiculo) {
      setFormMsg({ type: 'error', text: 'Todos los campos marcados con * son obligatorios' });
      return false;
    }
    if (formData.cedula.length < 7 || formData.cedula.length > 10) {
      setFormMsg({ type: 'error', text: 'La cédula debe tener entre 7 y 10 dígitos' });
      return false;
    }
    return true;
  };

  // ✅ Verificar cédula duplicada en Firestore
  const checkDuplicateCedula = async (cedula: string): Promise<boolean> => {
    try {
      const q = query(collection(db, 'vehicles'), where('cedulaPropietario', '==', cedula));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch {
      return false; // Si hay error, permitimos continuar (fail-safe)
    }
  };

  // ✅ Submit del formulario
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setFormMsg(null);

    try {
      // Verificar cédula duplicada
      const isDuplicate = await checkDuplicateCedula(formData.cedula);
      if (isDuplicate) {
        setFormMsg({ type: 'error', text: '⚠️ Esta cédula ya está registrada en el sistema. ¿Deseas continuar de todas formas?' });
        setSubmitting(false);
        return;
      }

      // Preparar documento para Firestore
      const newVehicle = {
        placa: formData.placa.toUpperCase().trim(),
        conductor: formData.conductor.trim(),
        propietario: formData.propietario.trim(),
        cedulaPropietario: formData.cedula.trim(),
        telefono: formData.telefono.trim(),
        transito: formData.transito.trim(),
        contactoPago: formData.contactoPago.trim(),
        tipoVehiculo: formData.tipoVehiculo,
        documentos: [] as Array<{ type: string; expiryDate?: string }>,
        campaignId: campaignId || '',
        capturedAt: new Date(),
        isActive: true
      };

      // Agregar fechas de vencimiento si existen
      if (formData.soatExpiry) newVehicle.documentos.push({ type: 'SOAT', expiryDate: formData.soatExpiry });
      if (formData.tecnoExpiry) newVehicle.documentos.push({ type: 'Tecnomecánica', expiryDate: formData.tecnoExpiry });
      if (formData.impuestoExpiry) newVehicle.documentos.push({ type: 'Impuesto Vehicular', expiryDate: formData.impuestoExpiry });

      // Guardar en Firestore
      await addDoc(collection(db, 'vehicles'), newVehicle);

      // Feedback de éxito
      setFormMsg({ type: 'success', text: '✅ Vehículo registrado exitosamente. Los datos ya están disponibles en el dashboard.' });
      
      // Resetear formulario después de 2 segundos
      setTimeout(() => {
        setFormData({
          placa: '', conductor: '', propietario: '', cedula: '', telefono: '',
          transito: '', contactoPago: '', soatExpiry: '', tecnoExpiry: '', 
          impuestoExpiry: '', tipoVehiculo: ''
        });
      }, 2000);

    } catch (err: unknown) {
      console.error('Error saving vehicle:', err);
      const message = err instanceof Error ? err.message : 'Error al guardar. Intenta nuevamente.';
      setFormMsg({ type: 'error', text: message });
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f8fafc' }}>
        <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
      </Box>
    );
  }

    return (
    <Container maxWidth="md" sx={{ py: 4 }} suppressHydrationWarning={true}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="primary.main">
          📋 Caracterización Vehicular
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Completa la información del vehículo. Todos los campos marcados con * son obligatorios.
        </Typography>
        {campaignId && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
            ID Campaña: {campaignId}
          </Typography>
        )}
      </Box>

      {formMsg && <Alert severity={formMsg.type} sx={{ mb: 2 }} onClose={() => setFormMsg(null)}>{formMsg.text}</Alert>}

      <Card elevation={2}>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              {/* Placa */}
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  label="Placa *" 
                  name="placa" 
                  value={formData.placa} 
                  onChange={handleFormChange}
                  placeholder="ABC123"
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                  disabled={submitting}
                />
              </Grid>
              
              {/* Tipo de vehículo */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Tipo de vehículo *</InputLabel>
                  <Select 
                    name="tipoVehiculo" 
                    value={formData.tipoVehiculo} 
                    onChange={handleSelectChange}
                    label="Tipo de vehículo *"
                    disabled={submitting}
                  >
                    <MenuItem value=""><em>Seleccionar...</em></MenuItem>
                    <MenuItem value="Moto">Moto</MenuItem>
                    <MenuItem value="Carro">Carro</MenuItem>
                    <MenuItem value="Camión">Camión</MenuItem>
                    <MenuItem value="Bus">Bus</MenuItem>
                    <MenuItem value="Furgón">Furgón</MenuItem>
                    <MenuItem value="Otro">Otro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Nombre conductor */}
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  label="Nombre del conductor *" 
                  name="conductor" 
                  value={formData.conductor} 
                  onChange={handleFormChange}
                  disabled={submitting}
                />
              </Grid>

              {/* Nombre propietario */}
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  label="Nombre del propietario *" 
                  name="propietario" 
                  value={formData.propietario} 
                  onChange={handleFormChange}
                  disabled={submitting}
                />
              </Grid>

              {/* Cédula propietario */}
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  label="Cédula del propietario *" 
                  name="cedula" 
                  type="number"
                  value={formData.cedula} 
                  onChange={handleFormChange}
                  inputProps={{ min: 1000000, max: 9999999999 }}
                  helperText="7-10 dígitos"
                  disabled={submitting}
                />
              </Grid>

              {/* Teléfono */}
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  label="Teléfono *" 
                  name="telefono" 
                  type="tel"
                  value={formData.telefono} 
                  onChange={handleFormChange}
                  placeholder="3001234567"
                  disabled={submitting}
                />
              </Grid>

              {/* Tránsito (texto libre) */}
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  label="Tránsito al que pertenece *" 
                  name="transito" 
                  value={formData.transito} 
                  onChange={handleFormChange}
                  placeholder="Ej: Marmato, Manizales, Bogotá..."
                  disabled={submitting}
                />
              </Grid>

              {/* Contacto de pago (número) */}
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  required 
                  label="Contacto de quien paga *" 
                  name="contactoPago" 
                  type="tel"
                  value={formData.contactoPago} 
                  onChange={handleFormChange}
                  placeholder="Nombre + Teléfono (3001234567)"
                  disabled={submitting}
                />
                <FormHelperText>Nombre y teléfono de la persona que realiza el pago</FormHelperText>
              </Grid>

              {/* Vencimiento SOAT */}
              <Grid item xs={12} sm={4}>
                <TextField 
                  fullWidth 
                  type="date" 
                  label="Vencimiento SOAT" 
                  name="soatExpiry" 
                  value={formData.soatExpiry} 
                  onChange={handleFormChange}
                  InputLabelProps={{ shrink: true }}
                  disabled={submitting}
                />
              </Grid>

              {/* Vencimiento Tecnomecánica */}
              <Grid item xs={12} sm={4}>
                <TextField 
                  fullWidth 
                  type="date" 
                  label="Vencimiento Tecnomecánica" 
                  name="tecnoExpiry" 
                  value={formData.tecnoExpiry} 
                  onChange={handleFormChange}
                  InputLabelProps={{ shrink: true }}
                  disabled={submitting}
                />
              </Grid>

              {/* Vencimiento Impuesto Vehicular */}
              <Grid item xs={12} sm={4}>
                <TextField 
                  fullWidth 
                  type="date" 
                  label="Venc. Impuesto Vehicular" 
                  name="impuestoExpiry" 
                  value={formData.impuestoExpiry} 
                  onChange={handleFormChange}
                  InputLabelProps={{ shrink: true }}
                  disabled={submitting}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
              <Button variant="outlined" onClick={() => window.history.back()} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Registrar Vehículo'}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>

      <Box sx={{ textAlign: 'center', mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Conecta Marmato • Datos protegidos y sincronizados en tiempo real
        </Typography>
      </Box>
    </Container>
  );
}
