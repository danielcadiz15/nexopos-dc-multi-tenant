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
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CloudUpload,
  Build,
  CheckCircle,
  Error,
  PlayArrow,
  Pause,
  Refresh,
  History,
  SmartToy
} from '@mui/icons-material';
import { useSystem } from '../contexts/SystemContext';
import { useAI } from '../contexts/AIContext';
import { toast } from 'react-toastify';

export default function DeploymentPage() {
  const { systems, buildSystem, deploySystem } = useSystem();
  const { sendMessage } = useAI();
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [deployDialog, setDeployDialog] = useState(false);
  const [deployConfig, setDeployConfig] = useState({
    environment: 'production',
    buildFirst: true
  });
  const [deploymentStatus, setDeploymentStatus] = useState({});

  useEffect(() => {
    // Cargar estado de despliegues
    loadDeploymentStatus();
  }, []);

  const loadDeploymentStatus = async () => {
    // En una implementación real, cargarías el estado desde la API
    const status = {};
    systems.forEach(system => {
      status[system.id] = {
        lastDeploy: null,
        status: 'idle',
        environment: 'none',
        buildStatus: 'idle'
      };
    });
    setDeploymentStatus(status);
  };

  const handleBuild = async (systemId) => {
    const success = await buildSystem(systemId);
    if (success) {
      setDeploymentStatus(prev => ({
        ...prev,
        [systemId]: { ...prev[systemId], buildStatus: 'building' }
      }));
    }
  };

  const handleDeploy = async () => {
    if (!selectedSystem) return;
    
    const success = await deploySystem(
      selectedSystem.id,
      deployConfig.environment,
      deployConfig.buildFirst
    );
    
    if (success) {
      setDeploymentStatus(prev => ({
        ...prev,
        [selectedSystem.id]: {
          ...prev[selectedSystem.id],
          status: 'deploying',
          environment: deployConfig.environment,
          lastDeploy: new Date().toISOString()
        }
      }));
      setDeployDialog(false);
      setSelectedSystem(null);
    }
  };

  const openDeployDialog = (system) => {
    setSelectedSystem(system);
    setDeployDialog(true);
  };

  const askAIAboutDeployment = (system) => {
    const query = `¿Cómo puedo optimizar el proceso de despliegue para el sistema ${system.name}? 
                   Tipo: ${system.type}, Tecnologías: ${system.technologies?.join(', ')}`;
    sendMessage(query);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'deploying':
      case 'building':
        return 'warning';
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'deploying':
      case 'building':
        return <LinearProgress sx={{ width: 20 }} />;
      case 'success':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      default:
        return <Pause color="disabled" />;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <CloudUpload sx={{ mr: 1, verticalAlign: 'middle' }} />
            Gestión de Despliegues
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Controla builds y despliegues de todos tus sistemas
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadDeploymentStatus}
        >
          Actualizar Estado
        </Button>
      </Box>

      {/* Resumen de estado */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {systems.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Sistemas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {Object.values(deploymentStatus).filter(s => s.status === 'success').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Desplegados
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {Object.values(deploymentStatus).filter(s => s.status === 'deploying').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                En Progreso
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {Object.values(deploymentStatus).filter(s => s.status === 'failed').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Con Errores
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Lista de sistemas */}
      <Grid container spacing={3}>
        {systems.map((system) => {
          const status = deploymentStatus[system.id] || {};
          
          return (
            <Grid item xs={12} md={6} lg={4} key={system.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2">
                      {system.name}
                    </Typography>
                    <Tooltip title="Consultar AI sobre despliegue">
                      <IconButton 
                        size="small" 
                        onClick={() => askAIAboutDeployment(system)}
                        color="primary"
                      >
                        <SmartToy />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label={system.type} 
                      size="small" 
                      sx={{ mr: 1 }}
                    />
                    <Chip 
                      label={status.environment || 'No desplegado'} 
                      size="small" 
                      color={getStatusColor(status.status)}
                    />
                  </Box>

                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        {getStatusIcon(status.buildStatus)}
                      </ListItemIcon>
                      <ListItemText
                        primary="Estado de Build"
                        secondary={status.buildStatus === 'building' ? 'Construyendo...' : 'Listo para build'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        {getStatusIcon(status.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary="Estado de Despliegue"
                        secondary={status.lastDeploy ? 
                          `Último: ${new Date(status.lastDeploy).toLocaleString()}` : 
                          'Nunca desplegado'
                        }
                      />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Build />}
                      onClick={() => handleBuild(system.id)}
                      disabled={status.buildStatus === 'building'}
                    >
                      Build
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CloudUpload />}
                      onClick={() => openDeployDialog(system)}
                      disabled={status.status === 'deploying'}
                    >
                      Deploy
                    </Button>
                    <IconButton size="small" title="Historial">
                      <History />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Dialog de configuración de despliegue */}
      <Dialog open={deployDialog} onClose={() => setDeployDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Configurar Despliegue - {selectedSystem?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Entorno de Despliegue</InputLabel>
              <Select
                value={deployConfig.environment}
                onChange={(e) => setDeployConfig(prev => ({ ...prev, environment: e.target.value }))}
                label="Entorno de Despliegue"
              >
                <MenuItem value="development">Desarrollo</MenuItem>
                <MenuItem value="staging">Staging</MenuItem>
                <MenuItem value="production">Producción</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Construir antes del despliegue</InputLabel>
              <Select
                value={deployConfig.buildFirst}
                onChange={(e) => setDeployConfig(prev => ({ ...prev, buildFirst: e.target.value }))}
                label="Construir antes del despliegue"
              >
                <MenuItem value={true}>Sí, hacer build primero</MenuItem>
                <MenuItem value={false}>No, usar build existente</MenuItem>
              </Select>
            </FormControl>

            {selectedSystem && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Sistema:</strong> {selectedSystem.name}<br />
                  <strong>Tipo:</strong> {selectedSystem.type}<br />
                  <strong>Tecnologías:</strong> {selectedSystem.technologies?.join(', ') || 'N/A'}
                </Typography>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeployDialog(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={handleDeploy}
            startIcon={<CloudUpload />}
          >
            Desplegar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Información adicional */}
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>💡 Consejo:</strong> Usa el asistente AI para obtener recomendaciones 
            específicas sobre optimización de despliegues para cada sistema.
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
}