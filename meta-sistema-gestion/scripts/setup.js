#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');

console.log(chalk.cyan.bold('🚀 Configuración del Meta Sistema de Gestión'));
console.log(chalk.gray('=' * 50));

async function main() {
  try {
    console.log(chalk.yellow('📋 Iniciando configuración...'));
    
    // Verificar Node.js y npm
    await checkNodeAndNpm();
    
    // Crear directorios necesarios
    await createDirectories();
    
    // Configurar variables de entorno
    await setupEnvironment();
    
    // Instalar dependencias
    await installDependencies();
    
    // Configurar base de datos de usuarios
    await setupUsersDatabase();
    
    // Inicializar registro de sistemas
    await initializeSystemRegistry();
    
    console.log(chalk.green.bold('✅ Configuración completada exitosamente!'));
    console.log();
    console.log(chalk.cyan('🔗 Para iniciar el sistema:'));
    console.log(chalk.white('  npm run dev'));
    console.log();
    console.log(chalk.cyan('🌐 URLs:'));
    console.log(chalk.white('  Frontend: http://localhost:3000'));
    console.log(chalk.white('  Backend:  http://localhost:5000'));
    console.log();
    console.log(chalk.cyan('👤 Credenciales por defecto:'));
    console.log(chalk.white('  Usuario: admin'));
    console.log(chalk.white('  Contraseña: admin123'));
    
  } catch (error) {
    console.error(chalk.red.bold('❌ Error durante la configuración:'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

async function checkNodeAndNpm() {
  console.log(chalk.yellow('🔍 Verificando Node.js y npm...'));
  
  return new Promise((resolve, reject) => {
    exec('node --version', (error, stdout) => {
      if (error) {
        reject(new Error('Node.js no está instalado. Por favor instala Node.js 18 o superior.'));
        return;
      }
      
      const nodeVersion = stdout.trim();
      console.log(chalk.green(`  ✓ Node.js: ${nodeVersion}`));
      
      exec('npm --version', (error, stdout) => {
        if (error) {
          reject(new Error('npm no está disponible.'));
          return;
        }
        
        const npmVersion = stdout.trim();
        console.log(chalk.green(`  ✓ npm: ${npmVersion}`));
        resolve();
      });
    });
  });
}

async function createDirectories() {
  console.log(chalk.yellow('📁 Creando directorios necesarios...'));
  
  const directories = [
    'backend/src/config',
    'backend/src/logs',
    'backend/src/uploads',
    'frontend/public',
    'scripts/backups',
    'templates',
    'docs',
    'tests'
  ];
  
  for (const dir of directories) {
    await fs.ensureDir(dir);
    console.log(chalk.green(`  ✓ ${dir}`));
  }
}

async function setupEnvironment() {
  console.log(chalk.yellow('⚙️  Configurando variables de entorno...'));
  
  const envPath = path.join('backend', '.env');
  
  if (await fs.pathExists(envPath)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'El archivo .env ya existe. ¿Sobrescribir?',
        default: false
      }
    ]);
    
    if (!overwrite) {
      console.log(chalk.blue('  ⏭️  Manteniendo configuración existente'));
      return;
    }
  }
  
  const envContent = `# Meta Sistema de Gestión - Configuración
NODE_ENV=development
PORT=5000

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Seguridad
JWT_SECRET=meta-sistema-secret-${Math.random().toString(36).substring(7)}

# Base de datos (opcional)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=meta_sistema
DB_USER=root
DB_PASSWORD=

# Firebase Admin (opcional)
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# Logs
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Configuración de sistemas
SYSTEMS_SCAN_INTERVAL=30000
AUTO_REFRESH_SYSTEMS=true

# Configuración de backups
BACKUP_ENABLED=true
BACKUP_INTERVAL=daily
BACKUP_RETENTION_DAYS=30
`;

  await fs.writeFile(envPath, envContent);
  console.log(chalk.green('  ✓ Archivo .env creado'));
}

async function installDependencies() {
  console.log(chalk.yellow('📦 Instalando dependencias...'));
  
  const { installNow } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'installNow',
      message: '¿Instalar dependencias ahora? (Recomendado)',
      default: true
    }
  ]);
  
  if (!installNow) {
    console.log(chalk.blue('  ⏭️  Instalación omitida. Ejecuta "npm run install-all" después.'));
    return;
  }
  
  console.log(chalk.blue('  📦 Instalando dependencias raíz...'));
  await execCommand('npm install');
  
  console.log(chalk.blue('  📦 Instalando dependencias del backend...'));
  await execCommand('cd backend && npm install');
  
  console.log(chalk.blue('  📦 Instalando dependencias del frontend...'));
  await execCommand('cd frontend && npm install');
  
  console.log(chalk.green('  ✓ Todas las dependencias instaladas'));
}

async function setupUsersDatabase() {
  console.log(chalk.yellow('👤 Configurando base de datos de usuarios...'));
  
  const usersPath = path.join('backend', 'src', 'config', 'users.json');
  
  if (await fs.pathExists(usersPath)) {
    console.log(chalk.blue('  ⏭️  Base de datos de usuarios ya existe'));
    return;
  }
  
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const users = [
    {
      id: '1',
      username: 'admin',
      password: hashedPassword,
      email: 'admin@metasistema.com',
      name: 'Administrador',
      role: 'admin',
      createdAt: new Date().toISOString(),
      active: true
    }
  ];
  
  await fs.writeJson(usersPath, users, { spaces: 2 });
  console.log(chalk.green('  ✓ Usuario administrador creado'));
}

async function initializeSystemRegistry() {
  console.log(chalk.yellow('🗂️  Inicializando registro de sistemas...'));
  
  const registryPath = path.join('backend', 'src', 'config', 'systems-registry.json');
  
  const registry = {
    lastUpdated: new Date().toISOString(),
    systems: []
  };
  
  await fs.writeJson(registryPath, registry, { spaces: 2 });
  console.log(chalk.green('  ✓ Registro de sistemas inicializado'));
}

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = { main };