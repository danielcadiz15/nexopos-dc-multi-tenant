import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Chip,
  IconButton,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  Close,
  Send,
  SmartToy,
  Person,
  ExpandMore,
  Lightbulb,
  Code,
  Computer,
  CloudUpload,
  Visibility,
  Clear,
  ContentCopy,
  ThumbUp,
  ThumbDown
} from '@mui/icons-material';
import { useAI } from '../../contexts/AIContext';

export default function AIChat({ open, onClose }) {
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearHistory, 
    getQuickSuggestions, 
    formatMessage,
    suggestions 
  } = useAI();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll al final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus en input cuando se abre
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = async () => {
    if (input.trim() && !isLoading) {
      await sendMessage(input);
      setInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'user':
        return <Person />;
      case 'ai':
        return <SmartToy color="primary" />;
      case 'action':
        return <CloudUpload color="success" />;
      case 'analysis':
        return <Visibility color="info" />;
      default:
        return <SmartToy />;
    }
  };

  const getMessageColor = (type) => {
    switch (type) {
      case 'user':
        return 'primary.main';
      case 'ai':
        return 'secondary.main';
      case 'action':
        return 'success.main';
      case 'analysis':
        return 'info.main';
      default:
        return 'grey.500';
    }
  };

  const renderMessage = (message) => {
    const isUser = message.type === 'user';
    
    return (
      <Box
        key={message.id}
        sx={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          mb: 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
            maxWidth: '80%'
          }}
        >
          <Avatar
            sx={{
              bgcolor: getMessageColor(message.type),
              width: 32,
              height: 32,
              mx: 1
            }}
          >
            {getMessageIcon(message.type)}
          </Avatar>
          
          <Paper
            elevation={1}
            sx={{
              p: 2,
              bgcolor: isUser ? 'primary.50' : 'grey.50',
              borderRadius: 2,
              position: 'relative'
            }}
          >
            <Typography
              variant="body1"
              sx={{ mb: 1 }}
              dangerouslySetInnerHTML={{
                __html: formatMessage(message.content)
              }}
            />
            
            {/* Timestamp */}
            <Typography variant="caption" color="text.secondary">
              {new Date(message.timestamp).toLocaleTimeString()}
            </Typography>
            
            {/* Sugerencias */}
            {message.suggestions && message.suggestions.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Sugerencias:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {message.suggestions.map((suggestion, index) => (
                    <Chip
                      key={index}
                      label={suggestion}
                      size="small"
                      onClick={() => handleSuggestionClick(suggestion)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            {/* Análisis expandible */}
            {message.analysis && (
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2">
                    Ver análisis detallado
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      <strong>Sistema:</strong> {message.analysis.summary.name}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Puntuación de salud:</strong> {message.analysis.health.score}/100
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Archivos:</strong> {message.analysis.structure.totalFiles}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Directorios:</strong> {message.analysis.structure.directories}
                    </Typography>
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
            
            {/* Acciones del mensaje */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
              <Tooltip title="Copiar">
                <IconButton 
                  size="small" 
                  onClick={() => copyToClipboard(message.content)}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
              {!isUser && (
                <>
                  <Tooltip title="Útil">
                    <IconButton size="small">
                      <ThumbUp fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="No útil">
                    <IconButton size="small">
                      <ThumbDown fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh', display: 'flex', flexDirection: 'column' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SmartToy color="primary" />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Asistente AI - Meta Sistema
        </Typography>
        <Tooltip title="Limpiar historial">
          <IconButton onClick={clearHistory}>
            <Clear />
          </IconButton>
        </Tooltip>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SmartToy sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              ¡Hola! Soy tu Asistente AI
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Puedo ayudarte a gestionar y analizar todos tus sistemas. 
              Pregúntame sobre estado, código, despliegues o cualquier cosa.
            </Typography>
            
            {/* Sugerencias rápidas */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                <Lightbulb sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                Sugerencias rápidas:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {getQuickSuggestions().slice(0, 6).map((suggestion, index) => (
                  <Chip
                    key={index}
                    label={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>

            {/* Capacidades */}
            <Box sx={{ textAlign: 'left', maxWidth: 400, mx: 'auto' }}>
              <Typography variant="subtitle2" gutterBottom>
                Mis capacidades:
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><Computer color="primary" /></ListItemIcon>
                  <ListItemText primary="Gestión de sistemas" secondary="Estado, configuración, análisis" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Code color="primary" /></ListItemIcon>
                  <ListItemText primary="Análisis de código" secondary="Búsqueda, edición, revisión" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CloudUpload color="primary" /></ListItemIcon>
                  <ListItemText primary="Despliegues" secondary="Build, deploy, monitoreo" />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Visibility color="primary" /></ListItemIcon>
                  <ListItemText primary="Monitoreo" secondary="Logs, métricas, debugging" />
                </ListItem>
              </List>
            </Box>
          </Box>
        ) : (
          <Box>
            {messages.map(renderMessage)}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Procesando...
                </Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', width: '100%', gap: 1 }}>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={3}
            placeholder="Escribe tu consulta aquí... (Ej: '¿Cuál es el estado del sistema Zeus?')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            <Send />
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}