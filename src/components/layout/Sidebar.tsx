'use client';

import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar } from '@mui/material';
import { 
  Dashboard, CarRepair, Campaign, Notifications, 
  Logout, Assessment 
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  open: boolean;
  onToggle?: () => void;  // ✅ Opcional, para toggle desde mobile
}

type MenuItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  tabName?: string;  // ✅ Para controlar tabs en dashboard (sin cambiar URL)
  roles?: string[];
};

const menuItems: MenuItem[] = [
  { icon: Dashboard, label: 'Dashboard', href: '/', tabName: 'resumen', roles: ['admin', 'brigadista'] },
  { icon: CarRepair, label: 'Vehículos', href: '/', tabName: 'vehiculos', roles: ['admin', 'brigadista'] },
  { icon: Campaign, label: 'Campañas', href: '/', tabName: 'campanas', roles: ['admin'] },
  { icon: Notifications, label: 'Alertas', href: '/', tabName: 'alertas', roles: ['admin', 'brigadista'] },
  { icon: Assessment, label: 'Reportes', href: '/', tabName: 'reportes', roles: ['admin'] },
  { icon: Assessment, label: 'Brigadistas', href: '/', tabName: 'brigadistas', roles: ['admin'] },

];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Sidebar({ open, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

    const handleNavigation = (item: MenuItem): void => {
    if (item.tabName) {
      // eslint-disable-next-line react-hooks/immutability
      window.location.hash = item.tabName;
    } else {
      router.push(item.href);
    }
  };

  const handleLogout = async (): Promise<void> => {
    await signOut();
    router.push('/login');
  };

  return (
    <Box
      sx={{
        width: open ? 240 : 72,
        bgcolor: 'primary.main',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s',
        overflow: 'hidden',
        position: 'fixed',
        height: '100vh',
        zIndex: 1200,
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'secondary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          CM
        </Box>
        {open && <Typography variant="h6" sx={{ fontWeight: 600 }}>Conecta Marmato</Typography>}
      </Box>

      {/* User info */}
      {open && profile && (
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '0.875rem' }}>
              {profile.displayName?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile.displayName}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'capitalize' }}>
                {profile.role}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Navigation */}
      <List sx={{ flex: 1, py: 1 }}>
        {menuItems
          .filter((item) => !item.roles || item.roles.includes(profile?.role || 'admin'))
          .map((item) => {
            const currentHash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
            const isActive = item.tabName 
              ? currentHash === item.tabName
              : pathname === item.href;
            return (
              <ListItem key={item.href} disablePadding sx={{ px: 1 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item)}
                  selected={isActive}
                  sx={{
                    borderRadius: 2,
                    minHeight: 48,
                    '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                    <item.icon />
                  </ListItemIcon>
                  {open && <ListItemText primary={item.label} sx={{ '& .MuiListItemText-primary': { fontWeight: isActive ? 600 : 400 } }} />}
                </ListItemButton>
              </ListItem>
            );
          })}
      </List>

      {/* Logout */}
      <Box sx={{ p: 1, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
          <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
            <Logout fontSize="small" />
          </ListItemIcon>
          {open && <ListItemText primary="Cerrar sesión" />}
        </ListItemButton>
      </Box>
    </Box>
  );
}
