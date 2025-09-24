const express = require('express');
const router = express.Router();
const AIAssistant = require('../services/AIAssistant');
const { authenticateToken } = require('./auth');

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// POST /api/ai/chat - Enviar consulta al asistente AI
router.post('/chat', async (req, res) => {
  try {
    const { query, sessionId } = req.body;
    
    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Consulta requerida'
      });
    }

    const response = await AIAssistant.processQuery(
      query.trim(),
      req.user.id,
      sessionId || 'default'
    );

    // Emitir respuesta via WebSocket si hay conexión
    if (req.io) {
      req.io.emit('ai-response', {
        userId: req.user.id,
        sessionId,
        response
      });
    }

    res.json({
      success: true,
      response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error procesando consulta',
      details: error.message
    });
  }
});

// POST /api/ai/action - Ejecutar acción del sistema
router.post('/action', async (req, res) => {
  try {
    const { action, systemId, parameters = {} } = req.body;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Acción requerida'
      });
    }

    const result = await AIAssistant.executeSystemAction(action, systemId, parameters);

    // Notificar via WebSocket
    if (req.io) {
      req.io.emit('ai-action-completed', {
        userId: req.user.id,
        action,
        systemId,
        result,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      result,
      action,
      systemId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error ejecutando acción',
      details: error.message
    });
  }
});

// GET /api/ai/capabilities - Obtener capacidades del asistente
router.get('/capabilities', (req, res) => {
  res.json({
    success: true,
    capabilities: AIAssistant.capabilities,
    features: [
      {
        name: 'Análisis de Sistemas',
        description: 'Revisar estado, estructura y configuración de sistemas',
        actions: ['system_status', 'analyze_structure', 'health_check']
      },
      {
        name: 'Gestión de Código',
        description: 'Leer, editar y analizar archivos de código',
        actions: ['read_file', 'write_file', 'search_code', 'analyze_dependencies']
      },
      {
        name: 'Despliegues',
        description: 'Gestionar builds y despliegues de sistemas',
        actions: ['build_system', 'deploy_system', 'rollback', 'check_deployment']
      },
      {
        name: 'Monitoreo',
        description: 'Supervisar rendimiento y detectar problemas',
        actions: ['get_metrics', 'analyze_logs', 'check_health', 'generate_reports']
      },
      {
        name: 'Debugging',
        description: 'Identificar y resolver problemas en los sistemas',
        actions: ['analyze_errors', 'suggest_fixes', 'trace_issues', 'validate_config']
      }
    ]
  });
});

// GET /api/ai/history - Obtener historial de conversación
router.get('/history', (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const history = AIAssistant.getConversationHistory(parseInt(limit));
    
    res.json({
      success: true,
      history,
      total: history.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo historial',
      details: error.message
    });
  }
});

// DELETE /api/ai/history - Limpiar historial
router.delete('/history', (req, res) => {
  try {
    AIAssistant.clearHistory();
    
    res.json({
      success: true,
      message: 'Historial limpiado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error limpiando historial',
      details: error.message
    });
  }
});

// GET /api/ai/context/:systemId - Obtener contexto de sistema específico
router.get('/context/:systemId', (req, res) => {
  try {
    const context = AIAssistant.getSystemContext(req.params.systemId);
    
    if (!context) {
      return res.status(404).json({
        success: false,
        error: 'Contexto de sistema no encontrado'
      });
    }

    res.json({
      success: true,
      context,
      systemId: req.params.systemId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo contexto',
      details: error.message
    });
  }
});

// POST /api/ai/context/:systemId/refresh - Refrescar contexto del sistema
router.post('/context/:systemId/refresh', async (req, res) => {
  try {
    const context = await AIAssistant.refreshSystemContext(req.params.systemId);
    
    if (!context) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado'
      });
    }

    res.json({
      success: true,
      context,
      message: 'Contexto actualizado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error actualizando contexto',
      details: error.message
    });
  }
});

// GET /api/ai/suggestions - Obtener sugerencias contextuales
router.get('/suggestions', (req, res) => {
  try {
    const suggestions = [
      {
        category: 'Estado de Sistemas',
        items: [
          '¿Cuál es el estado actual de todos los sistemas?',
          'Revisar sistemas con errores',
          'Mostrar métricas de rendimiento'
        ]
      },
      {
        category: 'Análisis de Código',
        items: [
          'Buscar función login en el sistema Zeus',
          'Analizar dependencias del sistema de mueblería',
          'Revisar archivos modificados recientemente'
        ]
      },
      {
        category: 'Despliegues',
        items: [
          'Desplegar sistema Zeus a producción',
          'Verificar configuración de Firebase',
          'Crear backup antes del despliegue'
        ]
      },
      {
        category: 'Monitoreo',
        items: [
          'Revisar logs de errores de la última hora',
          'Generar reporte de actividad semanal',
          'Verificar health checks de todos los sistemas'
        ]
      }
    ];

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error obteniendo sugerencias',
      details: error.message
    });
  }
});

// POST /api/ai/analyze - Análisis profundo de sistema
router.post('/analyze', async (req, res) => {
  try {
    const { systemId, analysisType = 'complete' } = req.body;
    
    if (!systemId) {
      return res.status(400).json({
        success: false,
        error: 'ID de sistema requerido'
      });
    }

    const context = AIAssistant.getSystemContext(systemId);
    if (!context) {
      return res.status(404).json({
        success: false,
        error: 'Sistema no encontrado en contexto'
      });
    }

    const analysis = {
      systemId,
      analysisType,
      timestamp: new Date().toISOString(),
      summary: {
        name: context.name,
        type: context.type,
        status: 'Análisis completado',
        technologies: context.technologies
      },
      structure: {
        totalFiles: router.countFiles(context.structure),
        directories: router.countDirectories(context.structure),
        keyFiles: Object.keys(context.codebase || {})
      },
      recommendations: router.generateRecommendations(context),
      health: {
        score: router.calculateHealthScore(context),
        issues: router.identifyIssues(context),
        suggestions: router.generateImprovementSuggestions(context)
      }
    };

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error ejecutando análisis',
      details: error.message
    });
  }
});

// Funciones auxiliares para análisis
router.countFiles = function(structure, count = 0) {
  for (const [key, value] of Object.entries(structure)) {
    if (value.type === 'file') {
      count++;
    } else if (value.type === 'directory' && value.children) {
      count = router.countFiles(value.children, count);
    }
  }
  return count;
};

router.countDirectories = function(structure, count = 0) {
  for (const [key, value] of Object.entries(structure)) {
    if (value.type === 'directory') {
      count++;
      if (value.children) {
        count = router.countDirectories(value.children, count);
      }
    }
  }
  return count;
};

router.generateRecommendations = function(context) {
  const recommendations = [];
  
  // Analizar package.json
  if (context.codebase && context.codebase['package.json']) {
    try {
      const packageData = JSON.parse(context.codebase['package.json'].content);
      
      if (!packageData.scripts?.test) {
        recommendations.push({
          type: 'testing',
          priority: 'medium',
          message: 'Considera agregar tests automatizados'
        });
      }
      
      if (!packageData.scripts?.build) {
        recommendations.push({
          type: 'build',
          priority: 'low',
          message: 'Considera agregar script de build'
        });
      }
    } catch (error) {
      console.error('Error parsing package.json:', error);
    }
  }
  
  // Analizar estructura
  if (!context.structure['README.md']) {
    recommendations.push({
      type: 'documentation',
      priority: 'medium',
      message: 'Agregar documentación README.md'
    });
  }
  
  return recommendations;
};

router.calculateHealthScore = function(context) {
  let score = 100;
  
  // Reducir puntos por problemas identificados
  if (!context.codebase || !context.codebase['package.json']) score -= 20;
  if (!context.structure || !context.structure['README.md']) score -= 10;
  if (!context.technologies || context.technologies.length === 0) score -= 15;
  
  return Math.max(score, 0);
};

router.identifyIssues = function(context) {
  const issues = [];
  
  if (!context.codebase || !context.codebase['package.json']) {
    issues.push({
      severity: 'high',
      type: 'configuration',
      message: 'package.json no encontrado'
    });
  }
  
  if (!context.technologies || context.technologies.length === 0) {
    issues.push({
      severity: 'medium',
      type: 'analysis',
      message: 'Tecnologías no identificadas automáticamente'
    });
  }
  
  return issues;
};

router.generateImprovementSuggestions = function(context) {
  return [
    'Agregar tests automatizados',
    'Implementar CI/CD pipeline',
    'Mejorar documentación',
    'Optimizar estructura de archivos',
    'Actualizar dependencias'
  ];
};

module.exports = router;