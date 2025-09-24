const fs = require('fs-extra');
const path = require('path');
const SystemRegistry = require('./SystemRegistry');

class AIAssistant {
  constructor() {
    this.context = new Map();
    this.conversationHistory = [];
    this.capabilities = [
      'system_analysis',
      'code_editing',
      'deployment',
      'monitoring',
      'debugging',
      'reporting',
      'file_management',
      'system_creation'
    ];
  }

  async initialize() {
    console.log('🤖 Inicializando AI Assistant...');
    
    // En desarrollo, cargar contexto de forma más ligera
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔧 Modo desarrollo: Contexto ligero habilitado');
      // No cargar contexto completo para evitar bucles
    } else {
      await this.loadSystemContext();
    }
    
    console.log('✅ AI Assistant inicializado');
  }

  async loadSystemContext() {
    const systems = SystemRegistry.getAllSystems();
    
    for (const system of systems) {
      const context = await this.analyzeSystemContext(system);
      this.context.set(system.id, context);
    }
  }

  async analyzeSystemContext(system) {
    const context = {
      id: system.id,
      name: system.name,
      type: system.type,
      status: system.status,
      technologies: system.technologies || [],
      structure: {},
      codebase: {},
      lastAnalyzed: new Date().toISOString()
    };

    try {
      // Analizar estructura de archivos
      if (await fs.pathExists(system.path)) {
        context.structure = await this.analyzeFileStructure(system.path);
        
        // Analizar archivos clave
        context.codebase = await this.analyzeKeyFiles(system.path);
      }
    } catch (error) {
      console.error(`Error analizando contexto de ${system.name}:`, error);
    }

    return context;
  }

  async analyzeFileStructure(systemPath, maxDepth = 2, currentDepth = 0) {
    if (currentDepth >= maxDepth) return {};
    
    const structure = {};
    
    // Directorios y archivos a excluir para evitar bucles infinitos
    const excludedDirs = [
      'node_modules', 
      '.git', 
      'build', 
      'dist', 
      '.next', 
      'coverage',
      '.nyc_output',
      'logs',
      '.cache',
      '.temp',
      '.tmp'
    ];
    
    try {
      const entries = await fs.readdir(systemPath);
      
      for (const entry of entries) {
        // Excluir archivos/directorios problemáticos
        if (entry.startsWith('.') || excludedDirs.includes(entry)) continue;
        
        const fullPath = path.join(systemPath, entry);
        
        try {
          const stats = await fs.stat(fullPath);
          
          if (stats.isDirectory()) {
            // Solo analizar directorios importantes en el primer nivel
            if (currentDepth === 0) {
              const importantDirs = ['src', 'public', 'components', 'pages', 'api', 'lib', 'utils'];
              if (importantDirs.includes(entry) || currentDepth < 1) {
                structure[entry] = {
                  type: 'directory',
                  children: await this.analyzeFileStructure(fullPath, maxDepth, currentDepth + 1)
                };
              } else {
                structure[entry] = {
                  type: 'directory',
                  children: {} // No analizar contenido
                };
              }
            }
          } else {
            const ext = path.extname(entry).toLowerCase();
            // Solo incluir archivos importantes
            const importantExts = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.yml', '.yaml'];
            if (importantExts.includes(ext) || entry === 'package.json') {
              structure[entry] = {
                type: 'file',
                extension: ext,
                size: stats.size,
                modified: stats.mtime
              };
            }
          }
        } catch (statError) {
          console.warn(`Error accessing ${fullPath}:`, statError.message);
          continue;
        }
      }
    } catch (error) {
      console.error('Error analizando estructura:', error);
    }
    
    return structure;
  }

  async analyzeKeyFiles(systemPath) {
    const keyFiles = {};
    const filesToAnalyze = [
      'package.json',
      'firebase.json',
      '.firebaserc',
      'README.md'
    ];

    for (const file of filesToAnalyze) {
      const filePath = path.join(systemPath, file);
      
      try {
        if (await fs.pathExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf-8');
          keyFiles[file] = {
            content: content.substring(0, 1500), // Primeros 1.5KB para evitar sobrecarga
            size: content.length,
            type: path.extname(file)
          };
        }
      } catch (error) {
        console.warn(`Error leyendo ${file}:`, error.message);
        // No romper el proceso si un archivo falla
      }
    }

    return keyFiles;
  }

  async processQuery(query, userId, sessionId) {
    const response = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      query,
      response: '',
      actions: [],
      suggestions: [],
      systemsAffected: [],
      executedCommands: []
    };

    try {
      // Analizar el tipo de consulta
      const queryType = this.classifyQuery(query);
      response.queryType = queryType;

      // Procesar según el tipo
      switch (queryType) {
        case 'system_status':
          response.response = await this.handleSystemStatusQuery(query);
          break;
        case 'code_analysis':
          response.response = await this.handleCodeAnalysisQuery(query);
          break;
        case 'file_operation':
          response.response = await this.handleFileOperationQuery(query);
          break;
        case 'deployment':
          response.response = await this.handleDeploymentQuery(query);
          break;
        case 'monitoring':
          response.response = await this.handleMonitoringQuery(query);
          break;
        case 'general':
        default:
          response.response = await this.handleGeneralQuery(query);
          break;
      }

      // Agregar sugerencias contextuales
      response.suggestions = this.generateSuggestions(queryType, query);

    } catch (error) {
      response.response = `❌ Error procesando consulta: ${error.message}`;
      response.error = error.message;
    }

    // Guardar en historial
    this.conversationHistory.push(response);
    
    return response;
  }

  classifyQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('estado') || lowerQuery.includes('status') || lowerQuery.includes('sistemas')) {
      return 'system_status';
    }
    if (lowerQuery.includes('código') || lowerQuery.includes('archivo') || lowerQuery.includes('función')) {
      return 'code_analysis';
    }
    if (lowerQuery.includes('crear') || lowerQuery.includes('modificar') || lowerQuery.includes('editar')) {
      return 'file_operation';
    }
    if (lowerQuery.includes('desplegar') || lowerQuery.includes('deploy') || lowerQuery.includes('build')) {
      return 'deployment';
    }
    if (lowerQuery.includes('monitoreo') || lowerQuery.includes('logs') || lowerQuery.includes('errores')) {
      return 'monitoring';
    }
    
    return 'general';
  }

  async handleSystemStatusQuery(query) {
    const systems = SystemRegistry.getAllSystems();
    
    let response = "📊 **Estado Actual de los Sistemas:**\n\n";
    
    for (const system of systems) {
      const context = this.context.get(system.id);
      const statusIcon = this.getStatusIcon(system.status);
      
      response += `${statusIcon} **${system.name}**\n`;
      response += `   • Estado: ${system.status}\n`;
      response += `   • Tipo: ${system.type}\n`;
      response += `   • Tecnologías: ${system.technologies?.join(', ') || 'N/A'}\n`;
      response += `   • Última verificación: ${system.lastChecked || 'Nunca'}\n\n`;
    }

    response += `**Resumen:**\n`;
    response += `• Total: ${systems.length} sistemas\n`;
    response += `• Activos: ${systems.filter(s => s.status === 'active' || s.status === 'ready').length}\n`;
    response += `• Con errores: ${systems.filter(s => s.status === 'error').length}\n`;
    response += `• En mantenimiento: ${systems.filter(s => s.status === 'maintenance').length}\n`;

    return response;
  }

  async handleCodeAnalysisQuery(query) {
    const systems = SystemRegistry.getAllSystems();
    
    let response = "🔍 **Análisis de Código:**\n\n";
    
    // Buscar patrones específicos en la consulta
    const searchTerm = this.extractSearchTerm(query);
    
    if (searchTerm) {
      response += `Buscando "${searchTerm}" en todos los sistemas...\n\n`;
      
      for (const system of systems) {
        const context = this.context.get(system.id);
        if (context && context.codebase) {
          const matches = this.searchInCodebase(context.codebase, searchTerm);
          if (matches.length > 0) {
            response += `📁 **${system.name}:**\n`;
            matches.forEach(match => {
              response += `   • ${match.file}: ${match.context}\n`;
            });
            response += "\n";
          }
        }
      }
    } else {
      response += "Para análisis específico, incluye términos como:\n";
      response += "• 'buscar función X'\n";
      response += "• 'analizar componente Y'\n";
      response += "• 'revisar archivo Z'\n";
    }

    return response;
  }

  async handleFileOperationQuery(query) {
    return "📝 **Operaciones de Archivos:**\n\n" +
           "Puedo ayudarte con:\n" +
           "• ✏️ Editar archivos de código\n" +
           "• 📁 Crear nuevos archivos\n" +
           "• 🔍 Buscar contenido específico\n" +
           "• 🔄 Sincronizar cambios\n\n" +
           "Especifica qué archivo y qué operación necesitas realizar.";
  }

  async handleDeploymentQuery(query) {
    return "🚀 **Gestión de Despliegues:**\n\n" +
           "Capacidades disponibles:\n" +
           "• 🔨 Build automático de proyectos\n" +
           "• 🌐 Despliegue a Firebase/Cloud\n" +
           "• 📊 Monitoreo de procesos\n" +
           "• ⏪ Rollback en caso de errores\n\n" +
           "¿Qué sistema quieres desplegar?";
  }

  async handleMonitoringQuery(query) {
    return "📈 **Monitoreo de Sistemas:**\n\n" +
           "Información disponible:\n" +
           "• 🔍 Health checks en tiempo real\n" +
           "• 📝 Logs centralizados\n" +
           "• ⚡ Métricas de rendimiento\n" +
           "• 🚨 Alertas automáticas\n\n" +
           "¿Qué métricas específicas necesitas revisar?";
  }

  async handleGeneralQuery(query) {
    return "🤖 **Asistente AI del Meta Sistema:**\n\n" +
           "¡Hola! Soy tu asistente integrado. Puedo ayudarte con:\n\n" +
           "🔧 **Gestión de Sistemas:**\n" +
           "• Revisar estado de todos los sistemas\n" +
           "• Analizar código y estructura\n" +
           "• Realizar modificaciones programáticas\n\n" +
           "🚀 **Operaciones:**\n" +
           "• Despliegues automatizados\n" +
           "• Monitoreo en tiempo real\n" +
           "• Debugging y resolución de problemas\n\n" +
           "💡 **Ejemplos de consultas:**\n" +
           "• 'Estado de todos los sistemas'\n" +
           "• 'Buscar función login en Zeus'\n" +
           "• 'Desplegar sistema de mueblería'\n" +
           "• 'Revisar logs de errores'\n\n" +
           "¿En qué puedo ayudarte hoy?";
  }

  extractSearchTerm(query) {
    const patterns = [
      /buscar\s+["']([^"']+)["']/i,
      /buscar\s+(\w+)/i,
      /función\s+(\w+)/i,
      /componente\s+(\w+)/i,
      /archivo\s+([^\s]+)/i
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  searchInCodebase(codebase, searchTerm) {
    const matches = [];
    
    for (const [fileName, fileData] of Object.entries(codebase)) {
      if (fileData.content && fileData.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        const lines = fileData.content.split('\n');
        const matchingLines = lines.filter(line => 
          line.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (matchingLines.length > 0) {
          matches.push({
            file: fileName,
            context: matchingLines[0].trim().substring(0, 100) + '...'
          });
        }
      }
    }
    
    return matches;
  }

  generateSuggestions(queryType, query) {
    const suggestions = [];
    
    switch (queryType) {
      case 'system_status':
        suggestions.push('Actualizar todos los sistemas');
        suggestions.push('Revisar logs de errores');
        suggestions.push('Ejecutar health checks');
        break;
      case 'code_analysis':
        suggestions.push('Analizar dependencias');
        suggestions.push('Revisar estructura de archivos');
        suggestions.push('Buscar funciones relacionadas');
        break;
      case 'deployment':
        suggestions.push('Verificar configuración de entorno');
        suggestions.push('Ejecutar tests antes del deploy');
        suggestions.push('Crear backup antes del despliegue');
        break;
    }
    
    return suggestions;
  }

  getStatusIcon(status) {
    const icons = {
      'active': '🟢',
      'ready': '✅',
      'inactive': '⚪',
      'error': '🔴',
      'maintenance': '🟡',
      'needs_setup': '🔵'
    };
    
    return icons[status] || '❓';
  }

  generateId() {
    return 'ai_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async executeSystemAction(action, systemId, parameters) {
    try {
      switch (action) {
        case 'refresh_system':
          return await SystemRegistry.refreshSystem(systemId);
        case 'update_status':
          return await SystemRegistry.updateSystemStatus(systemId, parameters.status);
        case 'get_files':
          return await this.getSystemFiles(systemId, parameters.path);
        case 'read_file':
          return await this.readSystemFile(systemId, parameters.filepath);
        case 'write_file':
          return await this.writeSystemFile(systemId, parameters.filepath, parameters.content);
        default:
          throw new Error(`Acción no reconocida: ${action}`);
      }
    } catch (error) {
      console.error(`Error ejecutando acción ${action}:`, error);
      throw error;
    }
  }

  async getSystemFiles(systemId, dirPath = '') {
    const system = SystemRegistry.getSystem(systemId);
    if (!system) throw new Error('Sistema no encontrado');
    
    const targetPath = path.join(system.path, dirPath);
    const files = [];
    
    try {
      const entries = await fs.readdir(targetPath);
      
      for (const entry of entries) {
        if (entry.startsWith('.') && entry !== '.env') continue;
        
        const fullPath = path.join(targetPath, entry);
        const stats = await fs.stat(fullPath);
        
        files.push({
          name: entry,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime
        });
      }
    } catch (error) {
      throw new Error(`Error listando archivos: ${error.message}`);
    }
    
    return files;
  }

  async readSystemFile(systemId, filepath) {
    const system = SystemRegistry.getSystem(systemId);
    if (!system) throw new Error('Sistema no encontrado');
    
    const fullPath = path.join(system.path, filepath);
    
    // Verificar seguridad de la ruta
    if (!fullPath.startsWith(system.path)) {
      throw new Error('Ruta inválida');
    }
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      return { content, filepath, size: content.length };
    } catch (error) {
      throw new Error(`Error leyendo archivo: ${error.message}`);
    }
  }

  async writeSystemFile(systemId, filepath, content) {
    const system = SystemRegistry.getSystem(systemId);
    if (!system) throw new Error('Sistema no encontrado');
    
    const fullPath = path.join(system.path, filepath);
    
    // Verificar seguridad de la ruta
    if (!fullPath.startsWith(system.path)) {
      throw new Error('Ruta inválida');
    }
    
    try {
      // Crear backup antes de modificar
      if (await fs.pathExists(fullPath)) {
        const backupPath = `${fullPath}.backup.${Date.now()}`;
        await fs.copy(fullPath, backupPath);
      }
      
      // Asegurar que el directorio existe
      await fs.ensureDir(path.dirname(fullPath));
      
      // Escribir archivo
      await fs.writeFile(fullPath, content, 'utf-8');
      
      return { success: true, filepath, timestamp: new Date().toISOString() };
    } catch (error) {
      throw new Error(`Error escribiendo archivo: ${error.message}`);
    }
  }

  getConversationHistory(limit = 10) {
    return this.conversationHistory.slice(-limit);
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getSystemContext(systemId) {
    return this.context.get(systemId);
  }

  async refreshSystemContext(systemId) {
    const system = SystemRegistry.getSystem(systemId);
    if (system) {
      const newContext = await this.analyzeSystemContext(system);
      this.context.set(systemId, newContext);
      return newContext;
    }
    return null;
  }
}

module.exports = new AIAssistant();