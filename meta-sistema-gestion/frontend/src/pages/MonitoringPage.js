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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField
} from '@mui/material';
import {
  Visibility,
  CheckCircle,
  Error,
  Warning,
  Refresh,
  TrendingUp,
  Storage,
  Memory,
  Speed,
  SmartToy,
  BugReport,
  Analytics
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { useSystem } from '../contexts/SystemContext';
import { useAI } from '../contexts/AIContext';
import axios from 'axios';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function MonitoringPage() {
  const { systems } = useSystem();
  const { sendMessage, analyzeSystem } = useAI();
  const [tabValue, setTabValue] = useState(0);
  const [overview, setOverview] = useState(null);
  const [systemHealth, setSystemHealth] = useState({});
  const [systemLogs, setSystemLogs] = useState({});
  const [loading, setLoading] = useState(false);
  const [logsDialog, setLogsDialog] = useState(false);
  const [selectedSystemLogs, setSelectedSystemLogs] = useState(null);

  useEffect(() => {
    loadMonitoringData();
    // Actualizar cada 30 segundos
    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      // Cargar vista general
      const overviewResponse = await axios.get('/api/monitoring/overview');
      if (overviewResponse.data.success) {
        setOverview(overviewResponse.data.overview);
      }

      // Cargar salud de cada sistema
      const healthPromises = systems.map(async (system) => {
        try {
          const response = await axios.get(`/api/monitoring/${system.id}/health`);
          return { systemId: system.id, health: response.data.health };
        } catch (error) {
          return { systemId: system.id, health: { overall: 'error', checks: [] } };
        }
      });

      const healthResults = await Promise.all(healthPromises);
      const healthMap = {};
      healthResults.forEach(({ systemId, health }) => {
        healthMap[systemId] = health;
      });
      setSystemHealth(healthMap);

    } catch (error) {
      console.error('Error cargando datos de monitoreo:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemLogs = async (systemId) => {
    try {
      const response = await axios.get(`/api/monitoring/${systemId}/logs?lines=50`);
      if (response.data.success) {
        setSelectedSystemLogs({
          systemId,
          logs: response.data.logs
        });
        setLogsDialog(true);
      }
    } catch (error) {
      console.error('Error cargando logs:', error);
    }
  };

  const askAIAboutSystem = async (system) => {
    const health = systemHealth[system.id];
    let query = `Analiza el estado del sistema ${system.name}`;
    
    if (health) {
      query += `. Estado general: ${health.overall}`;
      if (health.checks && health.checks.length > 0) {
        const issues = health.checks.filter(c => c.status === 'error' || c.status === 'warning');
        if (issues.length > 0) {
          query += `. Problemas detectados: ${issues.map(i => i.message).join(', ')}`;
        }
      }
    }
    
    query += '. ¿Qué recomendaciones tienes?';
    sendMessage(query);
  };

  const runAIAnalysis = async (systemId) => {
    try {
      await analyzeSystem(systemId);
    } catch (error) {
      console.error('Error en análisis AI:', error);
    }
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <Error color="error" />;
      default:
        return <Visibility color="disabled" />;
    }
  };

  // Datos para gráficos (simulados)
  const performanceData = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    datasets: [
      {
        label: 'CPU %',
        data: [15, 25, 45, 60, 35, 20],
        borderColor: 'rgb(25, 118, 210)',
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Memoria %',
        data: [30, 35, 50, 65, 45, 35],
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
        text: 'Métricas de Rendimiento (24h)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <Visibility sx={{ mr: 1, verticalAlign: 'middle' }} />
            Monitoreo de Sistemas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Supervisa el estado y rendimiento de todos tus sistemas
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadMonitoringData}
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </Box>

      {/* Métricas generales */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {overview ? overview.activeCount : 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sistemas Activos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {overview ? overview.errorCount : 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Con Errores
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {overview ? overview.maintenanceCount : 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                En Mantenimiento
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                85%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Disponibilidad
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Estado de Sistemas" />
          <Tab label="Métricas de Rendimiento" />
          <Tab label="Logs y Eventos" />
          <Tab label="Análisis AI" />
        </Tabs>
      </Box>

      {/* Tab 1: Estado de Sistemas */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {systems.map((system) => {
            const health = systemHealth[system.id];
            
            return (
              <Grid item xs={12} md={6} lg={4} key={system.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6" component="h2">
                        {system.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Analizar con AI">
                          <IconButton 
                            size="small" 
                            onClick={() => askAIAboutSystem(system)}
                            color="primary"
                          >
                            <SmartToy />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ver logs">
                          <IconButton 
                            size="small" 
                            onClick={() => loadSystemLogs(system.id)}
                          >
                            <BugReport />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Chip 
                        label={health ? health.overall : 'unknown'} 
                        color={getHealthColor(health?.overall)}
                        icon={getHealthIcon(health?.overall)}
                        size="small"
                      />
                    </Box>

                    {health && health.checks && (
                      <List dense>
                        {health.checks.slice(0, 3).map((check, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              {getHealthIcon(check.status)}
                            </ListItemIcon>
                            <ListItemText
                              primary={check.name}
                              secondary={check.message}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}

                    <Box sx={{ mt: 2 }}>
                      <Button
                        size="small"
                        startIcon={<Analytics />}
                        onClick={() => runAIAnalysis(system.id)}
                      >
                        Análisis Profundo
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </TabPanel>

      {/* Tab 2: Métricas de Rendimiento */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Rendimiento del Sistema
                </Typography>
                <Box sx={{ height: 400 }}>
                  <Line data={performanceData} options={chartOptions} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Speed color="primary" sx={{ mr: 1 }} />
                      <Typography variant="h6">CPU</Typography>
                    </Box>
                    <Typography variant="h4" color="primary.main">45%</Typography>
                    <LinearProgress value={45} variant="determinate" sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Memory color="secondary" sx={{ mr: 1 }} />
                      <Typography variant="h6">Memoria</Typography>
                    </Box>
                    <Typography variant="h4" color="secondary.main">62%</Typography>
                    <LinearProgress value={62} variant="determinate" color="secondary" sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Storage color="success" sx={{ mr: 1 }} />
                      <Typography variant="h6">Disco</Typography>
                    </Box>
                    <Typography variant="h4" color="success.main">28%</Typography>
                    <LinearProgress value={28} variant="determinate" color="success" sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 3: Logs y Eventos */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {systems.map((system) => (
            <Grid item xs={12} md={6} key={system.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      {system.name}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => loadSystemLogs(system.id)}
                    >
                      Ver Logs
                    </Button>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Última actividad: {new Date().toLocaleString()}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip label="0 errores" size="small" color="success" sx={{ mr: 1 }} />
                    <Chip label="3 warnings" size="small" color="warning" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Tab 4: Análisis AI */}
      <TabPanel value={tabValue} index={3}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1">
            <strong>🤖 Análisis Inteligente:</strong> El asistente AI puede analizar 
            automáticamente tus sistemas y proporcionar recomendaciones personalizadas.
          </Typography>
        </Alert>
        
        <Grid container spacing={3}>
          {systems.map((system) => (
            <Grid item xs={12} md={6} key={system.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {system.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Última análisis: Hace 2 horas
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<SmartToy />}
                      onClick={() => runAIAnalysis(system.id)}
                    >
                      Análisis Completo
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<BugReport />}
                      onClick={() => askAIAboutSystem(system)}
                    >
                      Debugging
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Dialog de logs */}
      <Dialog 
        open={logsDialog} 
        onClose={() => setLogsDialog(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          Logs del Sistema - {selectedSystemLogs?.systemId}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ maxHeight: 400, overflow: 'auto', fontFamily: 'monospace' }}>
            {selectedSystemLogs?.logs.map((logFile, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  📄 {logFile.file}
                </Typography>
                {logFile.lines.map((line, lineIndex) => (
                  <Typography 
                    key={lineIndex} 
                    variant="body2" 
                    sx={{ fontSize: '0.875rem', mb: 0.5 }}
                  >
                    {line}
                  </Typography>
                ))}
              </Box>
            ))}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}