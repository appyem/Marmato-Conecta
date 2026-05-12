'use client';

import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar } from '@mui/material';
import { 
  Dashboard, CarRepair, Campaign, Notifications, 
  Logout, Assessment, Message 
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
  // ✅ NUEVO: Mensajería Masiva (solo admin)
  { icon: Message, label: 'Mensajería Masiva', href: '/', tabName: 'mensajeria', roles: ['admin'] },
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
        // 🌫️ Glass effect: fondo semitransparente + blur
        bgcolor: 'rgba(26, 27, 38, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)', // Safari support
        // ✨ Borde derecho brillante (verde Marmato sutil)
        borderRight: '1px solid rgba(46, 125, 50, 0.3)',
        // 🎨 Colores base
        color: '#E0E6ED',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        position: 'fixed',
        height: '100vh',
        zIndex: 1200,
        // 🌟 Sombra suave para profundidad
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.2)',
      }}
    >
             {/* Header */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5, 
        borderBottom: '1px solid rgba(46, 125, 50, 0.2)',
        transition: 'border-color 0.3s ease'
      }}>
        <Box
          component="img"
          src="https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/escudo%20marmato.jpeg"
          alt="Escudo de Marmato"
          sx={{
            width: 40,
            height: 40,
            objectFit: 'contain',
            borderRadius: 1,
            // ✨ Glow sutil en el escudo
            filter: 'drop-shadow(0 0 8px rgba(46, 125, 50, 0.4))',
            transition: 'filter 0.3s ease',
            '&:hover': {
              filter: 'drop-shadow(0 0 12px rgba(46, 125, 50, 0.7))',
            }
          }}
        />
        {open && (
          <Typography variant="h6" sx={{ 
            fontWeight: 700, 
            lineHeight: 1.2,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            Conecta Marmato
          </Typography>
        )}
      </Box>

            {/* User info */}
      {open && profile && (
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid rgba(46, 125, 50, 0.2)',
          bgcolor: 'rgba(46, 125, 50, 0.05)',
          mx: 1,
          borderRadius: 2,
          mb: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ 
              width: 36, 
              height: 36, 
              bgcolor: 'rgba(46, 125, 50, 0.3)',
              border: '2px solid rgba(46, 125, 50, 0.5)',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#FFFFFF'
            }}>
              {profile.displayName?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ overflow: 'hidden', flex: 1 }}>
              <Typography variant="subtitle2" sx={{ 
                fontWeight: 600, 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                color: '#FFFFFF'
              }}>
                {profile.displayName}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: profile.role === 'admin' ? '#4CAF50' : '#F4C430',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                '&::before': {
                  content: '""',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: profile.role === 'admin' ? '#4CAF50' : '#F4C430',
                }
              }}>
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
              <ListItem key={item.tabName ? `${item.href}#${item.tabName}` : item.href} disablePadding sx={{ px: 1 }}>
                <ListItemButton
  onClick={() => handleNavigation(item)}
  selected={isActive}
  sx={{
    borderRadius: 3,
    minHeight: 48,
    color: '#9AA5B1',
    transition: 'all 0.25s ease',
    position: 'relative',
    '&.Mui-selected': { 
      bgcolor: 'rgba(46, 125, 50, 0.15)',
      borderLeft: '3px solid #2E7D32',
      color: '#FFFFFF',
      '&:hover': { 
        bgcolor: 'rgba(46, 125, 50, 0.25)',
        transform: 'translateX(2px)',
      },
    },
    '&:hover': { 
      bgcolor: 'rgba(255,255,255,0.06)',
      color: '#E0E6ED',
      transform: 'translateX(2px)',
      '& .sidebar-icon': {
        color: '#4CAF50',
        filter: 'drop-shadow(0 0 6px rgba(46, 125, 50, 0.5))',
      }
    },
  }}
>
  <ListItemIcon sx={{ 
    color: isActive ? '#2E7D32' : '#6B7280',
    minWidth: 40,
    transition: 'all 0.25s ease',
  }}>
    <item.icon className="sidebar-icon" sx={{ 
      fontSize: 22,
      transition: 'all 0.25s ease',
      ...(isActive && { 
        filter: 'drop-shadow(0 0 8px rgba(46, 125, 50, 0.6))',
      })
    }} />
  </ListItemIcon>
  {open && (
    <ListItemText 
      primary={item.label} 
      sx={{ 
        '& .MuiListItemText-primary': { 
          fontWeight: isActive ? 700 : 500,
          color: isActive ? '#FFFFFF' : '#9AA5B1',
          transition: 'color 0.25s ease',
          letterSpacing: isActive ? '-0.01em' : 'normal',
        }
      }} 
    />
  )}
</ListItemButton>
              </ListItem>
            );
          })}
      </List>

            {/* Logout */}
      <Box sx={{ 
        p: 1.5, 
        mt: 'auto',
        borderTop: '1px solid rgba(244, 67, 54, 0.2)',
        bgcolor: 'rgba(244, 67, 54, 0.03)',
        mx: 1,
        mb: 1,
        borderRadius: 2
      }}>
        <ListItemButton 
          onClick={handleLogout} 
          sx={{ 
            borderRadius: 2, 
            color: '#9AA5B1',
            transition: 'all 0.25s ease',
            '&:hover': { 
              bgcolor: 'rgba(244, 67, 54, 0.15)',
              color: '#F44336',
              transform: 'translateX(2px)',
              '& .logout-icon': {
                color: '#F44336',
                filter: 'drop-shadow(0 0 6px rgba(244, 67, 54, 0.4))',
              }
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Logout className="logout-icon" fontSize="small" sx={{ 
              transition: 'all 0.25s ease',
              color: '#6B7280',
            }} />
          </ListItemIcon>
          {open && (
            <ListItemText 
              primary="Cerrar sesión" 
              sx={{ 
                '& .MuiListItemText-primary': { 
                  fontWeight: 500,
                  transition: 'color 0.25s ease',
                }
              }} 
            />
          )}
        </ListItemButton>
      </Box>
    </Box>
  );
}
