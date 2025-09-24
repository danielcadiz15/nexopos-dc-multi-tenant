import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Alert,
  LinearProgress,
  Fab,
  Tooltip
} from '@mui/material';
import AddSystemDialog from '../components/systems/AddSystemDialog';
import {
  MoreVert,
  Refresh,
  Add,
  Computer,
  Code,
  Visibility,
  CloudUpload,
  Settings,
  Delete,
  Edit,
  PlayArrow,
  Pause,
  Error,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import { useSystem } from '../contexts/SystemContext';
import { toast } from 'react-toastify';

export default function SystemsPage() {
  const { systems, loading, loadSystems, refreshSystem, updateSystemStatus, removeSystem } = useSystem();
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [addSystemDialog, setAddSystemDialog] = useState(false);

  useEffect(() => {
    loadSystems();
  }, []);

  const handleMenuClick = (event, system) => {
    setAnchorEl(event.currentTarget);
    setSelectedSystem(system);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSystem(null);
  };

  const handleStatusChange = async (systemId, newStatus) => {
    const success = await updateSystemStatus(systemId, newStatus);
    if (success) {
      handleMenuClose();
    }
  };

  const handleDelete = async () => {
    if (selectedSystem) {
      const success = await removeSystem(selectedSystem.id);
      if (success) {
        setDialogOpen(false);
        handleMenuClose();
      }
    }
  };

  const openDialog = (type) => {
    setDialogType(type);
    setDialogOpen(true);
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

  if (loading) {
    return (
      <Box>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Cargando sistemas...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <Computer sx={{ mr: 1, verticalAlign: 'middle' }} />
            Gestión de Sistemas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Administra todos tus sistemas desde un solo lugar
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddSystemDialog(true)}
          >
            Agregar Sistema
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadSystems}
          >
            Actualizar
          </Button>
        </Box>
      </Box>

      {/* Estadísticas rápidas */}
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
                {systems.filter(s => s.status === 'active' || s.status === 'ready').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Activos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {systems.filter(s => s.status === 'error').length}
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
                {systems.filter(s => s.status === 'needs_setup').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Requieren Setup
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Lista de sistemas */}
      {systems.length === 0 ? (
        <Alert severity="info">
          No hay sistemas registrados. Los sistemas se detectarán automáticamente cuando estén disponibles.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {systems.map((system) => (
            <Grid item xs={12} md={6} lg={4} key={system.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Header de la tarjeta */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(system.status)}
                      <Typography variant="h6" component="h2" noWrap>
                        {system.name}
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small"
                      onClick={(e) => handleMenuClick(e, system)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  {/* Estado */}
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label={system.status} 
                      size="small" 
                      color={getStatusColor(system.status)}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Tipo: {system.type}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Versión: {system.version || 'N/A'}
                    </Typography>
                  </Box>

                  {/* Tecnologías */}
                  {system.technologies && system.technologies.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Tecnologías:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {system.technologies.map((tech) => (
                          <Chip 
                            key={tech} 
                            label={tech} 
                            size="small" 
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Información adicional */}
                  <Typography variant="caption" color="text.secondary" display="block">
                    Última verificación: {
                      system.lastChecked ? 
                      new Date(system.lastChecked).toLocaleString() : 
                      'Nunca'
                    }
                  </Typography>
                  
                  {system.path && (
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      display="block"
                      sx={{ 
                        wordBreak: 'break-all',
                        mt: 0.5 
                      }}
                    >
                      Ruta: {system.path}
                    </Typography>
                  )}
                </CardContent>

                {/* Acciones */}
                <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                  <Tooltip title="Editor de código">
                    <IconButton 
                      size="small" 
                      href={`/code/${system.id}`}
                      color="primary"
                    >
                      <Code />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Monitoreo">
                    <IconButton 
                      size="small" 
                      href="/monitoring"
                      color="info"
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Despliegue">
                    <IconButton 
                      size="small" 
                      href="/deployment"
                      color="secondary"
                    >
                      <CloudUpload />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Actualizar">
                    <IconButton 
                      size="small" 
                      onClick={() => refreshSystem(system.id)}
                      color="success"
                    >
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* FAB para agregar sistema */}
      <Fab
        color="primary"
        aria-label="agregar sistema"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        href="/templates"
      >
        <Add />
      </Fab>

      {/* Menú contextual */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => refreshSystem(selectedSystem?.id)}>
          <Refresh sx={{ mr: 1 }} /> Actualizar
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange(selectedSystem?.id, 'active')}>
          <PlayArrow sx={{ mr: 1 }} /> Activar
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange(selectedSystem?.id, 'maintenance')}>
          <Pause sx={{ mr: 1 }} /> Mantenimiento
        </MenuItem>
        <MenuItem onClick={() => openDialog('edit')}>
          <Edit sx={{ mr: 1 }} /> Editar
        </MenuItem>
        <MenuItem onClick={() => openDialog('delete')} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} /> Eliminar
        </MenuItem>
      </Menu>

      {/* Dialog de confirmación */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        {dialogType === 'delete' && (
          <>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogContent>
              <Typography>
                ¿Estás seguro de que quieres eliminar el sistema "{selectedSystem?.name}" del registro?
              </Typography>
              <Alert severity="warning" sx={{ mt: 2 }}>
                Esta acción solo eliminará el sistema del registro, no afectará los archivos del sistema.
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleDelete} color="error" variant="contained">
                Eliminar
              </Button>
            </DialogActions>
          </>
        )}
        
        {dialogType === 'edit' && (
          <>
            <DialogTitle>Editar Sistema</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Nombre"
                fullWidth
                variant="outlined"
                defaultValue={selectedSystem?.name}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Estado</InputLabel>
                <Select defaultValue={selectedSystem?.status}>
                  <MenuItem value="active">Activo</MenuItem>
                  <MenuItem value="inactive">Inactivo</MenuItem>
                  <MenuItem value="maintenance">Mantenimiento</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button variant="contained">Guardar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog para agregar sistema manualmente */}
      <AddSystemDialog
        open={addSystemDialog}
        onClose={() => setAddSystemDialog(false)}
        onSystemAdded={(newSystem) => {
          toast.success(`Sistema "${newSystem.name}" agregado exitosamente`);
          loadSystems(); // Recargar lista de sistemas
        }}
      />
    </Box>
  );
}