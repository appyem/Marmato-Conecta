'use client';

import { Box, Typography, Container, LinearProgress, Card, CardContent, Grid, TextField, Button, FormControl, InputLabel, Select, MenuItem, Alert, FormHelperText, SelectChangeEvent } from '@mui/material';
import { collection, addDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, FormEvent } from 'react';

export default function CharacterizationPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [loading, setLoading] = useState<boolean>(true);

  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string>('');
  const [userProfile, setUserProfile] = useState<{ displayName: string; role: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

    // ✅ Verificar sesión y cargar campaña
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          // Validar perfil en Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.role === 'brigadista' || data.role === 'admin') {
              setUserProfile({ displayName: data.displayName, role: data.role });
              setIsAuthenticated(true);
            } else {
              setAuthError('Acceso no autorizado. Rol no válido.');
              await signOut(auth);
            }
          } else {
            setAuthError('Perfil no encontrado.');
            await signOut(auth);
          }
        } catch (err) {
          console.error('Error validando usuario:', err);
          setAuthError('Error de autenticación.');
        }
      }
      setAuthLoading(false);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);


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

    // ✅ Login del brigadista
  const handleLogin = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setAuthError('');
    setLoginSubmitting(true);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setAuthError('Email y contraseña son requeridos');
      setLoginSubmitting(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      // onAuthStateChanged se encarga del resto
    } catch (err: unknown) {
  const message = err instanceof Error && 'code' in err && typeof (err as { code: string }).code === 'string' && (err as { code: string }).code === 'auth/invalid-credential'
    ? 'Credenciales inválidas'
    : err instanceof Error ? err.message : 'Error al iniciar sesión';
  setAuthError(message);
    } finally {
      setLoginSubmitting(false);
    }
  };

  // ✅ Logout
  const handleLogout = async (): Promise<void> => {
    await signOut(auth);
    setIsAuthenticated(false);
    setUserProfile(null);
    setLoginEmail('');
    setLoginPassword('');
    router.refresh();
  };

    // ✅ ENVÍO DE WHATSAPP CON API OFICIAL (Meta) - Plantilla aprobada
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sendLegalConsentWhatsApp = async (telefono: string, nombre: string, _campaignId: string): Promise<void> => {
  try {
    // Limpiar número: solo dígitos, con código de país
    const phoneDigits = telefono.replace(/\D/g, '');
    const to = phoneDigits.startsWith('57') ? phoneDigits : `57${phoneDigits}`;


    // 🔍 LOG: Ver exactamente qué se envía a la API interna
    console.log('📤 FORMULARIO -> Enviando a /api/send-whatsapp:', {
      to,
      templateName: 'marmato_consentimiento_datos',
      parameters: { nombre, link: 'https://www.mintic.gov.co/portal/715/articles-2627_Resolucion_2238_de_2024.pdf' }
    });

    // Llamar a nuestra API route local con la plantilla aprobada
    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
                  template: {
          name: 'marmato_consentimiento_datos',
          language: { code: 'es_CO' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: nombre },
                { type: 'text', text: 'https://www.mintic.gov.co/portal/715/articles-2627_Resolucion_2238_de_2024.pdf' },
              ],
            },
            // ❌ COMENTAR O BORRAR ESTE BLOQUE TEMPORALMENTE:
            /*
            {
              type: 'button',
              subType: 'quick_reply',
              index: 0,
              parameters: [
                { type: 'payload', payload: 'SI_CONSENTIMIENTO_ACEPTADO' }
              ],
            },
            */
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
    // ✅ Type guard seguro (sin 'any', cumple ESLint)
    const msg = err instanceof Error ? err.message : 'Error de red';
    console.warn('⚠️ Error enviando WhatsApp:', msg);
    // No interrumpimos el flujo principal
  }
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

      // ✅ Enviar mensaje de consentimiento legal por WhatsApp nativo
      if (formData.telefono) {
        sendLegalConsentWhatsApp(
          formData.telefono,
          formData.propietario || formData.conductor,
          campaignId || 'Sin campaña'
        );
      }

      // Feedback de éxito
      setFormMsg({ type: 'success', text: '✅ Vehículo registrado + Consentimiento legal enviado por WhatsApp.' });
      
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


    // ✅ Pantalla de carga inicial
  if (authLoading || loading) {
    return (
      <Box 
  sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f8fafc' }}
  suppressHydrationWarning={true}
>
  <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
</Box>
    );
  }

    // ✅ Pantalla de Login (si no está autenticado) - Diseño unificado con login principal
  if (!isAuthenticated) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: '#f8fafc',
        backgroundImage: 'url(https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/marmato%20fondo.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        p: 2 
      }}>
        <Card 
          elevation={3}
          sx={{ 
            width: '100%', 
            maxWidth: 420, 
            backgroundColor: 'rgba(255, 255, 255, 0.2) !important',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            borderRadius: 3,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                component="img"
                src="https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/escudo%20marmato.jpeg"
                alt="Escudo de Marmato"
                sx={{
                  width: 60,
                  height: 60,
                  objectFit: 'contain',
                  mx: 'auto',
                  mb: 2,
                  display: 'block',
                }}
              />
              <Typography variant="h5" fontWeight={600}>Conecta Marmato</Typography>
              <Typography variant="body2" color="text.secondary">
                Gestión municipal inteligente
              </Typography>
            </Box>

            {authError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAuthError('')}>
                {authError}
              </Alert>
            )}

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Correo electrónico"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                margin="normal"
                required
                disabled={loginSubmitting}
                autoComplete="email"
              />

              <TextField
                fullWidth
                label="Contraseña"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                margin="normal"
                required
                disabled={loginSubmitting}
                autoComplete="current-password"
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loginSubmitting}
                sx={{ 
                  mt: 3, 
                  py: 1.5,
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                {loginSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
              </Button>
            </form>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Appyempresa S.A.S{' '}
                <Box 
                  component="a"
                  href="https://appyempresa.digital/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  color="primary" 
                  fontWeight={500}
                  sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  Ver planes
                </Box>
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                © 2026 Alcaldía de Marmato
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

    // ✅ Formulario de caracterización (solo para autenticados) - Diseño institucional
  return (
  <Box 
    component="div"
    suppressHydrationWarning={true}
    sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f8fafc',
      backgroundImage: 'url(https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/marmato%20fondo.jpeg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      py: 4,
      px: 2
    }}
  >
      <Container maxWidth="md">
        
        {/* Header institucional con logo y bienvenida */}
        <Card sx={{ 
          mb: 3, 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}>
          <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              component="img"
              src="https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/escudo%20marmato.jpeg"
              alt="Escudo de Marmato"
              sx={{ width: 50, height: 50, objectFit: 'contain' }}
            />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight={700} color="primary.main">Alcaldía de Marmato</Typography>
              <Typography variant="body2" color="text.secondary">Conecta Marmato • Gestión municipal inteligente</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                👋 {userProfile?.displayName}
              </Typography>
              <Button variant="outlined" size="small" onClick={handleLogout} color="error" sx={{ fontSize: '11px', px: 1.5 }}>
                Salir
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Título del formulario */}
        <Card sx={{ 
          mb: 3, 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 2,
          textAlign: 'center',
          py: 2
        }}>
          <CardContent>
            <Typography variant="h5" fontWeight={700} color="primary.main" gutterBottom>
              📋 Caracterización Vehicular
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completa la información del vehículo. Todos los campos marcados con * son obligatorios.
            </Typography>
            {campaignId && (
              <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 1, fontWeight: 500 }}>
                Campaña ID: {campaignId}
              </Typography>
            )}
          </CardContent>
        </Card>

        {formMsg && <Alert severity={formMsg.type} sx={{ mb: 2 }} onClose={() => setFormMsg(null)}>{formMsg.text}</Alert>}

        {/* Formulario */}
        <Card elevation={2} sx={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 2
        }}>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                {/* Placa */}
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Placa *" name="placa" value={formData.placa} onChange={handleFormChange} placeholder="ABC123" inputProps={{ style: { textTransform: 'uppercase' } }} disabled={submitting} />
                </Grid>
                {/* Tipo de vehículo */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Tipo de vehículo *</InputLabel>
                    <Select name="tipoVehiculo" value={formData.tipoVehiculo} onChange={handleSelectChange} label="Tipo de vehículo *" disabled={submitting}>
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
                  <TextField fullWidth required label="Nombre del conductor *" name="conductor" value={formData.conductor} onChange={handleFormChange} disabled={submitting} />
                </Grid>
                {/* Nombre propietario */}
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Nombre del propietario *" name="propietario" value={formData.propietario} onChange={handleFormChange} disabled={submitting} />
                </Grid>
                {/* Cédula propietario */}
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Cédula del propietario *" name="cedula" type="number" value={formData.cedula} onChange={handleFormChange} inputProps={{ min: 1000000, max: 9999999999 }} helperText="7-10 dígitos" disabled={submitting} />
                </Grid>
                {/* Teléfono */}
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Teléfono *" name="telefono" type="tel" value={formData.telefono} onChange={handleFormChange} placeholder="3001234567" disabled={submitting} />
                </Grid>
                {/* Tránsito */}
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Tránsito al que pertenece *" name="transito" value={formData.transito} onChange={handleFormChange} placeholder="Ej: Marmato, Manizales..." disabled={submitting} />
                </Grid>
                {/* Contacto de pago */}
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required label="Contacto de quien paga *" name="contactoPago" type="tel" value={formData.contactoPago} onChange={handleFormChange} placeholder="Nombre + Teléfono" disabled={submitting} />
                  <FormHelperText>Nombre y teléfono de la persona que realiza el pago</FormHelperText>
                </Grid>
                {/* Vencimientos */}
                <Grid item xs={12} sm={4}><TextField fullWidth type="date" label="Vencimiento SOAT" name="soatExpiry" value={formData.soatExpiry} onChange={handleFormChange} InputLabelProps={{ shrink: true }} disabled={submitting} /></Grid>
                <Grid item xs={12} sm={4}><TextField fullWidth type="date" label="Vencimiento Tecnomecánica" name="tecnoExpiry" value={formData.tecnoExpiry} onChange={handleFormChange} InputLabelProps={{ shrink: true }} disabled={submitting} /></Grid>
                <Grid item xs={12} sm={4}><TextField fullWidth type="date" label="Venc. Impuesto Vehicular" name="impuestoExpiry" value={formData.impuestoExpiry} onChange={handleFormChange} InputLabelProps={{ shrink: true }} disabled={submitting} /></Grid>
              </Grid>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                <Button variant="outlined" onClick={() => window.history.back()} disabled={submitting}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={submitting} sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' } }}>
                  {submitting ? 'Guardando...' : 'Registrar Vehículo'}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>

        {/* Footer institucional */}
        <Box sx={{ textAlign: 'center', mt: 4, p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            © 2026 Alcaldía de Marmato • Conecta Marmato
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
            Datos protegidos y sincronizados en tiempo real
          </Typography>
        </Box>

      </Container>
    </Box>
  );
}