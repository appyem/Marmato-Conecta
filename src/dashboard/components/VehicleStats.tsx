'use client';

import { Card, CardContent, Typography, Grid, Box } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h4">{data.total}</Typography>
            <Typography variant="body2">Vehículos registrados</Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: data.upcomingExpirations > 0 ? 'warning.main' : 'success.main', color: 'white' }}>
          <CardContent>
            <Typography variant="h4">{data.upcomingExpirations}</Typography>
            <Typography variant="body2">Vencimientos próximos (30 días)</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Gráfico por departamento */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Vehículos por departamento de pago</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
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
      <Grid item xs={12} md={6}>
        <Card>
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.byStatus.map((entry, index) => (
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