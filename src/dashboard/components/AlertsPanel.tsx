'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Chip, LinearProgress } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';

interface AlertMetrics {
  total: number;
  byLevel: Record<string, number>;  // ✅ Tipado correcto
  byDocument: Record<string, number>;
  lastSent: string | null;
}

export default function AlertsPanel() {
  const [metrics, setMetrics] = useState<AlertMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin()) return;
    
    const fetchMetrics = async () => {
      try {
        const functions = getFunctions();
        const getMetrics = httpsCallable<object, AlertMetrics>(functions, 'getAlertMetrics');
        const result = await getMetrics();
        setMetrics(result.data);
      } catch (error) {
        console.error('Error fetching alert metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    // Refrescar cada 5 minutos
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin()) return null;
  if (loading) return <LinearProgress />;

  const levelColors: Record<string, string> = {
    info: '#22c55e',
    warning: '#eab308',
    urgent: '#f97316',
    critical: '#ef4444',
    overdue: '#000000'
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>🔔 Alertas Automáticas</Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {metrics?.byLevel && Object.entries(metrics.byLevel).map(([level, count]) => (
            <Chip
              key={level}
              label={`${level}: ${count}`}
              sx={{ 
                bgcolor: levelColors[level] || '#999', 
                color: level === 'overdue' ? 'white' : 'black',
                fontWeight: 500 
              }}
            />
          ))}
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          Total alertas (7 días): {metrics?.total || 0}
          {metrics?.lastSent && ` • Última: ${new Date(metrics.lastSent).toLocaleString('es-CO')}`}
        </Typography>
      </CardContent>
    </Card>
  );
}