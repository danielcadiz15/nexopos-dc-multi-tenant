const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const SystemRegistry = require('../services/SystemRegistry');

// GET /api/code/:systemId/files - Listar archivos del sistema
router.get('/:systemId/files', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const { dir = '', pattern } = req.query;
    const targetPath = path.join(system.path, dir);
    
    if (!targetPath.startsWith(system.path)) {
      return res.status(400).json({
        success: false,
        error: 'Ruta inválida'
      });
    }

    const files = await getFilesList(targetPath, pattern);
    
    res.json({
      success: true,
      files,
      path: dir,
      systemId: req.params.systemId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo archivos',
      details: error.message
    });
  }
});

// GET /api/code/:systemId/file - Obtener contenido de archivo
router.get('/:systemId/file', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const { filepath } = req.query;
    if (!filepath) {
      return res.status(400).json({
        success: false,
        error: 'Ruta de archivo requerida'
      });
    }

    const fullPath = path.join(system.path, filepath);
    
    if (!fullPath.startsWith(system.path)) {
      return res.status(400).json({
        success: false,
        error: 'Ruta inválida'
      });
    }

    if (!(await fs.pathExists(fullPath))) {
      return res.status(404).json({
        success: false,
        error: 'Archivo no encontrado'
      });
    }

    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      return res.status(400).json({
        success: false,
        error: 'La ruta especificada es un directorio'
      });
    }

    // Verificar si es un archivo de texto
    const ext = path.extname(fullPath).toLowerCase();
    const textExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', '.css', '.scss', '.html', '.xml', '.yml', '.yaml', '.env'];
    
    if (!textExtensions.includes(ext) && stats.size > 1024 * 1024) { // 1MB
      return res.status(400).json({
        success: false,
        error: 'Archivo demasiado grande o tipo no soportado'
      });
    }

    const content = await fs.readFile(fullPath, 'utf-8');
    
    res.json({
      success: true,
      content,
      filepath,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      systemId: req.params.systemId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error leyendo archivo',
      details: error.message
    });
  }
});

// PUT /api/code/:systemId/file - Actualizar contenido de archivo
router.put('/:systemId/file', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const { filepath, content } = req.body;
    if (!filepath || content === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Ruta de archivo y contenido requeridos'
      });
    }

    const fullPath = path.join(system.path, filepath);
    
    if (!fullPath.startsWith(system.path)) {
      return res.status(400).json({
        success: false,
        error: 'Ruta inválida'
      });
    }

    // Crear backup antes de modificar
    if (await fs.pathExists(fullPath)) {
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      await fs.copy(fullPath, backupPath);
    }

    // Asegurar que el directorio existe
    await fs.ensureDir(path.dirname(fullPath));
    
    // Escribir archivo
    await fs.writeFile(fullPath, content, 'utf-8');

    // Notificar a clientes conectados
    req.io.to(`system-${req.params.systemId}`).emit('file-updated', {
      systemId: req.params.systemId,
      filepath,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Archivo actualizado exitosamente',
      filepath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error actualizando archivo',
      details: error.message
    });
  }
});

// POST /api/code/:systemId/file - Crear nuevo archivo
router.post('/:systemId/file', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const { filepath, content = '' } = req.body;
    if (!filepath) {
      return res.status(400).json({
        success: false,
        error: 'Ruta de archivo requerida'
      });
    }

    const fullPath = path.join(system.path, filepath);
    
    if (!fullPath.startsWith(system.path)) {
      return res.status(400).json({
        success: false,
        error: 'Ruta inválida'
      });
    }

    if (await fs.pathExists(fullPath)) {
      return res.status(409).json({
        success: false,
        error: 'El archivo ya existe'
      });
    }

    // Asegurar que el directorio existe
    await fs.ensureDir(path.dirname(fullPath));
    
    // Crear archivo
    await fs.writeFile(fullPath, content, 'utf-8');

    // Notificar a clientes conectados
    req.io.to(`system-${req.params.systemId}`).emit('file-created', {
      systemId: req.params.systemId,
      filepath,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Archivo creado exitosamente',
      filepath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error creando archivo',
      details: error.message
    });
  }
});

// DELETE /api/code/:systemId/file - Eliminar archivo
router.delete('/:systemId/file', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const { filepath } = req.query;
    if (!filepath) {
      return res.status(400).json({
        success: false,
        error: 'Ruta de archivo requerida'
      });
    }

    const fullPath = path.join(system.path, filepath);
    
    if (!fullPath.startsWith(system.path)) {
      return res.status(400).json({
        success: false,
        error: 'Ruta inválida'
      });
    }

    if (!(await fs.pathExists(fullPath))) {
      return res.status(404).json({
        success: false,
        error: 'Archivo no encontrado'
      });
    }

    // Crear backup antes de eliminar
    const backupPath = `${fullPath}.deleted.${Date.now()}`;
    await fs.move(fullPath, backupPath);

    // Notificar a clientes conectados
    req.io.to(`system-${req.params.systemId}`).emit('file-deleted', {
      systemId: req.params.systemId,
      filepath,
      backupPath,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Archivo eliminado exitosamente',
      filepath,
      backupPath,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error eliminando archivo',
      details: error.message
    });
  }
});

// POST /api/code/:systemId/search - Buscar en archivos
router.post('/:systemId/search', async (req, res) => {
  try {
    const system = SystemRegistry.getSystem(req.params.systemId);
    if (!system) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    const { query, filePattern, caseSensitive = false, wholeWord = false } = req.body;
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Consulta de búsqueda requerida'
      });
    }

    const results = await searchInFiles(system.path, query, {
      filePattern,
      caseSensitive,
      wholeWord
    });

    res.json({
      success: true,
      results,
      query,
      systemId: req.params.systemId,
      total: results.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error en búsqueda',
      details: error.message
    });
  }
});

// Función auxiliar para listar archivos
async function getFilesList(dirPath, pattern) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dirPath);
    
    for (const entry of entries) {
      if (entry.startsWith('.') && entry !== '.env') continue;
      
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.stat(fullPath);
      
      const fileInfo = {
        name: entry,
        path: entry,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime.toISOString()
      };

      if (pattern) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(entry)) {
          files.push(fileInfo);
        }
      } else {
        files.push(fileInfo);
      }
    }
  } catch (error) {
    console.error('Error listando archivos:', error);
  }
  
  return files.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

// Función auxiliar para buscar en archivos
async function searchInFiles(dirPath, query, options = {}) {
  const { filePattern = '\\.(js|jsx|ts|tsx|json|md|txt|css|scss|html)$', caseSensitive = false, wholeWord = false } = options;
  const results = [];
  
  const flags = caseSensitive ? 'g' : 'gi';
  const searchRegex = wholeWord ? new RegExp(`\\b${query}\\b`, flags) : new RegExp(query, flags);
  const fileRegex = new RegExp(filePattern);

  async function searchDirectory(currentPath) {
    try {
      const entries = await fs.readdir(currentPath);
      
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'node_modules') continue;
        
        const fullPath = path.join(currentPath, entry);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await searchDirectory(fullPath);
        } else if (fileRegex.test(entry)) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
              const matches = [...line.matchAll(searchRegex)];
              if (matches.length > 0) {
                const relativePath = path.relative(dirPath, fullPath);
                results.push({
                  file: relativePath,
                  line: index + 1,
                  content: line.trim(),
                  matches: matches.map(m => ({
                    text: m[0],
                    index: m.index
                  }))
                });
              }
            });
          } catch (error) {
            // Ignorar archivos que no se pueden leer
          }
        }
      }
    } catch (error) {
      console.error('Error buscando en directorio:', error);
    }
  }

  await searchDirectory(dirPath);
  return results;
}

module.exports = router;