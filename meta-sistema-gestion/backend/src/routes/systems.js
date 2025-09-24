const express = require('express');
const router = express.Router();
const SystemRegistry = require('../services/SystemRegistry');
const { authenticateToken } = require('./auth');
const fs = require('fs-extra');
const path = require('path');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /api/systems - Obtener todos los sistemas
router.get('/', (req, res) => {
  try {
    const systems = SystemRegistry.getAllSystems();
    res.json({
      success: true,
      systems,
      total: systems.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo sistemas',
      details: error.message
    });
  }
});

// POST /api/systems - Agregar sistema manualmente
router.post('/', async (req, res) => {
  try {
    const { id, name, path: systemPath, type, description, technologies, firebaseProject, environment } = req.body;
    
    if (!id || !name || !systemPath || !type) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: id, name, path, type'
      });
    }

    // Verificar que el sistema no exista ya
    const existingSystem = SystemRegistry.getSystem(id);
    if (existingSystem) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un sistema con ese ID'
      });
    }

    // Verificar que la ruta existe
    if (!await fs.pathExists(systemPath)) {
      return res.status(400).json({
        success: false,
        error: 'La ruta especificada no existe'
      });
    }

    // Crear objeto del sistema
    const newSystem = {
      id,
      name,
      path: systemPath,
      type,
      description: description || '',
      technologies: technologies || [],
      firebaseProject: firebaseProject || null,
      environment: environment || 'development',
      status: 'needs_setup',
      lastChecked: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdBy: 'manual'
    };

    // Registrar el sistema
    SystemRegistry.registerSystem(newSystem);
    
    res.json({
      success: true,
      system: newSystem,
      message: 'Sistema agregado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error agregando sistema',
      details: error.message
    });
  }
});

// POST /api/systems/validate-path - Validar ruta de sistema
router.post('/validate-path', async (req, res) => {
  try {
    const { path: systemPath } = req.body;
    
    if (!systemPath) {
      return res.status(400).json({
        success: false,
        error: 'Ruta requerida'
      });
    }

    // Verificar que la ruta existe
    if (!await fs.pathExists(systemPath)) {
      return res.status(400).json({
        success: false,
        error: 'La ruta especificada no existe'
      });
    }

    // Analizar la ruta para detectar información del sistema
    const info = await analyzeSystemPath(systemPath);
    
    res.json({
      success: true,
      info,
      message: 'Ruta válida'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error validando ruta',
      details: error.message
    });
  }
});

// GET /api/systems/:id - Obtener sistema específico
router.get('/:id', (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.id);
    
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    res.json({
      success: true,
      system
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo sistema',
      details: error.message
    });
  }
});

// PUT /api/systems/:id - Actualizar sistema
router.put('/:id', async (req, res) => {
  try {
    const systemId = req.params.id;
    const updates = req.body;
    
    const success = await SystemRegistry.updateSystem(systemId, updates);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const updatedSystem = SystemRegistry.getSystem(systemId);
    
    res.json({
      success: true,
      system: updatedSystem,
      message: 'Sistema actualizado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error actualizando sistema',
      details: error.message
    });
  }
});

// DELETE /api/systems/:id - Eliminar sistema
router.delete('/:id', async (req, res) => {
  try {
    const systemId = req.params.id;
    
    const success = await SystemRegistry.removeSystem(systemId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Sistema eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error eliminando sistema',
      details: error.message
    });
  }
});

// POST /api/systems/:id/refresh - Refrescar estado del sistema
router.post('/:id/refresh', async (req, res) => {
  try {
    const systemId = req.params.id;
    
    const success = await SystemRegistry.refreshSystem(systemId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const system = SystemRegistry.getSystem(systemId);
    
    res.json({
      success: true,
      system,
      message: 'Sistema refrescado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error refrescando sistema',
      details: error.message
    });
  }
});

// POST /api/systems/discover - Descubrir sistemas automáticamente
router.post('/discover', async (req, res) => {
  try {
    const discovered = await SystemRegistry.discoverSystems();
    
    res.json({
      success: true,
      discovered,
      message: `${discovered.length} sistemas descubiertos`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error descubriendo sistemas',
      details: error.message
    });
  }
});

// GET /api/systems/browse-directories - Explorar directorios (placeholder)
router.get('/browse-directories', async (req, res) => {
  try {
    // En una implementación real, podrías usar librerías como node-dir
    // Por ahora retornamos algunos directorios comunes
    const commonPaths = [
      'C:\\Users\\' + process.env.USERNAME + '\\Documents',
      'C:\\Projects',
      'C:\\workspace',
      'D:\\Projects'
    ].filter(path => fs.pathExistsSync(path));

    res.json({
      success: true,
      directories: commonPaths,
      message: 'Función de explorador en desarrollo'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error explorando directorios',
      details: error.message
    });
  }
});

// Función auxiliar para analizar ruta del sistema
async function analyzeSystemPath(systemPath) {
  const info = {
    packageJson: false,
    firebaseConfig: false,
    suggestedType: 'other',
    technologies: [],
    firebaseProject: null
  };

  try {
    // Verificar package.json
    const packageJsonPath = path.join(systemPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      info.packageJson = true;
      
      try {
        const packageData = await fs.readJson(packageJsonPath);
        
        // Analizar dependencias para detectar tecnologías
        const allDeps = {
          ...packageData.dependencies,
          ...packageData.devDependencies
        };
        
        if (allDeps.react) {
          info.technologies.push('React');
          info.suggestedType = 'react';
        }
        
        if (allDeps.express) {
          info.technologies.push('Express');
          info.suggestedType = 'node-express';
        }
        
        if (allDeps.firebase || allDeps['firebase-admin']) {
          info.technologies.push('Firebase');
          info.suggestedType = 'react-firebase';
        }
        
        if (allDeps.typescript) {
          info.technologies.push('TypeScript');
        }
        
        if (allDeps['@mui/material']) {
          info.technologies.push('Material-UI');
        }
        
        if (allDeps.axios) {
          info.technologies.push('Axios');
        }
      } catch (error) {
        console.error('Error leyendo package.json:', error);
      }
    }

    // Verificar configuración Firebase
    const firebaseJsonPath = path.join(systemPath, 'firebase.json');
    if (await fs.pathExists(firebaseJsonPath)) {
      info.firebaseConfig = true;
      
      // Verificar .firebaserc para obtener project ID
      const firebaseRcPath = path.join(systemPath, '.firebaserc');
      if (await fs.pathExists(firebaseRcPath)) {
        try {
          const firebaseRc = await fs.readJson(firebaseRcPath);
          if (firebaseRc.projects && firebaseRc.projects.default) {
            info.firebaseProject = firebaseRc.projects.default;
          }
        } catch (error) {
          console.error('Error leyendo .firebaserc:', error);
        }
      }
    }

    // Detectar si es full-stack (tiene tanto frontend como backend)
    const srcExists = await fs.pathExists(path.join(systemPath, 'src'));
    const backendExists = await fs.pathExists(path.join(systemPath, 'backend')) || 
                         await fs.pathExists(path.join(systemPath, 'server'));
    
    if (srcExists && backendExists) {
      info.suggestedType = 'full-stack';
    }

  } catch (error) {
    console.error('Error analizando ruta del sistema:', error);
  }

  return info;
}

module.exports = router;