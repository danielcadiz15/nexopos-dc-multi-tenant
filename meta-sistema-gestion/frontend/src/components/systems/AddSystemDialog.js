import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Alert,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper
} from '@mui/material';
import {
  FolderOpen,
  Computer,
  CloudUpload,
  Code,
  Storage,
  Refresh,
  Check,
  Warning,
  SmartToy
} from '@mui/icons-material';
import { useAI } from '../../contexts/AIContext';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function AddSystemDialog({ open, onClose, onSystemAdded }) {
  const { sendMessage } = useAI();
  const [activeStep, setActiveStep] = useState(0);
  const [systemData, setSystemData] = useState({
    id: '',
    name: '',
    path: '',
    type: '',
    description: '',
    technologies: [],
    firebaseProject: '',
    environment: 'development'
  });
  const [pathValidation, setPathValidation] = useState(null);
  const [detectedInfo, setDetectedInfo] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const systemTypes = [
    { value: 'react-firebase', label: 'React + Firebase', icon: <CloudUpload /> },
    { value: 'react', label: 'React Application', icon: <Code /> },
    { value: 'node-express', label: 'Node.js + Express', icon: <Computer /> },
    { value: 'full-stack', label: 'Full Stack Application', icon: <Storage /> },
    { value: 'other', label: 'Otro tipo', icon: <Computer /> }
  ];

  const steps = [
    'Información Básica',
    'Ubicación del Sistema',
    'Configuración Técnica',
    'Verificación'
  ];

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleInputChange = (field) => (event) => {
    setSystemData(prev => ({
      ...prev,
      [field]: event.target.value
    }));

    // Auto-generar ID basado en el nombre
    if (field === 'name' && !systemData.id) {
      const id = event.target.value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setSystemData(prev => ({ ...prev, id }));
    }
  };

  const validatePath = async () => {
    if (!systemData.path.trim()) {
      setPathValidation({ valid: false, message: 'Ruta requerida' });
      return;
    }

    setIsValidating(true);
    try {
      const response = await axios.post('/api/systems/validate-path', {
        path: systemData.path
      });

      if (response.data.success) {
        setPathValidation({ valid: true, message: 'Ruta válida' });
        setDetectedInfo(response.data.info);
        
        // Auto-completar información detectada
        if (response.data.info) {
          setSystemData(prev => ({
            ...prev,
            type: response.data.info.suggestedType || prev.type,
            technologies: response.data.info.technologies || prev.technologies,
            firebaseProject: response.data.info.firebaseProject || prev.firebaseProject
          }));
        }
      } else {
        setPathValidation({ valid: false, message: response.data.error });
      }
    } catch (error) {
      setPathValidation({ valid: false, message: 'Error validando ruta' });
    } finally {
      setIsValidating(false);
    }
  };

  const askAIForHelp = () => {
    const query = `Ayúdame a configurar un sistema llamado "${systemData.name}" ubicado en "${systemData.path}". 
                   ¿Qué tipo de sistema crees que es y qué configuración recomiendas?`;
    sendMessage(query);
  };

  const addSystem = async () => {
    try {
      const response = await axios.post('/api/systems', systemData);
      
      if (response.data.success) {
        toast.success('Sistema agregado exitosamente');
        onSystemAdded(response.data.system);
        handleClose();
      }
    } catch (error) {
      toast.error(`Error agregando sistema: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setSystemData({
      id: '',
      name: '',
      path: '',
      type: '',
      description: '',
      technologies: [],
      firebaseProject: '',
      environment: 'development'
    });
    setPathValidation(null);
    setDetectedInfo(null);
    onClose();
  };

  const openFileDialog = async () => {
    try {
      // En un entorno real, usarías la API del sistema de archivos
      const response = await axios.get('/api/systems/browse-directories');
      console.log('Directorios disponibles:', response.data);
    } catch (error) {
      toast.info('Función de explorador en desarrollo. Por ahora, ingresa la ruta manualmente.');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Computer color="primary" />
          <Typography variant="h6">Agregar Sistema Manualmente</Typography>
          <IconButton 
            size="small" 
            onClick={askAIForHelp}
            color="primary"
            title="Pregúntale al AI sobre configuración"
          >
            <SmartToy />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {/* Paso 1: Información Básica */}
          <Step>
            <StepLabel>Información Básica</StepLabel>
            <StepContent>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Nombre del Sistema"
                  value={systemData.name}
                  onChange={handleInputChange('name')}
                  sx={{ mb: 2 }}
                  placeholder="ej: Mi Sistema de Ventas"
                  required
                />
                <TextField
                  fullWidth
                  label="ID del Sistema"
                  value={systemData.id}
                  onChange={handleInputChange('id')}
                  sx={{ mb: 2 }}
                  placeholder="ej: sistema-ventas"
                  helperText="Se genera automáticamente pero puedes modificarlo"
                  required
                />
                <TextField
                  fullWidth
                  label="Descripción (Opcional)"
                  value={systemData.description}
                  onChange={handleInputChange('description')}
                  multiline
                  rows={2}
                  placeholder="Breve descripción del sistema"
                />
              </Box>
              <Box sx={{ mb: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!systemData.name || !systemData.id}
                >
                  Continuar
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Paso 2: Ubicación */}
          <Step>
            <StepLabel>Ubicación del Sistema</StepLabel>
            <StepContent>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="Ruta del Sistema"
                    value={systemData.path}
                    onChange={handleInputChange('path')}
                    placeholder="C:\mis-proyectos\sistema-ventas"
                    required
                  />
                  <Button
                    variant="outlined"
                    onClick={openFileDialog}
                    startIcon={<FolderOpen />}
                  >
                    Explorar
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={validatePath}
                    startIcon={<Refresh />}
                    disabled={isValidating}
                  >
                    {isValidating ? 'Validando...' : 'Validar'}
                  </Button>
                </Box>

                {pathValidation && (
                  <Alert 
                    severity={pathValidation.valid ? 'success' : 'error'}
                    icon={pathValidation.valid ? <Check /> : <Warning />}
                    sx={{ mb: 2 }}
                  >
                    {pathValidation.message}
                  </Alert>
                )}

                {detectedInfo && (
                  <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      📋 Información Detectada:
                    </Typography>
                    <List dense>
                      {detectedInfo.packageJson && (
                        <ListItem>
                          <ListItemIcon><Check color="success" /></ListItemIcon>
                          <ListItemText primary="package.json encontrado" />
                        </ListItem>
                      )}
                      {detectedInfo.firebaseConfig && (
                        <ListItem>
                          <ListItemIcon><Check color="success" /></ListItemIcon>
                          <ListItemText primary="Configuración Firebase encontrada" />
                        </ListItem>
                      )}
                      {detectedInfo.technologies && detectedInfo.technologies.length > 0 && (
                        <ListItem>
                          <ListItemIcon><Check color="success" /></ListItemIcon>
                          <ListItemText 
                            primary="Tecnologías detectadas:"
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                {detectedInfo.technologies.map(tech => (
                                  <Chip key={tech} label={tech} size="small" sx={{ mr: 0.5 }} />
                                ))}
                              </Box>
                            }
                          />
                        </ListItem>
                      )}
                    </List>
                  </Paper>
                )}
              </Box>
              <Box sx={{ mb: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!pathValidation?.valid}
                  sx={{ mr: 1 }}
                >
                  Continuar
                </Button>
                <Button onClick={handleBack}>
                  Atrás
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Paso 3: Configuración Técnica */}
          <Step>
            <StepLabel>Configuración Técnica</StepLabel>
            <StepContent>
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Tipo de Sistema</InputLabel>
                  <Select
                    value={systemData.type}
                    onChange={handleInputChange('type')}
                    label="Tipo de Sistema"
                  >
                    {systemTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {type.icon}
                          {type.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="ID Proyecto Firebase (Opcional)"
                  value={systemData.firebaseProject}
                  onChange={handleInputChange('firebaseProject')}
                  sx={{ mb: 2 }}
                  placeholder="mi-proyecto-firebase"
                  helperText="Solo si el sistema usa Firebase"
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Entorno Principal</InputLabel>
                  <Select
                    value={systemData.environment}
                    onChange={handleInputChange('environment')}
                    label="Entorno Principal"
                  >
                    <MenuItem value="development">Desarrollo</MenuItem>
                    <MenuItem value="staging">Staging</MenuItem>
                    <MenuItem value="production">Producción</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!systemData.type}
                  sx={{ mr: 1 }}
                >
                  Continuar
                </Button>
                <Button onClick={handleBack}>
                  Atrás
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Paso 4: Verificación */}
          <Step>
            <StepLabel>Verificación</StepLabel>
            <StepContent>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle1" gutterBottom>
                  📋 Resumen del Sistema:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Nombre" secondary={systemData.name} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="ID" secondary={systemData.id} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Tipo" secondary={systemTypes.find(t => t.value === systemData.type)?.label} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Ruta" secondary={systemData.path} />
                  </ListItem>
                  {systemData.firebaseProject && (
                    <ListItem>
                      <ListItemText primary="Firebase" secondary={systemData.firebaseProject} />
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemText primary="Entorno" secondary={systemData.environment} />
                  </ListItem>
                </List>
              </Paper>
              <Alert severity="info" sx={{ mb: 2 }}>
                Una vez agregado, el sistema aparecerá en el dashboard y podrás gestionarlo 
                junto con los demás sistemas.
              </Alert>
              <Box sx={{ mb: 1 }}>
                <Button
                  variant="contained"
                  onClick={addSystem}
                  sx={{ mr: 1 }}
                >
                  Agregar Sistema
                </Button>
                <Button onClick={handleBack}>
                  Atrás
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
}