const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const SystemRegistry = require('../services/SystemRegistry');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// GET /api/monitoring/overview - Vista general de todos los sistemas
router.get('/overview', async (req, res) => {
  try {
    const systems = SystemRegistry.getAllSystems();
    const overview = await getSystemsOverview(systems);
    
    res.json({
      success: true,
      overview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo vista general',
      details: error.message
    });
  }
});

// GET /api/monitoring/:systemId/health - Estado de salud del sistema
router.get('/:systemId/health', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const health = await getSystemHealth(system);
    
    res.json({
      success: true,
      health,
      systemId: req.params.systemId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estado de salud',
      details: error.message
    });
  }
});

// GET /api/monitoring/:systemId/metrics - Métricas del sistema
router.get('/:systemId/metrics', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const { period = '1h' } = req.query;
    const metrics = await getSystemMetrics(system, period);
    
    res.json({
      success: true,
      metrics,
      period,
      systemId: req.params.systemId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas',
      details: error.message
    });
  }
});

// GET /api/monitoring/:systemId/logs - Logs en tiempo real
router.get('/:systemId/logs', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const { lines = 100, level = 'all' } = req.query;
    const logs = await getSystemLogs(system, parseInt(lines), level);
    
    res.json({
      success: true,
      logs,
      systemId: req.params.systemId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo logs',
      details: error.message
    });
  }
});

// POST /api/monitoring/:systemId/restart - Reiniciar sistema
router.post('/:systemId/restart', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const restartResult = await restartSystem(system, req.io);
    
    res.json({
      success: true,
      message: 'Sistema reiniciado exitosamente',
      result: restartResult,
      systemId: req.params.systemId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error reiniciando sistema',
      details: error.message
    });
  }
});

// GET /api/monitoring/:systemId/processes - Procesos del sistema
router.get('/:systemId/processes', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const processes = await getSystemProcesses(system);
    
    res.json({
      success: true,
      processes,
      systemId: req.params.systemId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo procesos',
      details: error.message
    });
  }
});

// Función para obtener vista general de sistemas
async function getSystemsOverview(systems) {
  const overview = {
    totalSystems: systems.length,
    activeCount: 0,
    inactiveCount: 0,
    errorCount: 0,
    maintenanceCount: 0,
    systemSummary: []
  };

  for (const system of systems) {
    const health = await getSystemHealth(system);
    
    overview.systemSummary.push({
      id: system.id,
      name: system.name,
      status: system.status,
      health: health.overall,
      uptime: health.uptime,
      lastChecked: system.lastChecked
    });

    // Contar estados
    switch (system.status) {
      case 'active':
        overview.activeCount++;
        break;
      case 'inactive':
        overview.inactiveCount++;
        break;
      case 'error':
        overview.errorCount++;
        break;
      case 'maintenance':
        overview.maintenanceCount++;
        break;
    }
  }

  return overview;
}

// Función para obtener estado de salud del sistema
async function getSystemHealth(system) {
  const health = {
    overall: 'unknown',
    uptime: null,
    responseTime: null,
    dependencies: {},
    diskUsage: null,
    memoryUsage: null,
    checks: []
  };

  try {
    // Verificar si el directorio existe
    const pathExists = await fs.pathExists(system.path);
    health.checks.push({
      name: 'Directorio del sistema',
      status: pathExists ? 'healthy' : 'error',
      message: pathExists ? 'Directorio accesible' : 'Directorio no encontrado'
    });

    if (pathExists) {
      // Verificar package.json
      const packageJsonPath = path.join(system.path, 'package.json');
      const hasPackageJson = await fs.pathExists(packageJsonPath);
      health.checks.push({
        name: 'Configuración del proyecto',
        status: hasPackageJson ? 'healthy' : 'warning',
        message: hasPackageJson ? 'package.json encontrado' : 'package.json no encontrado'
      });

      // Verificar node_modules
      const nodeModulesPath = path.join(system.path, 'node_modules');
      const hasNodeModules = await fs.pathExists(nodeModulesPath);
      health.checks.push({
        name: 'Dependencias',
        status: hasNodeModules ? 'healthy' : 'warning',
        message: hasNodeModules ? 'Dependencias instaladas' : 'Dependencias faltantes'
      });

      // Verificar archivos de configuración específicos
      if (system.type === 'react-firebase') {
        const firebaseConfigPath = path.join(system.path, 'firebase.json');
        const hasFirebaseConfig = await fs.pathExists(firebaseConfigPath);
        health.checks.push({
          name: 'Configuración Firebase',
          status: hasFirebaseConfig ? 'healthy' : 'warning',
          message: hasFirebaseConfig ? 'Firebase configurado' : 'Configuración Firebase faltante'
        });
      }

      // Obtener uso de disco
      try {
        const stats = await fs.stat(system.path);
        const dirSize = await getDirectorySize(system.path);
        health.diskUsage = {
          size: dirSize,
          lastModified: stats.mtime.toISOString()
        };
      } catch (error) {
        console.error('Error obteniendo uso de disco:', error);
      }
    }

    // Determinar estado general
    const errorChecks = health.checks.filter(c => c.status === 'error');
    const warningChecks = health.checks.filter(c => c.status === 'warning');
    
    if (errorChecks.length > 0) {
      health.overall = 'error';
    } else if (warningChecks.length > 0) {
      health.overall = 'warning';
    } else {
      health.overall = 'healthy';
    }

  } catch (error) {
    health.overall = 'error';
    health.checks.push({
      name: 'Error general',
      status: 'error',
      message: error.message
    });
  }

  return health;
}

// Función para obtener métricas del sistema
async function getSystemMetrics(system, period) {
  const metrics = {
    period,
    fileCount: 0,
    totalSize: 0,
    lastActivity: null,
    buildMetrics: null,
    performance: {}
  };

  try {
    // Contar archivos y tamaño
    const fileStats = await getFileStatistics(system.path);
    metrics.fileCount = fileStats.count;
    metrics.totalSize = fileStats.size;
    metrics.lastActivity = fileStats.lastModified;

    // Métricas de construcción si existe build
    const buildPath = path.join(system.path, 'build');
    if (await fs.pathExists(buildPath)) {
      const buildStats = await fs.stat(buildPath);
      metrics.buildMetrics = {
        lastBuild: buildStats.mtime.toISOString(),
        buildSize: await getDirectorySize(buildPath)
      };
    }

  } catch (error) {
    console.error('Error obteniendo métricas:', error);
  }

  return metrics;
}

// Función para obtener logs del sistema
async function getSystemLogs(system, lines, level) {
  const logs = [];
  
  try {
    // Buscar archivos de log comunes
    const logPaths = [
      path.join(system.path, 'logs'),
      path.join(system.path, 'log'),
      system.path // logs en raíz
    ];

    for (const logDir of logPaths) {
      if (await fs.pathExists(logDir)) {
        const entries = await fs.readdir(logDir);
        
        for (const entry of entries) {
          if (entry.includes('.log') || entry.includes('error') || entry.includes('debug')) {
            const logFile = path.join(logDir, entry);
            const stats = await fs.stat(logFile);
            
            if (stats.isFile()) {
              try {
                const content = await fs.readFile(logFile, 'utf-8');
                const logLines = content.split('\n').slice(-lines);
                
                logs.push({
                  file: entry,
                  path: path.relative(system.path, logFile),
                  lines: logLines.filter(line => line.trim() && filterLogLevel(line, level)),
                  lastModified: stats.mtime.toISOString()
                });
              } catch (error) {
                console.error(`Error leyendo log ${logFile}:`, error);
              }
            }
          }
        }
      }
    }

    // Si no hay logs, crear uno básico
    if (logs.length === 0) {
      logs.push({
        file: 'system-status',
        path: 'virtual',
        lines: [
          `[${new Date().toISOString()}] Sistema: ${system.name}`,
          `[${new Date().toISOString()}] Estado: ${system.status}`,
          `[${new Date().toISOString()}] Última verificación: ${system.lastChecked}`
        ],
        lastModified: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error obteniendo logs:', error);
  }

  return logs;
}

// Función para reiniciar sistema
async function restartSystem(system, io) {
  return new Promise((resolve, reject) => {
    // Comando de reinicio basado en el tipo de sistema
    let restartCommand;
    
    if (system.type === 'react-firebase') {
      restartCommand = 'npm start';
    } else {
      restartCommand = 'npm restart';
    }

    const process = exec(restartCommand, {
      cwd: system.path,
      detached: true
    });

    process.stdout.on('data', (data) => {
      io.to(`system-${system.id}`).emit('restart-log', {
        type: 'stdout',
        data: data.toString(),
        timestamp: new Date().toISOString()
      });
    });

    process.stderr.on('data', (data) => {
      io.to(`system-${system.id}`).emit('restart-log', {
        type: 'stderr',
        data: data.toString(),
        timestamp: new Date().toISOString()
      });
    });

    setTimeout(() => {
      resolve({
        processId: process.pid,
        status: 'restarted',
        timestamp: new Date().toISOString()
      });
    }, 2000);
  });
}

// Función para obtener procesos del sistema
async function getSystemProcesses(system) {
  return new Promise((resolve) => {
    const processes = [];
    
    // Buscar procesos relacionados con el sistema
    exec(`ps aux | grep "${system.name}"`, (error, stdout) => {
      if (!error && stdout) {
        const lines = stdout.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          const parts = line.split(/\s+/);
          if (parts.length >= 11) {
            processes.push({
              pid: parts[1],
              cpu: parts[2],
              memory: parts[3],
              command: parts.slice(10).join(' ')
            });
          }
        });
      }
      
      resolve(processes);
    });
  });
}

// Funciones auxiliares
async function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  try {
    const entries = await fs.readdir(dirPath);
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        if (!['node_modules', '.git', 'build', 'dist'].includes(entry)) {
          totalSize += await getDirectorySize(fullPath);
        }
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    console.error('Error calculando tamaño:', error);
  }
  
  return totalSize;
}

async function getFileStatistics(dirPath) {
  let count = 0;
  let size = 0;
  let lastModified = null;
  
  try {
    const entries = await fs.readdir(dirPath);
    
    for (const entry of entries) {
      if (entry.startsWith('.') && entry !== '.env') continue;
      
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        if (!['node_modules', '.git', 'build', 'dist'].includes(entry)) {
          const subStats = await getFileStatistics(fullPath);
          count += subStats.count;
          size += subStats.size;
          if (!lastModified || subStats.lastModified > lastModified) {
            lastModified = subStats.lastModified;
          }
        }
      } else {
        count++;
        size += stats.size;
        if (!lastModified || stats.mtime > new Date(lastModified)) {
          lastModified = stats.mtime.toISOString();
        }
      }
    }
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
  }
  
  return { count, size, lastModified };
}

function filterLogLevel(line, level) {
  if (level === 'all') return true;
  
  const lowerLine = line.toLowerCase();
  switch (level) {
    case 'error':
      return lowerLine.includes('error') || lowerLine.includes('err');
    case 'warning':
      return lowerLine.includes('warn') || lowerLine.includes('warning');
    case 'info':
      return lowerLine.includes('info') || lowerLine.includes('log');
    default:
      return true;
  }
}

module.exports = router;