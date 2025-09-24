import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

const SystemContext = createContext();

export function useSystem() {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem debe usarse dentro de SystemProvider');
  }
  return context;
}

export function SystemProvider({ children }) {
  const [systems, setSystems] = useState([]);
  const [currentSystem, setCurrentSystem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  // Conectar socket.io
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    // Escuchar eventos del socket
    newSocket.on('system-updated', (system) => {
      setSystems(prev => prev.map(s => s.id === system.id ? system : s));
      toast.info(`Sistema ${system.name} actualizado`);
    });

    newSocket.on('system-status-changed', ({ systemId, status }) => {
      setSystems(prev => prev.map(s => 
        s.id === systemId ? { ...s, status } : s
      ));
    });

    newSocket.on('system-removed', ({ systemId }) => {
      setSystems(prev => prev.filter(s => s.id !== systemId));
      if (currentSystem?.id === systemId) {
        setCurrentSystem(null);
      }
    });

    newSocket.on('file-updated', ({ systemId, filepath }) => {
      toast.success(`Archivo actualizado: ${filepath}`);
    });

    newSocket.on('build-complete', ({ success }) => {
      if (success) {
        toast.success('Construcción completada exitosamente');
      } else {
        toast.error('Error en la construcción');
      }
    });

    newSocket.on('deploy-complete', ({ success, environment }) => {
      if (success) {
        toast.success(`Despliegue a ${environment} completado exitosamente`);
      } else {
        toast.error(`Error en despliegue a ${environment}`);
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Cargar sistemas al inicializar
  useEffect(() => {
    loadSystems();
  }, []);

  const loadSystems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/systems');
      if (response.data.success) {
        setSystems(response.data.systems);
      }
    } catch (error) {
      toast.error('Error cargando sistemas');
    } finally {
      setLoading(false);
    }
  };

  const refreshSystem = async (systemId) => {
    try {
      const response = await axios.post(`/api/systems/${systemId}/refresh`);
      if (response.data.success) {
        setSystems(prev => prev.map(s => 
          s.id === systemId ? response.data.system : s
        ));
        return response.data.system;
      }
    } catch (error) {
      toast.error('Error actualizando sistema');
    }
  };

  const updateSystemStatus = async (systemId, status) => {
    try {
      const response = await axios.put(`/api/systems/${systemId}/status`, { status });
      if (response.data.success) {
        setSystems(prev => prev.map(s => 
          s.id === systemId ? response.data.system : s
        ));
        return true;
      }
    } catch (error) {
      toast.error('Error actualizando estado del sistema');
      return false;
    }
  };

  const removeSystem = async (systemId) => {
    try {
      const response = await axios.delete(`/api/systems/${systemId}`);
      if (response.data.success) {
        setSystems(prev => prev.filter(s => s.id !== systemId));
        if (currentSystem?.id === systemId) {
          setCurrentSystem(null);
        }
        toast.success('Sistema removido del registro');
        return true;
      }
    } catch (error) {
      toast.error('Error removiendo sistema');
      return false;
    }
  };

  const getSystemStructure = async (systemId) => {
    try {
      const response = await axios.get(`/api/systems/${systemId}/structure`);
      if (response.data.success) {
        return response.data.structure;
      }
    } catch (error) {
      toast.error('Error obteniendo estructura del sistema');
      return null;
    }
  };

  const joinSystemRoom = (systemId) => {
    if (socket) {
      socket.emit('join-system', systemId);
    }
  };

  const selectSystem = (system) => {
    setCurrentSystem(system);
    if (system) {
      joinSystemRoom(system.id);
    }
  };

  // Funciones para el editor de código
  const getFiles = async (systemId, dir = '') => {
    try {
      const response = await axios.get(`/api/code/${systemId}/files`, {
        params: { dir }
      });
      if (response.data.success) {
        return response.data.files;
      }
    } catch (error) {
      toast.error('Error obteniendo archivos');
      return [];
    }
  };

  const getFileContent = async (systemId, filepath) => {
    try {
      const response = await axios.get(`/api/code/${systemId}/file`, {
        params: { filepath }
      });
      if (response.data.success) {
        return response.data;
      }
    } catch (error) {
      toast.error('Error leyendo archivo');
      return null;
    }
  };

  const saveFile = async (systemId, filepath, content) => {
    try {
      const response = await axios.put(`/api/code/${systemId}/file`, {
        filepath,
        content
      });
      if (response.data.success) {
        toast.success('Archivo guardado exitosamente');
        return true;
      }
    } catch (error) {
      toast.error('Error guardando archivo');
      return false;
    }
  };

  const createFile = async (systemId, filepath, content = '') => {
    try {
      const response = await axios.post(`/api/code/${systemId}/file`, {
        filepath,
        content
      });
      if (response.data.success) {
        toast.success('Archivo creado exitosamente');
        return true;
      }
    } catch (error) {
      toast.error('Error creando archivo');
      return false;
    }
  };

  const deleteFile = async (systemId, filepath) => {
    try {
      const response = await axios.delete(`/api/code/${systemId}/file`, {
        params: { filepath }
      });
      if (response.data.success) {
        toast.success('Archivo eliminado exitosamente');
        return true;
      }
    } catch (error) {
      toast.error('Error eliminando archivo');
      return false;
    }
  };

  const searchInFiles = async (systemId, query, options = {}) => {
    try {
      const response = await axios.post(`/api/code/${systemId}/search`, {
        query,
        ...options
      });
      if (response.data.success) {
        return response.data.results;
      }
    } catch (error) {
      toast.error('Error en búsqueda');
      return [];
    }
  };

  // Funciones de despliegue
  const buildSystem = async (systemId) => {
    try {
      const response = await axios.post(`/api/deploy/${systemId}/build`);
      if (response.data.success) {
        toast.info('Construcción iniciada...');
        return true;
      }
    } catch (error) {
      toast.error('Error iniciando construcción');
      return false;
    }
  };

  const deploySystem = async (systemId, environment = 'production', buildFirst = true) => {
    try {
      const response = await axios.post(`/api/deploy/${systemId}/deploy`, {
        environment,
        buildFirst
      });
      if (response.data.success) {
        toast.info(`Despliegue a ${environment} iniciado...`);
        return true;
      }
    } catch (error) {
      toast.error('Error iniciando despliegue');
      return false;
    }
  };

  const value = {
    systems,
    currentSystem,
    loading,
    socket,
    selectSystem,
    loadSystems,
    refreshSystem,
    updateSystemStatus,
    removeSystem,
    getSystemStructure,
    getFiles,
    getFileContent,
    saveFile,
    createFile,
    deleteFile,
    searchInFiles,
    buildSystem,
    deploySystem
  };

  return (
    <SystemContext.Provider value={value}>
      {children}
    </SystemContext.Provider>
  );
}