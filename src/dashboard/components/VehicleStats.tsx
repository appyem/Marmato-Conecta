'use client';

import { Card, CardContent, Typography, Box } from '@mui/material';
import Grid from '@mui/material/Grid2'; // ✅ MUI v6: Grid2 sin "Unstable_"
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, PieLabelRenderProps 
} from 'recharts';

interface VehicleStatsProps {
  data: {
    total: number;
    byDepartment: Array<{ name: string; value: number }>;
    byStatus: Array<{ name: string; value: number; color: string }>;
    upcomingExpirations: number;
  };
}

export default function VehicleStats({ data }: VehicleStatsProps) {
  return (
    <Grid container spacing={3}>
      {/* KPIs */}
      <Grid size={{ xs: 12, md: 3 }}> {/* ✅ MUI v6 usa 'size' en lugar de 'xs' directo */}
        <Card sx={{ bgcolor: 'primary.main', color: 'white', height: '100%' }}>
          <CardContent>
            <Typography variant="h4">{data.total}</Typography>
            <Typography variant="body2">Vehículos registrados</Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid size={{ xs: 12, md: 3 }}>
        <Card sx={{ 
          bgcolor: data.upcomingExpirations > 0 ? 'warning.main' : 'success.main', 
          color: 'white',
          height: '100%'
        }}>
          <CardContent>
            <Typography variant="h4">{data.upcomingExpirations}</Typography>
            <Typography variant="body2">Vencimientos próximos (30 días)</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Gráfico por departamento */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Vehículos por departamento de pago</Typography>
            <Box sx={{ height: 300, minHeight: 300, width: '100%', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <BarChart data={data.byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1976d2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Gráfico de estado */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Estado de documentos</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={(props: PieLabelRenderProps) => {
                      // ✅ Tipo correcto para Recharts
                      const { name, percent } = props;
                      const safeName = name ?? 'Sin nombre';
                      const safePercent = percent ?? 0;
                      return `${safeName} ${(safePercent * 100).toFixed(0)}%`;
                    }}
                  >
                    {data.byStatus.map((entry, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}