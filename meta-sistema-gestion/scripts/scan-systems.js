#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.cyan.bold('🔍 Escáner de Sistemas'));
console.log(chalk.gray('=' * 30));

async function scanSystems() {
  try {
    const basePath = path.resolve(__dirname, '../../../');
    console.log(chalk.yellow(`📂 Escaneando directorio: ${basePath}`));
    
    const potentialSystems = await findPotentialSystems(basePath);
    
    console.log(chalk.green(`\n✅ Encontrados ${potentialSystems.length} sistemas potenciales:`));
    
    for (const system of potentialSystems) {
      console.log(chalk.blue(`\n📦 ${system.name}`));
      console.log(chalk.white(`   Ruta: ${system.path}`));
      console.log(chalk.white(`   Tipo: ${system.type}`));
      console.log(chalk.white(`   Estado: ${system.status}`));
      
      if (system.technologies.length > 0) {
        console.log(chalk.white(`   Tecnologías: ${system.technologies.join(', ')}`));
      }
      
      if (system.version) {
        console.log(chalk.white(`   Versión: ${system.version}`));
      }
    }
    
    // Actualizar registro
    await updateSystemRegistry(potentialSystems);
    
    console.log(chalk.green('\n✅ Escaneo completado y registro actualizado'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error durante el escaneo:'), error.message);
    process.exit(1);
  }
}

async function findPotentialSystems(basePath) {
  const systems = [];
  
  const knownSystemPaths = [
    'sistema-zeus-distribuidora',
    'nuevo sistema de despensa/muebleria',
    'nuevo sistema de despensa'
  ];
  
  for (const systemPath of knownSystemPaths) {
    const fullPath = path.join(basePath, systemPath);
    
    if (await fs.pathExists(fullPath)) {
      const systemInfo = await analyzeSystem(fullPath, systemPath);
      if (systemInfo) {
        systems.push(systemInfo);
      }
    }
  }
  
  return systems;
}

async function analyzeSystem(systemPath, relativePath) {
  try {
    const packageJsonPath = path.join(systemPath, 'package.json');
    let packageData = {};
    let name = path.basename(systemPath);
    let version = 'unknown';
    let technologies = [];
    let type = 'unknown';
    let status = 'unknown';
    
    // Analizar package.json si existe
    if (await fs.pathExists(packageJsonPath)) {
      packageData = await fs.readJson(packageJsonPath);
      name = packageData.name || name;
      version = packageData.version || version;
      
      // Detectar tecnologías
      const deps = { ...packageData.dependencies, ...packageData.devDependencies };
      
      if (deps.react) technologies.push('React');
      if (deps.firebase) technologies.push('Firebase');
      if (deps.express) technologies.push('Express');
      if (deps.mysql2) technologies.push('MySQL');
      if (deps['@mui/material']) technologies.push('Material-UI');
      if (deps.axios) technologies.push('Axios');
      
      // Determinar tipo
      if (deps.react && deps.firebase) {
        type = 'react-firebase';
      } else if (deps.express) {
        type = 'node-express';
      } else if (deps.react) {
        type = 'react';
      } else {
        type = 'node';
      }
    }
    
    // Verificar estructura
    const hasNodeModules = await fs.pathExists(path.join(systemPath, 'node_modules'));
    const hasSrc = await fs.pathExists(path.join(systemPath, 'src'));
    const hasFirebaseConfig = await fs.pathExists(path.join(systemPath, 'firebase.json'));
    
    // Determinar estado
    if (hasNodeModules && hasSrc) {
      status = 'ready';
    } else if (packageData.name) {
      status = 'needs_setup';
    } else {
      status = 'unknown';
    }
    
    // Generar ID único
    const id = generateSystemId(name, relativePath);
    
    return {
      id,
      name: cleanSystemName(name),
      path: systemPath,
      relativePath,
      type,
      status,
      version,
      technologies,
      structure: {
        hasPackageJson: await fs.pathExists(packageJsonPath),
        hasNodeModules,
        hasSrc,
        hasFirebaseConfig
      },
      lastScanned: new Date().toISOString()
    };
    
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Error analizando ${systemPath}: ${error.message}`));
    return null;
  }
}

function generateSystemId(name, relativePath) {
  // Generar ID basado en el nombre y ruta
  const cleanName = name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const pathHash = relativePath.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return cleanName || pathHash || 'unknown-system';
}

function cleanSystemName(name) {
  // Limpiar nombre del sistema
  return name
    .replace(/^sistema-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

async function updateSystemRegistry(systems) {
  const registryPath = path.join(__dirname, '../backend/src/config/systems-registry.json');
  
  try {
    // Cargar registro existente
    let registry = { systems: [] };
    if (await fs.pathExists(registryPath)) {
      registry = await fs.readJson(registryPath);
    }
    
    // Actualizar sistemas
    for (const scannedSystem of systems) {
      const existingIndex = registry.systems.findIndex(s => s.id === scannedSystem.id);
      
      if (existingIndex !== -1) {
        // Actualizar sistema existente
        registry.systems[existingIndex] = {
          ...registry.systems[existingIndex],
          ...scannedSystem,
          lastUpdated: new Date().toISOString()
        };
      } else {
        // Agregar nuevo sistema
        registry.systems.push({
          ...scannedSystem,
          registeredAt: new Date().toISOString()
        });
      }
    }
    
    registry.lastUpdated = new Date().toISOString();
    registry.lastScan = new Date().toISOString();
    
    await fs.ensureDir(path.dirname(registryPath));
    await fs.writeJson(registryPath, registry, { spaces: 2 });
    
    console.log(chalk.green(`✅ Registro actualizado: ${registry.systems.length} sistemas`));
    
  } catch (error) {
    console.error(chalk.red('❌ Error actualizando registro:'), error.message);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  scanSystems();
}

module.exports = { scanSystems };