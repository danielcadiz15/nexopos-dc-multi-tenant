const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const SystemRegistry = require('../services/SystemRegistry');
const fs = require('fs-extra');
const path = require('path');

// GET /api/deploy/:systemId/status - Obtener estado de despliegue
router.get('/:systemId/status', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const deployStatus = await getDeployStatus(system);
    
    res.json({
      success: true,
      status: deployStatus,
      systemId: req.params.systemId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado de despliegue',
      details: error.message
    });
  }
});

// POST /api/deploy/:systemId/build - Construir proyecto
router.post('/:systemId/build', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    // Iniciar proceso de construcción
    const buildProcess = await startBuild(system, req.io);
    
    res.json({
      success: true,
      message: 'Proceso de construcción iniciado',
      processId: buildProcess.pid,
      systemId: req.params.systemId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error iniciando construcción',
      details: error.message
    });
  }
});

// POST /api/deploy/:systemId/deploy - Desplegar sistema
router.post('/:systemId/deploy', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const { environment = 'production', buildFirst = true } = req.body;
    
    // Iniciar proceso de despliegue
    const deployProcess = await startDeploy(system, environment, buildFirst, req.io);
    
    res.json({
      success: true,
      message: 'Proceso de despliegue iniciado',
      processId: deployProcess.pid,
      environment,
      systemId: req.params.systemId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error iniciando despliegue',
      details: error.message
    });
  }
});

// GET /api/deploy/:systemId/environments - Obtener entornos disponibles
router.get('/:systemId/environments', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const environments = await getAvailableEnvironments(system);
    
    res.json({
      success: true,
      environments,
      systemId: req.params.systemId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo entornos',
      details: error.message
    });
  }
});

// POST /api/deploy/:systemId/rollback - Hacer rollback
router.post('/:systemId/rollback', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const { version } = req.body;
    if (!version) {
      return res.status(400).json({
        success: false,
        error: 'Versión requerida para rollback'
      });
    }

    const rollbackProcess = await startRollback(system, version, req.io);
    
    res.json({
      success: true,
      message: 'Proceso de rollback iniciado',
      processId: rollbackProcess.pid,
      version,
      systemId: req.params.systemId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error iniciando rollback',
      details: error.message
    });
  }
});

// Función para obtener estado de despliegue
async function getDeployStatus(system) {
  const status = {
    canBuild: false,
    canDeploy: false,
    lastBuild: null,
    lastDeploy: null,
    buildStatus: 'unknown',
    deployStatus: 'unknown'
  };

  try {
    // Verificar si tiene package.json
    const packageJsonPath = path.join(system.path, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      status.canBuild = true;
      
      // Verificar build directory
      const buildPath = path.join(system.path, 'build');
      if (await fs.pathExists(buildPath)) {
        const buildStats = await fs.stat(buildPath);
        status.lastBuild = buildStats.mtime.toISOString();
        status.buildStatus = 'ready';
      }
    }

    // Verificar configuración de Firebase
    const firebaseConfigPath = path.join(system.path, 'firebase.json');
    if (await fs.pathExists(firebaseConfigPath)) {
      status.canDeploy = true;
      status.deployStatus = 'ready';
    }

  } catch (error) {
    console.error('Error obteniendo estado de despliegue:', error);
  }

  return status;
}

// Función para iniciar construcción
async function startBuild(system, io) {
  return new Promise((resolve, reject) => {
    const buildCommand = system.type === 'react-firebase' ? 'npm run build' : 'npm run build';
    
    const process = exec(buildCommand, {
      cwd: system.path,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    // Emitir logs en tiempo real
    process.stdout.on('data', (data) => {
      io.to(`system-${system.id}`).emit('build-log', {
        type: 'stdout',
        data: data.toString(),
        timestamp: new Date().toISOString()
      });
    });

    process.stderr.on('data', (data) => {
      io.to(`system-${system.id}`).emit('build-log', {
        type: 'stderr',
        data: data.toString(),
        timestamp: new Date().toISOString()
      });
    });

    process.on('close', (code) => {
      const success = code === 0;
      io.to(`system-${system.id}`).emit('build-complete', {
        success,
        code,
        timestamp: new Date().toISOString()
      });
      
      if (success) {
        resolve(process);
      } else {
        reject(new Error(`Construcción falló con código ${code}`));
      }
    });

    process.on('error', (error) => {
      io.to(`system-${system.id}`).emit('build-error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      reject(error);
    });
  });
}

// Función para iniciar despliegue
async function startDeploy(system, environment, buildFirst, io) {
  return new Promise(async (resolve, reject) => {
    try {
      // Construir primero si es necesario
      if (buildFirst) {
        await startBuild(system, io);
      }

      let deployCommand;
      
      if (system.type === 'react-firebase') {
        deployCommand = environment === 'production' 
          ? 'firebase deploy' 
          : `firebase deploy --only hosting:${environment}`;
      } else {
        deployCommand = 'npm run deploy';
      }

      const process = exec(deployCommand, {
        cwd: system.path,
        maxBuffer: 1024 * 1024 * 10
      });

      // Emitir logs en tiempo real
      process.stdout.on('data', (data) => {
        io.to(`system-${system.id}`).emit('deploy-log', {
          type: 'stdout',
          data: data.toString(),
          timestamp: new Date().toISOString()
        });
      });

      process.stderr.on('data', (data) => {
        io.to(`system-${system.id}`).emit('deploy-log', {
          type: 'stderr',
          data: data.toString(),
          timestamp: new Date().toISOString()
        });
      });

      process.on('close', (code) => {
        const success = code === 0;
        io.to(`system-${system.id}`).emit('deploy-complete', {
          success,
          code,
          environment,
          timestamp: new Date().toISOString()
        });
        
        if (success) {
          resolve(process);
        } else {
          reject(new Error(`Despliegue falló con código ${code}`));
        }
      });

      process.on('error', (error) => {
        io.to(`system-${system.id}`).emit('deploy-error', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}

// Función para obtener entornos disponibles
async function getAvailableEnvironments(system) {
  const environments = [
    { name: 'development', url: 'http://localhost:3000', status: 'local' },
    { name: 'staging', url: null, status: 'unknown' },
    { name: 'production', url: null, status: 'unknown' }
  ];

  try {
    // Leer configuración de Firebase si existe
    const firebaseConfigPath = path.join(system.path, 'firebase.json');
    if (await fs.pathExists(firebaseConfigPath)) {
      const firebaseConfig = await fs.readJson(firebaseConfigPath);
      
      // Leer .firebaserc para obtener proyectos
      const firebaseRcPath = path.join(system.path, '.firebaserc');
      if (await fs.pathExists(firebaseRcPath)) {
        const firebaseRc = await fs.readJson(firebaseRcPath);
        
        if (firebaseRc.projects) {
          Object.entries(firebaseRc.projects).forEach(([env, projectId]) => {
            const envIndex = environments.findIndex(e => e.name === env);
            if (envIndex !== -1) {
              environments[envIndex].url = `https://${projectId}.web.app`;
              environments[envIndex].status = 'configured';
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error leyendo configuración de entornos:', error);
  }

  return environments;
}

// Función para iniciar rollback
async function startRollback(system, version, io) {
  return new Promise((resolve, reject) => {
    // Esta es una implementación básica
    // En un sistema real, necesitarías mantener un historial de versiones
    const rollbackCommand = `git checkout ${version}`;
    
    const process = exec(rollbackCommand, {
      cwd: system.path,
      maxBuffer: 1024 * 1024 * 10
    });

    process.stdout.on('data', (data) => {
      io.to(`system-${system.id}`).emit('rollback-log', {
        type: 'stdout',
        data: data.toString(),
        timestamp: new Date().toISOString()
      });
    });

    process.stderr.on('data', (data) => {
      io.to(`system-${system.id}`).emit('rollback-log', {
        type: 'stderr',
        data: data.toString(),
        timestamp: new Date().toISOString()
      });
    });

    process.on('close', (code) => {
      const success = code === 0;
      io.to(`system-${system.id}`).emit('rollback-complete', {
        success,
        code,
        version,
        timestamp: new Date().toISOString()
      });
      
      if (success) {
        resolve(process);
      } else {
        reject(new Error(`Rollback falló con código ${code}`));
      }
    });

    process.on('error', (error) => {
      io.to(`system-${system.id}`).emit('rollback-error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      reject(error);
    });
  });
}

module.exports = router;