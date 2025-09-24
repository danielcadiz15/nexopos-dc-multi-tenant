import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Collapse,
  Badge
} from '@mui/material';
import {
  Dashboard,
  Computer,
  Code,
  CloudUpload,
  Visibility,
  Settings,
  Template,
  ExpandLess,
  ExpandMore,
  FiberManualRecord
} from '@mui/icons-material';
import { useSystem } from '../../contexts/SystemContext';

const drawerWidth = 280;

export default function Sidebar({ open, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { systems } = useSystem();
  const [systemsOpen, setSystemsOpen] = React.useState(false);

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/',
    },
    {
      text: 'Sistemas',
      icon: <Computer />,
      path: '/systems',
      hasSubmenu: true,
    },
    {
      text: 'Editor de Código',
      icon: <Code />,
      path: '/code',
    },
    {
      text: 'Despliegues',
      icon: <CloudUpload />,
      path: '/deployment',
    },
    {
      text: 'Monitoreo',
      icon: <Visibility />,
      path: '/monitoring',
    },
    {
      text: 'Plantillas',
      icon: <Template />,
      path: '/templates',
    },
    {
      text: 'Configuración',
      icon: <Settings />,
      path: '/settings',
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleSystemsToggle = () => {
    setSystemsOpen(!systemsOpen);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
      case 'ready':
        return 'success';
      case 'error':
        return 'error';
      case 'maintenance':
      case 'needs_setup':
        return 'warning';
      default:
        return 'default';
    }
  };

  const drawer = (
    <Box sx={{ overflow: 'auto', height: '100%' }}>
      {/* Logo/Título */}
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
          Meta Sistema
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Gestión Centralizada
        </Typography>
      </Box>
      
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      {/* Menú principal */}
      <List sx={{ pt: 1 }}>
        {menuItems.map((item) => (
          <React.Fragment key={item.text}>
            <ListItem disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => {
                  if (item.hasSubmenu) {
                    handleSystemsToggle();
                  } else {
                    handleNavigation(item.path);
                  }
                }}
                sx={{
                  color: 'white',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.12)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.04)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                  }}
                />
                {item.hasSubmenu && (
                  systemsOpen ? <ExpandLess /> : <ExpandMore />
                )}
              </ListItemButton>
            </ListItem>
            
            {/* Submenu de sistemas */}
            {item.hasSubmenu && (
              <Collapse in={systemsOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {systems.length === 0 ? (
                    <ListItem sx={{ pl: 4 }}>
                      <ListItemText
                        primary="No hay sistemas"
                        primaryTypographyProps={{
                          fontSize: '0.75rem',
                          color: 'rgba(255,255,255,0.5)',
                        }}
                      />
                    </ListItem>
                  ) : (
                    systems.map((system) => (
                      <ListItem key={system.id} disablePadding>
                        <ListItemButton
                          sx={{
                            pl: 4,
                            color: 'white',
                            '&:hover': {
                              backgroundColor: 'rgba(255,255,255,0.04)',
                            },
                          }}
                          onClick={() => handleNavigation(`/code/${system.id}`)}
                        >
                          <ListItemIcon sx={{ color: 'white', minWidth: 30 }}>
                            <Badge
                              variant="dot"
                              color={getStatusColor(system.status)}
                              sx={{
                                '& .MuiBadge-badge': {
                                  top: 6,
                                  right: 6,
                                },
                              }}
                            >
                              <FiberManualRecord sx={{ fontSize: 8 }} />
                            </Badge>
                          </ListItemIcon>
                          <ListItemText
                            primary={system.name}
                            secondary={system.type}
                            primaryTypographyProps={{
                              fontSize: '0.75rem',
                              noWrap: true,
                            }}
                            secondaryTypographyProps={{
                              fontSize: '0.6rem',
                              color: 'rgba(255,255,255,0.5)',
                              noWrap: true,
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))
                  )}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        ))}
      </List>

      {/* Información del sistema */}
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mb: 2 }} />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Sistemas registrados: {systems.length}
        </Typography>
        <br />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          Activos: {systems.filter(s => s.status === 'active').length}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ 
        width: { sm: open ? drawerWidth : 64 }, 
        flexShrink: { sm: 0 },
        transition: 'width 0.3s',
      }}
    >
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: open ? drawerWidth : 64,
            transition: 'width 0.3s',
            overflowX: 'hidden',
            backgroundColor: '#1e293b',
            borderRight: 'none',
          },
        }}
        open={open}
      >
        {open ? drawer : (
          <Box sx={{ overflow: 'auto', height: '100%' }}>
            <Box sx={{ p: 1, textAlign: 'center' }}>
              <Typography variant="h6" sx={{ color: 'white', fontSize: '1rem' }}>
                MS
              </Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
            <List sx={{ pt: 1 }}>
              {menuItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    selected={location.pathname === item.path}
                    onClick={() => handleNavigation(item.path)}
                    sx={{
                      color: 'white',
                      justifyContent: 'center',
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255,255,255,0.08)',
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.04)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'white', minWidth: 0, justifyContent: 'center' }}>
                      {item.icon}
                    </ListItemIcon>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}