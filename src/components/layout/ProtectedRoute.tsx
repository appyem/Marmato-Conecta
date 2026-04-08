'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: ('admin' | 'brigadista' | 'ciudadano')[];
  redirect?: string;
}

export default function ProtectedRoute({ 
  children, 
  roles = [], 
  redirect = '/login' 
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`${redirect}?returnTo=${pathname}`);
      } else if (roles.length > 0 && profile && !roles.includes(profile.role)) {
        router.push('/unauthorized');
      }
    }
  }, [user, profile, loading, roles, redirect, pathname, router]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user || (roles.length > 0 && profile && !roles.includes(profile.role))) {
    return null;
  }

  return <>{children}</>;
}