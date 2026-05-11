'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { Box, CssBaseline, ThemeProvider, createTheme, Typography, Button, Card, CardContent } from '@mui/material';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';


const theme = createTheme({
  palette: {
    primary: { main: '#1a365d', light: '#2c5282', dark: '#1a202c' },
    secondary: { main: '#f59e0b' },
    background: { default: '#f8fafc', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h6: { fontWeight: 600 },
  },
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

     

       useEffect(() => {
    if (authLoading || (user && !profile)) return;
    
    if (!user) {
      if (auth.currentUser) return;
      router.replace('/login');
    }
    // ✅ Redirección automática eliminada. Ahora se mostrará mensaje de acceso restringido.
  }, [user, profile, authLoading, router]);

  // Mostrar loading mientras verifica auth
  if (authLoading) {
    return null; // o un spinner si prefieres
  }

    // Si no hay usuario, no renderizar nada
  if (!user) {
    return null;
  }

  // ✅ Mostrar mensaje explícito si no es admin
  if (profile?.role !== 'admin') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
          <Card elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: 450, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h4" color="error.main" fontWeight={700} gutterBottom>⛔ Acceso Restringido</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                No estás autorizado para ingresar al panel de administración. Este entorno es exclusivo para superadministradores.
              </Typography>
              <Button variant="contained" color="primary" onClick={() => router.replace('/login')} sx={{ px: 4, py: 1.5 }}>
                Volver al Login
              </Button>
            </CardContent>
          </Card>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
          <Sidebar open={sidebarOpen} />
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', ml: sidebarOpen ? '240px' : 0 }}>
            <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
            <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 }, overflow: 'auto' }}>
              {children}
            </Box>
          </Box>
        </Box>
      </ThemeProvider>
    
  );
}
