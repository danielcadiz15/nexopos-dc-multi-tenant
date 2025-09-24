import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Computer,
  CloudUpload,
  Code,
  Visibility,
  Refresh,
  Error,
  CheckCircle,
  Warning,
  PlayArrow,
  Pause,
  Settings
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useSystem } from '../contexts/SystemContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const { systems, loading, refreshSystem } = useSystem();
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      setLoadingOverview(true);
      const response = await axios.get('/api/monitoring/overview');
      if (response.data.success) {
        setOverview(response.data.overview);
      }
    } catch (error) {
      console.error('Error cargando vista general:', error);
    } finally {
      setLoadingOverview(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'ready':
        return 'success';
      case 'inactive':
        return 'default';
      case 'error':
        return 'error';
      case 'maintenance':
        return 'warning';
      case 'needs_setup':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
      case 'ready':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'maintenance':
      case 'needs_setup':
        return <Warning color="warning" />;
      default:
        return <Pause color="disabled" />;
    }
  };

  // Datos para el gráfico de actividad
  const chartData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      {
        label: 'Sistemas Activos',
        data: [12, 19, 14, 18, 16, 20, 15],
        borderColor: 'rgb(25, 118, 210)',
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Despliegues',
        data: [2, 3, 1, 4, 2, 3, 1],
        borderColor: 'rgb(220, 0, 78)',
        backgroundColor: 'rgba(220, 0, 78, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Actividad de la Semana',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading || loadingOverview) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Cargando dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Dashboard - Meta Sistema de Gestión
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bienvenido, {user?.name}. Vista general de todos tus sistemas.
        </Typography>
      </Box>

      {/* Tarjetas de resumen */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total Sistemas
                  </Typography>
                  <Typography variant="h4">
                    {overview?.totalSystems || systems.length}
                  </Typography>
                </Box>
                <Computer color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Activos
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {overview?.activeCount || 0}
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    En Error
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {overview?.errorCount || 0}
                  </Typography>
                </Box>
                <Error color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Mantenimiento
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {overview?.maintenanceCount || 0}
                  </Typography>
                </Box>
                <Warning color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Gráfico de actividad */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actividad del Sistema
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Acciones rápidas */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Acciones Rápidas
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<Code />}
                  fullWidth
                  href="/code"
                >
                  Editor de Código
                </Button>
                <Button
                  variant="contained"
                  startIcon={<CloudUpload />}
                  fullWidth
                  href="/deployment"
                >
                  Desplegar Sistema
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Visibility />}
                  fullWidth
                  href="/monitoring"
                >
                  Monitoreo
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Settings />}
                  fullWidth
                  href="/templates"
                >
                  Crear Nuevo Sistema
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Lista de sistemas */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Sistemas Registrados
                </Typography>
                <IconButton onClick={loadOverview}>
                  <Refresh />
                </IconButton>
              </Box>
              {systems.length === 0 ? (
                <Alert severity="info">
                  No hay sistemas registrados. Los sistemas se detectarán automáticamente o puedes crear uno nuevo.
                </Alert>
              ) : (
                <List>
                  {systems.map((system, index) => (
                    <React.Fragment key={system.id}>
                      <ListItem>
                        <ListItemIcon>
                          {getStatusIcon(system.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1">
                                {system.name}
                              </Typography>
                              <Chip 
                                label={system.status} 
                                size="small" 
                                color={getStatusColor(system.status)}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Tipo: {system.type} • Última verificación: {
                                  system.lastChecked ? 
                                  new Date(system.lastChecked).toLocaleString() : 
                                  'Nunca'
                                }
                              </Typography>
                              {system.technologies && (
                                <Box sx={{ mt: 0.5 }}>
                                  {system.technologies.map((tech) => (
                                    <Chip 
                                      key={tech} 
                                      label={tech} 
                                      size="small" 
                                      variant="outlined" 
                                      sx={{ mr: 0.5, mb: 0.5 }}
                                    />
                                  ))}
                                </Box>
                              )}
                            </Box>
                          }
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => refreshSystem(system.id)}
                            title="Actualizar"
                          >
                            <Refresh />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            href={`/code/${system.id}`}
                            title="Editar código"
                          >
                            <Code />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            href={`/monitoring`}
                            title="Monitorear"
                          >
                            <Visibility />
                          </IconButton>
                        </Box>
                      </ListItem>
                      {index < systems.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Actividad reciente */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Actividad Reciente
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Sistema Zeus actualizado"
                    secondary="Hace 5 minutos"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CloudUpload color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Despliegue a producción"
                    secondary="Hace 1 hora"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Code color="info" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Archivo modificado en Mueblería"
                    secondary="Hace 2 horas"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PlayArrow color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Sistema de Despensa iniciado"
                    secondary="Hace 3 horas"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}