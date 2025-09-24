const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const SystemRegistry = require('./SystemRegistry');

class DeployService {
  constructor() {
    this.activeDeployments = new Map();
    this.deploymentHistory = [];
    this.io = null;
  }

  initialize(io) {
    this.io = io;
    console.log('🚀 Servicio de despliegue inicializado');
  }

  async startBuild(systemId) {
    const system = SystemRegistry.getSystem(systemId);
    if (!system) {
      throw new Error('Sistema no encontrado');
    }

    const buildId = `build_${systemId}_${Date.now()}`;
    const buildInfo = {
      id: buildId,
      systemId,
      type: 'build',
      status: 'running',
      startTime: new Date().toISOString(),
      logs: []
    };

    this.activeDeployments.set(buildId, buildInfo);

    try {
      // Emitir inicio de build
      this.emitUpdate(systemId, 'build-started', buildInfo);

      // Ejecutar build
      const result = await this.executeBuild(system, buildId);
      
      buildInfo.status = 'completed';
      buildInfo.endTime = new Date().toISOString();
      buildInfo.result = result;

      this.emitUpdate(systemId, 'build-completed', buildInfo);
      this.addToHistory(buildInfo);

      return buildInfo;
    } catch (error) {
      buildInfo.status = 'failed';
      buildInfo.endTime = new Date().toISOString();
      buildInfo.error = error.message;

      this.emitUpdate(systemId, 'build-failed', buildInfo);
      this.addToHistory(buildInfo);

      throw error;
    } finally {
      this.activeDeployments.delete(buildId);
    }
  }

  async startDeploy(systemId, environment = 'production', buildFirst = true) {
    const system = SystemRegistry.getSystem(systemId);
    if (!system) {
      throw new Error('Sistema no encontrado');
    }

    const deployId = `deploy_${systemId}_${Date.now()}`;
    const deployInfo = {
      id: deployId,
      systemId,
      type: 'deploy',
      environment,
      status: 'running',
      startTime: new Date().toISOString(),
      logs: [],
      buildFirst
    };

    this.activeDeployments.set(deployId, deployInfo);

    try {
      // Emitir inicio de deploy
      this.emitUpdate(systemId, 'deploy-started', deployInfo);

      // Build primero si es necesario
      if (buildFirst) {
        await this.executeBuild(system, deployId);
      }

      // Ejecutar deploy
      const result = await this.executeDeploy(system, environment, deployId);
      
      deployInfo.status = 'completed';
      deployInfo.endTime = new Date().toISOString();
      deployInfo.result = result;

      this.emitUpdate(systemId, 'deploy-completed', deployInfo);
      this.addToHistory(deployInfo);

      return deployInfo;
    } catch (error) {
      deployInfo.status = 'failed';
      deployInfo.endTime = new Date().toISOString();
      deployInfo.error = error.message;

      this.emitUpdate(systemId, 'deploy-failed', deployInfo);
      this.addToHistory(deployInfo);

      throw error;
    } finally {
      this.activeDeployments.delete(deployId);
    }
  }

  async executeBuild(system, processId) {
    return new Promise((resolve, reject) => {
      const buildCommand = this.getBuildCommand(system);
      
      this.addLog(processId, 'info', `Ejecutando: ${buildCommand}`);
      
      const process = exec(buildCommand, {
        cwd: system.path,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

      let output = '';

      process.stdout.on('data', (data) => {
        const log = data.toString();
        output += log;
        this.addLog(processId, 'stdout', log);
        this.emitLog(system.id, 'build', log);
      });

      process.stderr.on('data', (data) => {
        const log = data.toString();
        output += log;
        this.addLog(processId, 'stderr', log);
        this.emitLog(system.id, 'build', log);
      });

      process.on('close', (code) => {
        if (code === 0) {
          this.addLog(processId, 'success', 'Build completado exitosamente');
          resolve({ exitCode: code, output });
        } else {
          this.addLog(processId, 'error', `Build falló con código ${code}`);
          reject(new Error(`Build falló con código ${code}`));
        }
      });

      process.on('error', (error) => {
        this.addLog(processId, 'error', `Error ejecutando build: ${error.message}`);
        reject(error);
      });
    });
  }

  async executeDeploy(system, environment, processId) {
    return new Promise((resolve, reject) => {
      const deployCommand = this.getDeployCommand(system, environment);
      
      this.addLog(processId, 'info', `Desplegando a ${environment}: ${deployCommand}`);
      
      const process = exec(deployCommand, {
        cwd: system.path,
        maxBuffer: 1024 * 1024 * 10
      });

      let output = '';

      process.stdout.on('data', (data) => {
        const log = data.toString();
        output += log;
        this.addLog(processId, 'stdout', log);
        this.emitLog(system.id, 'deploy', log);
      });

      process.stderr.on('data', (data) => {
        const log = data.toString();
        output += log;
        this.addLog(processId, 'stderr', log);
        this.emitLog(system.id, 'deploy', log);
      });

      process.on('close', (code) => {
        if (code === 0) {
          this.addLog(processId, 'success', `Despliegue a ${environment} completado`);
          resolve({ exitCode: code, output, environment });
        } else {
          this.addLog(processId, 'error', `Despliegue falló con código ${code}`);
          reject(new Error(`Despliegue falló con código ${code}`));
        }
      });

      process.on('error', (error) => {
        this.addLog(processId, 'error', `Error ejecutando deploy: ${error.message}`);
        reject(error);
      });
    });
  }

  getBuildCommand(system) {
    switch (system.type) {
      case 'react-firebase':
      case 'react':
        return 'npm run build';
      case 'node-express':
        return 'npm run build || echo "No build script defined"';
      case 'full-stack':
        return 'npm run build';
      default:
        return 'npm run build';
    }
  }

  getDeployCommand(system, environment) {
    switch (system.type) {
      case 'react-firebase':
        return environment === 'production' 
          ? 'firebase deploy' 
          : `firebase deploy --only hosting:${environment}`;
      case 'node-express':
        return 'npm run deploy || echo "No deploy script defined"';
      case 'full-stack':
        return 'npm run deploy';
      default:
        return 'echo "Deploy command not configured"';
    }
  }

  addLog(processId, level, message) {
    const deployment = this.activeDeployments.get(processId);
    if (deployment) {
      deployment.logs.push({
        timestamp: new Date().toISOString(),
        level,
        message
      });
    }
  }

  emitUpdate(systemId, event, data) {
    if (this.io) {
      this.io.to(`system-${systemId}`).emit(event, data);
      this.io.emit('deployment-update', { systemId, event, data });
    }
  }

  emitLog(systemId, type, log) {
    if (this.io) {
      this.io.to(`system-${systemId}`).emit(`${type}-log`, {
        systemId,
        log,
        timestamp: new Date().toISOString()
      });
    }
  }

  addToHistory(deploymentInfo) {
    this.deploymentHistory.unshift(deploymentInfo);
    
    // Mantener solo los últimos 100 despliegues
    if (this.deploymentHistory.length > 100) {
      this.deploymentHistory.splice(100);
    }
  }

  getDeploymentHistory(systemId = null, limit = 20) {
    let history = this.deploymentHistory;
    
    if (systemId) {
      history = history.filter(d => d.systemId === systemId);
    }
    
    return history.slice(0, limit);
  }

  getActiveDeployments(systemId = null) {
    const active = Array.from(this.activeDeployments.values());
    
    if (systemId) {
      return active.filter(d => d.systemId === systemId);
    }
    
    return active;
  }

  async getDeploymentStatus(systemId) {
    const system = SystemRegistry.getSystem(systemId);
    if (!system) {
      throw new Error('Sistema no encontrado');
    }

    const status = {
      systemId,
      canBuild: false,
      canDeploy: false,
      lastBuild: null,
      lastDeploy: null,
      buildStatus: 'unknown',
      deployStatus: 'unknown',
      environments: []
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
        
        // Leer entornos disponibles
        const firebaseRcPath = path.join(system.path, '.firebaserc');
        if (await fs.pathExists(firebaseRcPath)) {
          const firebaseRc = await fs.readJson(firebaseRcPath);
          if (firebaseRc.projects) {
            status.environments = Object.keys(firebaseRc.projects);
          }
        }
      }

      // Obtener último despliegue del historial
      const lastDeploy = this.deploymentHistory.find(d => 
        d.systemId === systemId && d.type === 'deploy'
      );
      if (lastDeploy) {
        status.lastDeploy = lastDeploy.endTime || lastDeploy.startTime;
        status.deployStatus = lastDeploy.status === 'completed' ? 'deployed' : lastDeploy.status;
      }

    } catch (error) {
      console.error('Error obteniendo estado de despliegue:', error);
    }

    return status;
  }

  cancelDeployment(processId) {
    const deployment = this.activeDeployments.get(processId);
    if (deployment) {
      deployment.status = 'cancelled';
      deployment.endTime = new Date().toISOString();
      
      this.emitUpdate(deployment.systemId, 'deployment-cancelled', deployment);
      this.addToHistory(deployment);
      this.activeDeployments.delete(processId);
      
      return true;
    }
    return false;
  }
}

module.exports = new DeployService();