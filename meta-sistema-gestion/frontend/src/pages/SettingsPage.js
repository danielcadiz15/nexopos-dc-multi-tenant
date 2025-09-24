import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import {
  Settings,
  Person,
  Security,
  Notifications,
  Storage,
  SmartToy,
  Delete,
  Edit,
  Add
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useAI } from '../contexts/AIContext';
import { toast } from 'react-toastify';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { clearHistory } = useAI();
  const [tabValue, setTabValue] = useState(0);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [settings, setSettings] = useState({
    notifications: true,
    autoRefresh: true,
    darkMode: false,
    aiAssistant: true,
    systemAlerts: true,
    emailNotifications: false
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleProfileUpdate = async () => {
    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    const updateData = {
      name: profileData.name,
      email: profileData.email
    };

    if (profileData.newPassword) {
      updateData.currentPassword = profileData.currentPassword;
      updateData.newPassword = profileData.newPassword;
    }

    const result = await updateProfile(updateData);
    if (result.success) {
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    }
  };

  const handleSettingChange = (setting) => (event) => {
    setSettings(prev => ({
      ...prev,
      [setting]: event.target.checked
    }));
  };

  const clearAIHistory = () => {
    clearHistory();
    toast.success('Historial de AI limpiado');
  };

  const exportData = () => {
    toast.info('Función de exportación en desarrollo');
  };

  const importData = () => {
    toast.info('Función de importación en desarrollo');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <Settings sx={{ mr: 1, verticalAlign: 'middle' }} />
          Configuración
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestiona tu perfil y preferencias del sistema
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab icon={<Person />} label="Perfil" />
          <Tab icon={<Security />} label="Seguridad" />
          <Tab icon={<Notifications />} label="Notificaciones" />
          <Tab icon={<SmartToy />} label="AI Assistant" />
          <Tab icon={<Storage />} label="Datos" />
        </Tabs>
      </Box>

      {/* Tab 1: Perfil */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información Personal
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nombre"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Usuario"
                      value={user?.username || ''}
                      disabled
                      helperText="El nombre de usuario no se puede cambiar"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  Cambiar Contraseña
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Contraseña Actual"
                      type="password"
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nueva Contraseña"
                      type="password"
                      value={profileData.newPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Confirmar Contraseña"
                      type="password"
                      value={profileData.confirmPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Button variant="contained" onClick={handleProfileUpdate}>
                    Guardar Cambios
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información de Cuenta
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Rol" secondary={user?.role || 'Usuario'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Último acceso" secondary={user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Cuenta creada" secondary={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'} />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Seguridad */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuración de Seguridad
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Autenticación de dos factores" 
                      secondary="Agrega una capa extra de seguridad"
                    />
                    <ListItemSecondaryAction>
                      <Switch disabled />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Cerrar sesión automáticamente" 
                      secondary="Después de 24 horas de inactividad"
                    />
                    <ListItemSecondaryAction>
                      <Switch defaultChecked />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Recordar dispositivo" 
                      secondary="No solicitar credenciales en este dispositivo"
                    />
                    <ListItemSecondaryAction>
                      <Switch defaultChecked />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Actividad Reciente
                </Typography>
                <Alert severity="info">
                  Historial de actividad en desarrollo
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 3: Notificaciones */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notificaciones del Sistema
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Notificaciones push" 
                      secondary="Recibir notificaciones en tiempo real"
                    />
                    <ListItemSecondaryAction>
                      <Switch 
                        checked={settings.notifications}
                        onChange={handleSettingChange('notifications')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Alertas de sistema" 
                      secondary="Notificar cuando hay errores o problemas"
                    />
                    <ListItemSecondaryAction>
                      <Switch 
                        checked={settings.systemAlerts}
                        onChange={handleSettingChange('systemAlerts')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Notificaciones por email" 
                      secondary="Enviar resúmenes por correo electrónico"
                    />
                    <ListItemSecondaryAction>
                      <Switch 
                        checked={settings.emailNotifications}
                        onChange={handleSettingChange('emailNotifications')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Preferencias de Interfaz
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Actualización automática" 
                      secondary="Refrescar datos automáticamente"
                    />
                    <ListItemSecondaryAction>
                      <Switch 
                        checked={settings.autoRefresh}
                        onChange={handleSettingChange('autoRefresh')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Modo oscuro" 
                      secondary="Usar tema oscuro (próximamente)"
                    />
                    <ListItemSecondaryAction>
                      <Switch 
                        disabled
                        checked={settings.darkMode}
                        onChange={handleSettingChange('darkMode')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 4: AI Assistant */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configuración del Asistente AI
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Habilitar Asistente AI" 
                      secondary="Mostrar el botón flotante del asistente"
                    />
                    <ListItemSecondaryAction>
                      <Switch 
                        checked={settings.aiAssistant}
                        onChange={handleSettingChange('aiAssistant')}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Sugerencias automáticas" 
                      secondary="El AI puede sugerir acciones proactivamente"
                    />
                    <ListItemSecondaryAction>
                      <Switch defaultChecked />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Análisis automático" 
                      secondary="Permitir análisis automático de sistemas"
                    />
                    <ListItemSecondaryAction>
                      <Switch defaultChecked />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" gutterBottom>
                  Acciones
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={clearAIHistory}
                  >
                    Limpiar Historial
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="small"
                    disabled
                  >
                    Entrenar AI
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Estadísticas del AI
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="Consultas realizadas" secondary="0" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Sistemas analizados" secondary="0" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Problemas detectados" secondary="0" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Sugerencias aplicadas" secondary="0" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 5: Datos */}
      <TabPanel value={tabValue} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Gestión de Datos
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="Exportar configuración" 
                      secondary="Descargar configuración del sistema"
                    />
                    <ListItemSecondaryAction>
                      <Button size="small" onClick={exportData}>
                        Exportar
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Importar configuración" 
                      secondary="Cargar configuración desde archivo"
                    />
                    <ListItemSecondaryAction>
                      <Button size="small" onClick={importData}>
                        Importar
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="Limpiar caché" 
                      secondary="Eliminar datos temporales"
                    />
                    <ListItemSecondaryAction>
                      <Button size="small">
                        Limpiar
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Almacenamiento
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Información de almacenamiento en desarrollo
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  • Configuración: ~2KB<br />
                  • Logs: ~150KB<br />
                  • Caché: ~1MB<br />
                  • Total: ~1.2MB
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}