import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Template as TemplateIcon,
  Add,
  Code,
  CloudUpload,
  Computer,
  SmartToy
} from '@mui/icons-material';
import { useAI } from '../contexts/AIContext';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function TemplatesPage() {
  const { sendMessage } = useAI();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [newSystem, setNewSystem] = useState({
    template: '',
    name: '',
    projectId: '',
    path: '',
    configuration: {}
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/templates');
      if (response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      toast.error('Error cargando plantillas');
    } finally {
      setLoading(false);
    }
  };

  const createSystemFromTemplate = async () => {
    if (!newSystem.template || !newSystem.name || !newSystem.projectId) {
      toast.error('Completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`/api/templates/${newSystem.template}/create`, {
        name: newSystem.name,
        projectId: newSystem.projectId,
        path: newSystem.path || `./new-systems/${newSystem.projectId}`,
        configuration: newSystem.configuration
      });

      if (response.data.success) {
        toast.success('Sistema creado exitosamente');
        setCreateDialog(false);
        resetForm();
      }
    } catch (error) {
      toast.error(`Error creando sistema: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewSystem({
      template: '',
      name: '',
      projectId: '',
      path: '',
      configuration: {}
    });
    setActiveStep(0);
  };

  const askAIAboutTemplate = (template) => {
    const query = `Explícame más sobre la plantilla "${template.name}". 
                   ¿Cuándo debería usarla y qué ventajas tiene? 
                   Tecnologías: ${template.technologies?.join(', ')}`;
    sendMessage(query);
  };

  const getTemplateIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'frontend':
        return <Code color="primary" />;
      case 'backend':
        return <Computer color="secondary" />;
      case 'full stack':
        return <CloudUpload color="success" />;
      default:
        return <TemplateIcon />;
    }
  };

  const getComplexityColor = (complexity) => {
    switch (complexity?.toLowerCase()) {
      case 'básico':
        return 'success';
      case 'intermedio':
        return 'warning';
      case 'avanzado':
        return 'error';
      default:
        return 'default';
    }
  };

  const steps = [
    'Seleccionar Plantilla',
    'Configuración Básica',
    'Configuración Avanzada',
    'Crear Sistema'
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            <TemplateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Plantillas de Sistemas
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Crea nuevos sistemas usando plantillas predefinidas
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialog(true)}
        >
          Crear Sistema
        </Button>
      </Box>

      {/* Estadísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {templates.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Plantillas Disponibles
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {templates.filter(t => t.available).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Listas para Usar
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sistemas Creados Hoy
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Lista de plantillas */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} md={6} lg={4} key={template.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: template.available ? 1 : 0.6
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getTemplateIcon(template.category)}
                      <Typography variant="h6" component="h2">
                        {template.name}
                      </Typography>
                    </Box>
                    <Tooltip title="Consultar AI sobre esta plantilla">
                      <IconButton 
                        size="small" 
                        onClick={() => askAIAboutTemplate(template)}
                        color="primary"
                      >
                        <SmartToy />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {template.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label={template.category} 
                      size="small" 
                      sx={{ mr: 1, mb: 1 }}
                    />
                    <Chip 
                      label={template.complexity} 
                      size="small" 
                      color={getComplexityColor(template.complexity)}
                      sx={{ mr: 1, mb: 1 }}
                    />
                    {!template.available && (
                      <Chip 
                        label="No disponible" 
                        size="small" 
                        color="error"
                        sx={{ mb: 1 }}
                      />
                    )}
                  </Box>

                  {template.technologies && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Tecnologías:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {template.technologies.map((tech) => (
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

                  {template.features && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Características:
                      </Typography>
                      <Typography variant="body2">
                        • {template.features.join(' • ')}
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    ⏱️ Tiempo estimado: {template.estimatedTime || '30 minutos'}
                  </Typography>
                </CardContent>

                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => {
                      setNewSystem(prev => ({ ...prev, template: template.id }));
                      setCreateDialog(true);
                    }}
                    disabled={!template.available}
                  >
                    Usar Plantilla
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog de creación */}
      <Dialog 
        open={createDialog} 
        onClose={() => setCreateDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Crear Nuevo Sistema
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
                <StepContent>
                  {index === 0 && (
                    <Box sx={{ mt: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Seleccionar Plantilla</InputLabel>
                        <Select
                          value={newSystem.template}
                          onChange={(e) => setNewSystem(prev => ({ ...prev, template: e.target.value }))}
                          label="Seleccionar Plantilla"
                        >
                          {templates.filter(t => t.available).map((template) => (
                            <MenuItem key={template.id} value={template.id}>
                              {template.name} - {template.category}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {index === 1 && (
                    <Box sx={{ mt: 2 }}>
                      <TextField
                        fullWidth
                        label="Nombre del Sistema"
                        value={newSystem.name}
                        onChange={(e) => setNewSystem(prev => ({ ...prev, name: e.target.value }))}
                        sx={{ mb: 2 }}
                        required
                      />
                      <TextField
                        fullWidth
                        label="ID del Proyecto"
                        value={newSystem.projectId}
                        onChange={(e) => setNewSystem(prev => ({ ...prev, projectId: e.target.value }))}
                        sx={{ mb: 2 }}
                        required
                        helperText="Usado para Firebase y directorios"
                      />
                      <TextField
                        fullWidth
                        label="Ruta de Destino"
                        value={newSystem.path}
                        onChange={(e) => setNewSystem(prev => ({ ...prev, path: e.target.value }))}
                        placeholder={`./new-systems/${newSystem.projectId}`}
                        helperText="Deja vacío para usar la ruta por defecto"
                      />
                    </Box>
                  )}

                  {index === 2 && (
                    <Box sx={{ mt: 2 }}>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Configuración adicional será implementada según la plantilla seleccionada.
                      </Alert>
                    </Box>
                  )}

                  {index === 3 && (
                    <Box sx={{ mt: 2 }}>
                      <Alert severity="success" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <strong>Resumen:</strong><br />
                          • Plantilla: {templates.find(t => t.id === newSystem.template)?.name}<br />
                          • Nombre: {newSystem.name}<br />
                          • ID: {newSystem.projectId}<br />
                          • Ruta: {newSystem.path || `./new-systems/${newSystem.projectId}`}
                        </Typography>
                      </Alert>
                    </Box>
                  )}

                  <Box sx={{ mb: 1, mt: 2 }}>
                    <div>
                      <Button
                        variant="contained"
                        onClick={() => {
                          if (index === steps.length - 1) {
                            createSystemFromTemplate();
                          } else {
                            setActiveStep((prevActiveStep) => prevActiveStep + 1);
                          }
                        }}
                        sx={{ mt: 1, mr: 1 }}
                        disabled={loading}
                      >
                        {index === steps.length - 1 ? 'Crear Sistema' : 'Continuar'}
                      </Button>
                      <Button
                        disabled={index === 0}
                        onClick={() => setActiveStep((prevActiveStep) => prevActiveStep - 1)}
                        sx={{ mt: 1, mr: 1 }}
                      >
                        Atrás
                      </Button>
                    </div>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Creando sistema...</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateDialog(false); resetForm(); }}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Información adicional */}
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>💡 Consejo:</strong> Usa el asistente AI para obtener recomendaciones 
            sobre qué plantilla usar según tus necesidades específicas.
          </Typography>
        </Alert>
      </Box>
    </Box>
  );
}