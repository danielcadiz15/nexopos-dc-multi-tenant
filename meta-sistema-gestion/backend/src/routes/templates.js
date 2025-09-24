const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');

// GET /api/templates - Obtener todas las plantillas
router.get('/', async (req, res) => {
  try {
    const templates = await getAvailableTemplates();
    
    res.json({
      success: true,
      templates,
      total: templates.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo plantillas',
      details: error.message
    });
  }
});

// GET /api/templates/:id - Obtener plantilla específica
router.get('/:id', async (req, res) => {
  try {
    const template = await getTemplate(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo plantilla',
      details: error.message
    });
  }
});

// POST /api/templates/:id/create - Crear sistema desde plantilla
router.post('/:id/create', async (req, res) => {
  try {
    const { name, projectId, path: targetPath, configuration } = req.body;
    
    if (!name || !projectId || !targetPath) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, ID de proyecto y ruta son requeridos'
      });
    }

    const template = await getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada'
      });
    }

    // Crear sistema desde plantilla
    const newSystem = await createSystemFromTemplate(template, {
      name,
      projectId,
      targetPath,
      configuration
    }, req.io);

    res.json({
      success: true,
      message: 'Sistema creado exitosamente desde plantilla',
      system: newSystem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error creando sistema desde plantilla',
      details: error.message
    });
  }
});

// POST /api/templates - Crear nueva plantilla desde sistema existente
router.post('/', async (req, res) => {
  try {
    const { sourceSystemId, templateName, description, category } = req.body;
    
    if (!sourceSystemId || !templateName) {
      return res.status(400).json({
        success: false,
        error: 'ID del sistema fuente y nombre de plantilla requeridos'
      });
    }

    const SystemRegistry = require('../services/SystemRegistry');
    const sourceSystem = SystemRegistry.getSystem(sourceSystemId);
    
    if (!sourceSystem) {
      return res.status(404).json({
        success: false,
        error: 'Sistema fuente no encontrado'
      });
    }

    const template = await createTemplateFromSystem(sourceSystem, {
      name: templateName,
      description,
      category
    });

    res.status(201).json({
      success: true,
      message: 'Plantilla creada exitosamente',
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error creando plantilla',
      details: error.message
    });
  }
});

// Función para obtener plantillas disponibles
async function getAvailableTemplates() {
  const templatesDir = path.join(__dirname, '../templates');
  await fs.ensureDir(templatesDir);
  
  const templates = [
    {
      id: 'react-firebase-basic',
      name: 'React + Firebase Básico',
      description: 'Aplicación React con autenticación Firebase y Firestore',
      category: 'Frontend',
      technologies: ['React', 'Firebase', 'Material-UI'],
      features: ['Autenticación', 'Base de datos', 'Hosting'],
      complexity: 'Básico',
      estimatedTime: '30 minutos'
    },
    {
      id: 'react-firebase-advanced',
      name: 'React + Firebase Avanzado',
      description: 'Sistema completo con funcionalidades empresariales',
      category: 'Full Stack',
      technologies: ['React', 'Firebase', 'Functions', 'Storage'],
      features: ['Autenticación', 'CRUD completo', 'Reportes', 'Móvil'],
      complexity: 'Avanzado',
      estimatedTime: '60 minutos'
    },
    {
      id: 'node-express-mysql',
      name: 'Node.js + Express + MySQL',
      description: 'API REST con base de datos MySQL',
      category: 'Backend',
      technologies: ['Node.js', 'Express', 'MySQL', 'JWT'],
      features: ['API REST', 'Autenticación', 'Base de datos'],
      complexity: 'Intermedio',
      estimatedTime: '45 minutos'
    },
    {
      id: 'fullstack-complete',
      name: 'Sistema Completo',
      description: 'Frontend React + Backend Node.js + Base de datos',
      category: 'Full Stack',
      technologies: ['React', 'Node.js', 'MySQL', 'Firebase'],
      features: ['Todo incluido', 'Multi-tenant', 'Escalable'],
      complexity: 'Avanzado',
      estimatedTime: '90 minutos'
    }
  ];

  // Verificar si existen los archivos de plantilla
  for (const template of templates) {
    const templatePath = path.join(templatesDir, template.id);
    template.available = await fs.pathExists(templatePath);
    
    if (template.available) {
      try {
        const configPath = path.join(templatePath, 'template.json');
        if (await fs.pathExists(configPath)) {
          const config = await fs.readJson(configPath);
          Object.assign(template, config);
        }
      } catch (error) {
        console.error(`Error leyendo configuración de plantilla ${template.id}:`, error);
      }
    }
  }

  return templates;
}

// Función para obtener plantilla específica
async function getTemplate(templateId) {
  const templates = await getAvailableTemplates();
  const template = templates.find(t => t.id === templateId);
  
  if (!template) return null;

  // Obtener estructura de archivos si está disponible
  if (template.available) {
    const templatesDir = path.join(__dirname, '../templates');
    const templatePath = path.join(templatesDir, templateId);
    template.structure = await getTemplateStructure(templatePath);
  }

  return template;
}

// Función para crear sistema desde plantilla
async function createSystemFromTemplate(template, options, io) {
  const { name, projectId, targetPath, configuration = {} } = options;
  
  // Notificar inicio
  io.emit('template-creation-started', {
    templateId: template.id,
    targetPath,
    timestamp: new Date().toISOString()
  });

  try {
    // Asegurar que el directorio de destino existe
    await fs.ensureDir(targetPath);

    let creationMethod;
    
    // Determinar método de creación basado en la plantilla
    switch (template.id) {
      case 'react-firebase-basic':
      case 'react-firebase-advanced':
        creationMethod = createReactFirebaseProject;
        break;
      case 'node-express-mysql':
        creationMethod = createNodeExpressProject;
        break;
      case 'fullstack-complete':
        creationMethod = createFullStackProject;
        break;
      default:
        throw new Error(`Plantilla ${template.id} no implementada`);
    }

    // Crear el proyecto
    const newSystem = await creationMethod(template, {
      name,
      projectId,
      targetPath,
      configuration
    }, io);

    // Registrar el nuevo sistema
    const SystemRegistry = require('../services/SystemRegistry');
    await SystemRegistry.registerSystem({
      id: projectId,
      name,
      path: targetPath,
      type: template.category.toLowerCase().replace(' ', '-'),
      status: 'ready'
    });

    // Notificar finalización
    io.emit('template-creation-completed', {
      templateId: template.id,
      systemId: projectId,
      targetPath,
      timestamp: new Date().toISOString()
    });

    return newSystem;

  } catch (error) {
    // Notificar error
    io.emit('template-creation-failed', {
      templateId: template.id,
      targetPath,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}

// Función para crear proyecto React + Firebase
async function createReactFirebaseProject(template, options, io) {
  const { name, projectId, targetPath, configuration } = options;
  
  io.emit('template-log', { message: 'Creando aplicación React...' });
  
  return new Promise((resolve, reject) => {
    exec(`npx create-react-app ${projectId}`, { cwd: path.dirname(targetPath) }, async (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      try {
        const projectPath = path.join(path.dirname(targetPath), projectId);
        
        // Instalar dependencias adicionales
        io.emit('template-log', { message: 'Instalando dependencias Firebase...' });
        
        const dependencies = [
          'firebase',
          '@mui/material',
          '@emotion/react',
          '@emotion/styled',
          'react-router-dom',
          'react-toastify'
        ];

        await installDependencies(projectPath, dependencies, io);

        // Crear estructura Firebase
        await createFirebaseStructure(projectPath, { projectId, configuration }, io);

        // Crear archivos base
        await createBaseFiles(projectPath, template, { name, projectId }, io);

        io.emit('template-log', { message: 'Proyecto creado exitosamente!' });

        resolve({
          id: projectId,
          name,
          path: projectPath,
          type: 'react-firebase',
          status: 'ready'
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Función para crear proyecto Node.js + Express
async function createNodeExpressProject(template, options, io) {
  const { name, projectId, targetPath } = options;
  
  io.emit('template-log', { message: 'Creando proyecto Node.js + Express...' });
  
  try {
    // Crear estructura de directorios
    await fs.ensureDir(targetPath);
    
    // Crear package.json
    const packageJson = {
      name: projectId,
      version: '1.0.0',
      description: name,
      main: 'src/app.js',
      scripts: {
        start: 'node src/app.js',
        dev: 'nodemon src/app.js',
        test: 'jest'
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5',
        helmet: '^7.0.0',
        morgan: '^1.10.0',
        mysql2: '^3.6.0',
        dotenv: '^16.3.1',
        bcryptjs: '^2.4.3',
        jsonwebtoken: '^9.0.2'
      },
      devDependencies: {
        nodemon: '^3.0.1',
        jest: '^29.6.2'
      }
    };

    await fs.writeJson(path.join(targetPath, 'package.json'), packageJson, { spaces: 2 });

    // Crear estructura de archivos
    await createNodeExpressStructure(targetPath, options, io);

    io.emit('template-log', { message: 'Instalando dependencias...' });
    await installDependencies(targetPath, [], io);

    io.emit('template-log', { message: 'Proyecto Node.js creado exitosamente!' });

    return {
      id: projectId,
      name,
      path: targetPath,
      type: 'node-express',
      status: 'ready'
    };
  } catch (error) {
    throw error;
  }
}

// Funciones auxiliares
async function installDependencies(projectPath, additionalDeps, io) {
  return new Promise((resolve, reject) => {
    const command = additionalDeps.length > 0 
      ? `npm install ${additionalDeps.join(' ')}`
      : 'npm install';
    
    const process = exec(command, { cwd: projectPath });
    
    process.stdout.on('data', (data) => {
      io.emit('template-log', { message: data.toString().trim() });
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install falló con código ${code}`));
      }
    });
  });
}

async function createFirebaseStructure(projectPath, options, io) {
  const { projectId, configuration } = options;
  
  // Crear firebase.json
  const firebaseConfig = {
    hosting: {
      public: "build",
      ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
      rewrites: [{ source: "**", destination: "/index.html" }]
    },
    firestore: {
      rules: "firestore.rules",
      indexes: "firestore.indexes.json"
    }
  };

  await fs.writeJson(path.join(projectPath, 'firebase.json'), firebaseConfig, { spaces: 2 });

  // Crear .firebaserc
  const firebaseRc = {
    projects: {
      default: projectId
    }
  };

  await fs.writeJson(path.join(projectPath, '.firebaserc'), firebaseRc, { spaces: 2 });

  // Crear reglas de Firestore básicas
  const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

  await fs.writeFile(path.join(projectPath, 'firestore.rules'), firestoreRules);

  io.emit('template-log', { message: 'Configuración Firebase creada' });
}

async function createBaseFiles(projectPath, template, options, io) {
  const { name, projectId } = options;
  
  // Crear configuración Firebase en src
  const firebaseConfigContent = `// Firebase configuration for ${name}
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // TODO: Agregar configuración de Firebase
  apiKey: "your-api-key",
  authDomain: "${projectId}.firebaseapp.com",
  projectId: "${projectId}",
  storageBucket: "${projectId}.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;`;

  await fs.ensureDir(path.join(projectPath, 'src', 'firebase'));
  await fs.writeFile(path.join(projectPath, 'src', 'firebase', 'config.js'), firebaseConfigContent);

  io.emit('template-log', { message: 'Archivos base creados' });
}

async function getTemplateStructure(templatePath) {
  const structure = {};
  
  try {
    const entries = await fs.readdir(templatePath);
    
    for (const entry of entries) {
      const fullPath = path.join(templatePath, entry);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        structure[entry] = await getTemplateStructure(fullPath);
      } else {
        structure[entry] = {
          type: 'file',
          size: stats.size
        };
      }
    }
  } catch (error) {
    console.error('Error obteniendo estructura de plantilla:', error);
  }
  
  return structure;
}

async function createNodeExpressStructure(targetPath, options, io) {
  // Crear directorios
  const dirs = ['src', 'src/routes', 'src/models', 'src/controllers', 'src/middleware', 'src/config'];
  
  for (const dir of dirs) {
    await fs.ensureDir(path.join(targetPath, dir));
  }

  // Crear app.js básico
  const appContent = `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Rutas
app.get('/', (req, res) => {
  res.json({ message: 'API funcionando correctamente' });
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Servidor ejecutándose en puerto \${PORT}\`);
});

module.exports = app;`;

  await fs.writeFile(path.join(targetPath, 'src', 'app.js'), appContent);

  // Crear .env
  const envContent = `PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=${options.projectId}
JWT_SECRET=your-secret-key`;

  await fs.writeFile(path.join(targetPath, '.env'), envContent);

  io.emit('template-log', { message: 'Estructura Node.js creada' });
}

async function createFullStackProject(template, options, io) {
  // Implementar creación de proyecto full stack
  // Esto combinaría tanto frontend como backend
  throw new Error('Plantilla full stack no implementada aún');
}

async function createTemplateFromSystem(sourceSystem, templateInfo) {
  // Implementar creación de plantilla desde sistema existente
  throw new Error('Creación de plantillas desde sistemas existentes no implementada aún');
}

module.exports = router;