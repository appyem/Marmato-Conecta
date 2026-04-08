'use client';

import { useState } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { AuthProvider } from '@/contexts/AuthContext';

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

  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
