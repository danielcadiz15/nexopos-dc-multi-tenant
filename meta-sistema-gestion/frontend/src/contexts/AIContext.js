import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';

const AIContext = createContext();

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI debe usarse dentro de AIProvider');
  }
  return context;
}

export function AIProvider({ children }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [capabilities, setCapabilities] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sessionId] = useState(() => 'session_' + Date.now());

  // Cargar capacidades al inicializar
  useEffect(() => {
    if (user) {
      loadCapabilities();
      loadSuggestions();
      loadHistory();
    }
  }, [user]);

  const loadCapabilities = async () => {
    try {
      const response = await axios.get('/api/ai/capabilities');
      if (response.data.success) {
        setCapabilities(response.data.capabilities);
      }
    } catch (error) {
      console.error('Error cargando capacidades del AI:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await axios.get('/api/ai/suggestions');
      if (response.data.success) {
        setSuggestions(response.data.suggestions);
      }
    } catch (error) {
      console.error('Error cargando sugerencias:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await axios.get('/api/ai/history?limit=5');
      if (response.data.success) {
        const historyMessages = response.data.history.map(item => [
          {
            id: `user_${item.id}`,
            type: 'user',
            content: item.query,
            timestamp: item.timestamp
          },
          {
            id: `ai_${item.id}`,
            type: 'ai',
            content: item.response,
            timestamp: item.timestamp,
            suggestions: item.suggestions,
            actions: item.actions
          }
        ]).flat();
        
        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    }
  };

  const sendMessage = async (query) => {
    if (!query.trim()) return;

    const userMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await axios.post('/api/ai/chat', {
        query,
        sessionId
      });

      if (response.data.success) {
        const aiResponse = response.data.response;
        
        const aiMessage = {
          id: `ai_${aiResponse.id}`,
          type: 'ai',
          content: aiResponse.response,
          timestamp: aiResponse.timestamp,
          suggestions: aiResponse.suggestions,
          actions: aiResponse.actions,
          queryType: aiResponse.queryType,
          systemsAffected: aiResponse.systemsAffected
        };

        setMessages(prev => [...prev, aiMessage]);

        // Mostrar notificación si hay acciones ejecutadas
        if (aiResponse.actions && aiResponse.actions.length > 0) {
          toast.info(`Ejecutadas ${aiResponse.actions.length} acciones`);
        }

        return aiMessage;
      }
    } catch (error) {
      const errorMessage = {
        id: `error_${Date.now()}`,
        type: 'ai',
        content: `❌ Error: ${error.response?.data?.error || 'No se pudo procesar la consulta'}`,
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
      toast.error('Error comunicándose con el asistente AI');
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = async (action, systemId, parameters = {}) => {
    try {
      setIsLoading(true);
      
      const response = await axios.post('/api/ai/action', {
        action,
        systemId,
        parameters
      });

      if (response.data.success) {
        toast.success('Acción ejecutada exitosamente');
        
        const actionMessage = {
          id: `action_${Date.now()}`,
          type: 'action',
          content: `✅ Acción ejecutada: ${action}`,
          timestamp: new Date().toISOString(),
          result: response.data.result
        };

        setMessages(prev => [...prev, actionMessage]);
        return response.data.result;
      }
    } catch (error) {
      toast.error(`Error ejecutando acción: ${error.response?.data?.error || error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeSystem = async (systemId, analysisType = 'complete') => {
    try {
      setIsLoading(true);
      
      const response = await axios.post('/api/ai/analyze', {
        systemId,
        analysisType
      });

      if (response.data.success) {
        const analysis = response.data.analysis;
        
        const analysisMessage = {
          id: `analysis_${Date.now()}`,
          type: 'analysis',
          content: `📊 Análisis completado para ${analysis.summary.name}`,
          timestamp: new Date().toISOString(),
          analysis
        };

        setMessages(prev => [...prev, analysisMessage]);
        return analysis;
      }
    } catch (error) {
      toast.error(`Error en análisis: ${error.response?.data?.error || error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await axios.delete('/api/ai/history');
      setMessages([]);
      toast.success('Historial limpiado');
    } catch (error) {
      toast.error('Error limpiando historial');
    }
  };

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);
  const toggleChat = () => setIsOpen(!isOpen);

  const getQuickSuggestions = () => {
    return [
      'Estado de todos los sistemas',
      'Revisar logs de errores',
      'Analizar sistema Zeus',
      'Desplegar a producción',
      'Buscar función login',
      'Crear backup de sistemas'
    ];
  };

  const formatMessage = (content) => {
    // Convertir markdown básico a JSX
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  };

  const value = {
    // Estado
    isOpen,
    messages,
    isLoading,
    capabilities,
    suggestions,
    sessionId,
    
    // Acciones principales
    sendMessage,
    executeAction,
    analyzeSystem,
    clearHistory,
    
    // Control de interfaz
    openChat,
    closeChat,
    toggleChat,
    
    // Utilidades
    getQuickSuggestions,
    formatMessage,
    loadHistory,
    loadSuggestions
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
}