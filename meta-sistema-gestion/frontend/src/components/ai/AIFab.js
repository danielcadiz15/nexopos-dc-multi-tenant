import React, { useState } from 'react';
import {
  Fab,
  Badge,
  Tooltip,
  Zoom,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  SmartToy,
  Close
} from '@mui/icons-material';
import { useAI } from '../../contexts/AIContext';
import AIChat from './AIChat';

export default function AIFab() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isOpen, toggleChat, messages } = useAI();
  
  // Contar mensajes no leídos (simplificado)
  const unreadCount = 0; // En una implementación real, podrías rastrear esto

  const handleClick = () => {
    toggleChat();
  };

  return (
    <>
      <Tooltip 
        title={isOpen ? "Cerrar Asistente AI" : "Abrir Asistente AI"}
        placement="left"
      >
        <Zoom in={true}>
          <Fab
            color="primary"
            onClick={handleClick}
            sx={{
              position: 'fixed',
              bottom: isMobile ? 16 : 24,
              right: isMobile ? 16 : 24,
              zIndex: 1000,
              background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
              '&:hover': {
                background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s ease-in-out',
              boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
            }}
          >
            <Badge 
              badgeContent={unreadCount} 
              color="error"
              invisible={unreadCount === 0}
            >
              {isOpen ? (
                <Close sx={{ fontSize: 28 }} />
              ) : (
                <SmartToy sx={{ fontSize: 28 }} />
              )}
            </Badge>
          </Fab>
        </Zoom>
      </Tooltip>

      <AIChat open={isOpen} onClose={() => toggleChat()} />
    </>
  );
}