'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress, Link } from '@mui/material';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: unknown) {
      const message = mapAuthError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setPassword(e.target.value);
  };

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
            // ✅ Usar backgroundColor en lugar de bgcolor para mayor compatibilidad
            backgroundColor: 'rgba(255, 255, 255, 0.2) !important',
            // ✅ backdropFilter para efecto vidrio (si el navegador lo soporta)
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',  // ✅ Soporte Safari
            // ✅ Mantener sombra para profundidad
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            // ✅ Bordes redondeados consistentes
            borderRadius: 3,
            // ✅ Asegurar que el contenido tenga z-index para estar por encima
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

          <form onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={handleEmailChange}
              margin="normal"
              required
              disabled={loading}
              autoComplete="email"
            />

            <TextField
              fullWidth
              label="Contraseña"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              margin="normal"
              required
              disabled={loading}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ 
                mt: 3, 
                py: 1.5,
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar sesión'}
            </Button>
          </form>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Appyempresa S.A.S{' '}
              <Link 
                    href="https://appyempresa.digital/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    color="primary" 
                    fontWeight={500}
                >
                    Ver planes
                </Link>
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

// ✅ Función auxiliar para mapear errores de Firebase Auth (sin usar 'any')
function mapAuthError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('user-not-found') || msg.includes('wrong-password')) {
      return 'Credenciales inválidas';
    }
    if (msg.includes('invalid-email')) {
      return 'Email inválido';
    }
    if (msg.includes('too-many-requests')) {
      return 'Demasiados intentos. Intenta más tarde';
    }
    if (msg.includes('user-disabled')) {
      return 'Cuenta deshabilitada';
    }
    return err.message;
  }
  return 'Error al iniciar sesión';
}