const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');

class SystemRegistry {
  constructor() {
    this.systems = new Map();
    this.configPath = path.join(__dirname, '../config/systems-registry.json');
    this.watchers = new Map();
  }

  async initialize() {
    await this.loadRegistry();
    await this.discoverSystems();
    
    // Solo habilitar file watching en producción
    if (process.env.NODE_ENV === 'production') {
      this.startFileWatching();
      console.log('👁️ File watching habilitado');
    } else {
      console.log('🔧 File watching deshabilitado (modo desarrollo)');
    }
  }

  async loadRegistry() {
    try {
      if (await fs.pathExists(this.configPath)) {
        const data = await fs.readJson(this.configPath);
        data.systems?.forEach(system => {
          this.systems.set(system.id, system);
        });
        console.log(`📋 Cargados ${this.systems.size} sistemas del registro`);
      }
    } catch (error) {
      console.error('❌ Error cargando registro:', error);
    }
  }

  async saveRegistry() {
    try {
      // No guardar durante desarrollo para evitar reinicio de nodemon
      if (process.env.NODE_ENV !== 'production') {
        console.log('💾 Registro omitido (modo desarrollo)');
        return;
      }
      
      await fs.ensureDir(path.dirname(this.configPath));
      const data = {
        lastUpdated: new Date().toISOString(),
        systems: Array.from(this.systems.values())
      };
      await fs.writeJson(this.configPath, data, { spaces: 2 });
      console.log('💾 Registro guardado exitosamente');
    } catch (error) {
      console.error('❌ Error guardando registro:', error);
    }
  }

  async discoverSystems() {
    console.log(`🔍 Buscando sistemas en rutas específicas...`);
    
    const potentialSystems = [
      {
        id: 'zeus-distribuidora',
        name: 'Sistema Zeus Distribuidora',
        path: 'C:/sistema-zeus-distribuidora',
        type: 'react-firebase',
        status: 'unknown'
      },
      {
        id: 'muebleria-posadas',
        name: 'Sistema Mueblería Posadas',
        path: 'C:/muebleria',
        type: 'react-firebase',
        status: 'unknown'
      },
      {
        id: 'nuevo-sistema-despensa',
        name: 'Nuevo Sistema de Despensa',
        path: 'C:/nuevo sistema de despensa',
        type: 'full-stack',
        status: 'unknown'
      }
    ];

    for (const systemInfo of potentialSystems) {
      await this.registerSystem(systemInfo);
    }
  }

  async registerSystem(systemInfo) {
    try {
      const exists = await fs.pathExists(systemInfo.path);
      if (!exists) {
        console.log(`⚠️  Sistema no encontrado: ${systemInfo.path}`);
        return;
      }

      // Analizar la estructura del sistema
      const analysis = await this.analyzeSystem(systemInfo.path);
      
      const system = {
        ...systemInfo,
        ...analysis,
        registeredAt: new Date().toISOString(),
        lastChecked: new Date().toISOString()
      };

      this.systems.set(system.id, system);
      console.log(`✅ Sistema registrado: ${system.name}`);
      
      await this.saveRegistry();
    } catch (error) {
      console.error(`❌ Error registrando sistema ${systemInfo.name}:`, error);
    }
  }

  async analyzeSystem(systemPath) {
    const analysis = {
      status: 'inactive',
      technologies: [],
      version: 'unknown',
      lastModified: null,
      structure: {},
      dependencies: {},
      configuration: {}
    };

    try {
      // Verificar package.json
      const packageJsonPath = path.join(systemPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageData = await fs.readJson(packageJsonPath);
        analysis.version = packageData.version || '1.0.0';
        analysis.dependencies = packageData.dependencies || {};
        
        // Detectar tecnologías
        if (packageData.dependencies?.react) analysis.technologies.push('React');
        if (packageData.dependencies?.firebase) analysis.technologies.push('Firebase');
        if (packageData.dependencies?.express) analysis.technologies.push('Express');
        if (packageData.dependencies?.mysql2) analysis.technologies.push('MySQL');
      }

      // Verificar estructura de directorios
      const entries = await fs.readdir(systemPath);
      analysis.structure = {
        hasPackageJson: entries.includes('package.json'),
        hasSrc: entries.includes('src'),
        hasPublic: entries.includes('public'),
        hasBuild: entries.includes('build'),
        hasNodeModules: entries.includes('node_modules'),
        hasFirebaseConfig: entries.includes('firebase.json'),
        hasGitRepo: entries.includes('.git')
      };

      // Verificar configuración de Firebase
      const firebaseConfigPath = path.join(systemPath, 'firebase.json');
      if (await fs.pathExists(firebaseConfigPath)) {
        const firebaseConfig = await fs.readJson(firebaseConfigPath);
        analysis.configuration.firebase = firebaseConfig;
      }

      // Determinar estado
      if (analysis.structure.hasNodeModules && analysis.structure.hasSrc) {
        analysis.status = 'ready';
      } else if (analysis.structure.hasPackageJson) {
        analysis.status = 'needs_setup';
      }

      // Última modificación
      const stats = await fs.stat(systemPath);
      analysis.lastModified = stats.mtime.toISOString();

    } catch (error) {
      console.error(`❌ Error analizando sistema en ${systemPath}:`, error);
    }

    return analysis;
  }

  startFileWatching() {
    this.systems.forEach((system, systemId) => {
      if (fs.pathExistsSync(system.path)) {
        const watcher = chokidar.watch(system.path, {
          ignored: /(^|[\/\\])\../, // ignorar archivos ocultos
          persistent: true,
          ignoreInitial: true
        });

        watcher.on('change', async (filePath) => {
          console.log(`📝 Cambio detectado en ${systemId}: ${filePath}`);
          // Actualizar información del sistema
          const updatedAnalysis = await this.analyzeSystem(system.path);
          this.systems.set(systemId, { ...system, ...updatedAnalysis, lastChecked: new Date().toISOString() });
          await this.saveRegistry();
        });

        this.watchers.set(systemId, watcher);
      }
    });
  }

  getAllSystems() {
    return Array.from(this.systems.values());
  }

  getSystem(systemId) {
    return this.systems.get(systemId);
  }

  async updateSystemStatus(systemId, status) {
    const system = this.systems.get(systemId);
    if (system) {
      system.status = status;
      system.lastChecked = new Date().toISOString();
      await this.saveRegistry();
      return true;
    }
    return false;
  }

  async removeSystem(systemId) {
    const removed = this.systems.delete(systemId);
    if (removed) {
      // Detener watcher si existe
      const watcher = this.watchers.get(systemId);
      if (watcher) {
        await watcher.close();
        this.watchers.delete(systemId);
      }
      await this.saveRegistry();
    }
    return removed;
  }

  async refreshSystem(systemId) {
    const system = this.systems.get(systemId);
    if (system) {
      const updatedAnalysis = await this.analyzeSystem(system.path);
      this.systems.set(systemId, { ...system, ...updatedAnalysis, lastChecked: new Date().toISOString() });
      await this.saveRegistry();
      return this.systems.get(systemId);
    }
    return null;
  }
}

module.exports = new SystemRegistry();