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
    mode: 'dark', // ✅ Modo oscuro ejecutivo
    primary: {
      main: '#2E7D32',    // 🟢 Verde Marmato: solo para acciones clave
      light: '#4CAF50',
      dark: '#1B5E20',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F4C430',    // 🟡 Oro Marmato: solo badges, iconos, highlights
      light: '#F9D55C',
      dark: '#C99E1F',
      contrastText: '#1A1B26', // Texto oscuro sobre dorado
    },
    background: {
      default: '#1A1B26', // 🌑 Fondo principal oscuro
      paper: '#24283B',   // 🌒 Cards y sidebar (ligeramente más claro)
    },
    text: {
      primary: '#E0E6ED', // ⚪ Texto principal legible sobre oscuro
      secondary: '#9AA5B1', // 🔘 Texto secundario sutil
    },
    error: {
      main: '#F44336',
      light: '#E57373',
    },
    success: {
      main: '#2E7D32',
    },
    warning: {
      main: '#F4C430',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    h6: { 
      fontWeight: 700, 
      color: '#E0E6ED',
      letterSpacing: '-0.02em',
    },
    body1: { 
      color: '#C9D1D9', 
      lineHeight: 1.7,
      fontWeight: 400,
    },
    subtitle2: {
      color: '#9AA5B1',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12, // Bordes modernos y suaves
  },
  components: {
    // ✅ Botones ejecutivos
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          letterSpacing: '0.01em',
          transition: 'all 0.2s ease',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #2E7D32 0%, #388E3C 100%)',
          boxShadow: '0 4px 14px rgba(46, 125, 50, 0.35)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 20px rgba(46, 125, 50, 0.5)',
          },
        },
        outlined: {
          borderColor: '#4A5568',
          '&:hover': {
            borderColor: '#2E7D32',
            backgroundColor: 'rgba(46, 125, 50, 0.1)',
          },
        },
      },
    },
    // ✅ Cards ejecutivas
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#24283B',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          borderRadius: 14,
          transition: 'box-shadow 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          '&:last-child': { paddingBottom: 24 },
        },
      },
    },
    // ✅ Inputs modernos
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#1F2335',
            borderColor: '#3B4252',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2E7D32',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2E7D32',
              borderWidth: 2,
            },
          },
        },
      },
    },
    // ✅ Tablas limpias
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#1F2335',
          color: '#E0E6ED',
          fontWeight: 600,
          borderBottom: '2px solid #3B4252',
        },
        body: {
          borderColor: '#3B4252',
          color: '#C9D1D9',
        },
      },
    },
    // ✅ Sidebar: texto blanco garantizado
    MuiListItemButton: {
      styleOverrides: {
        root: {
          color: '#E0E6ED', // ✅ Texto blanco en sidebar
          '&.Mui-selected': {
            backgroundColor: 'rgba(46, 125, 50, 0.25)', // Verde sutil para activo
            borderLeft: '3px solid #2E7D32',
            color: '#FFFFFF',
          },
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.08)',
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: '#9AA5B1',
          '.Mui-selected &': {
            color: '#2E7D32', // Icono verde cuando está activo
          },
        },
      },
    },
    // ✅ Alerts con estilo
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: '#1F2335',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#E0E6ED',
        },
      },
    },
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
