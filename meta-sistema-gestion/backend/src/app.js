const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

// Importar rutas y middlewares
const systemRoutes = require('./routes/systems');
const codeRoutes = require('./routes/code');
const deployRoutes = require('./routes/deploy');
const monitoringRoutes = require('./routes/monitoring');
const templateRoutes = require('./routes/templates');
const { router: authRoutes } = require('./routes/auth');
const aiRoutes = require('./routes/ai');

// Importar servicios
const SystemRegistry = require('./services/SystemRegistry');
const MonitoringService = require('./services/MonitoringService');
const DeployService = require('./services/DeployService');
const AIAssistant = require('./services/AIAssistant');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Socket.IO para comunicación en tiempo real
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);
  
  socket.on('join-system', (systemId) => {
    socket.join(`system-${systemId}`);
    console.log(`📡 Cliente ${socket.id} unido al sistema: ${systemId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Hacer io disponible en las rutas
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/systems', systemRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/ai', aiRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    systems: SystemRegistry.getAllSystems().length
  });
});

// Servir archivos estáticos del frontend (en producción)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
}

// Manejador de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Manejador de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

// Inicializar servicios
async function initializeServices() {
  try {
    console.log('🚀 Inicializando Meta Sistema de Gestión...');
    
    // Inicializar el registro de sistemas
    await SystemRegistry.initialize();
    console.log('✅ Sistema de registro inicializado');
    
    // Inicializar servicio de monitoreo
    MonitoringService.initialize(io);
    console.log('✅ Servicio de monitoreo inicializado');
    
    // Inicializar servicio de despliegue
    DeployService.initialize(io);
    console.log('✅ Servicio de despliegue inicializado');
    
    // Inicializar AI Assistant
    await AIAssistant.initialize();
    console.log('✅ AI Assistant inicializado');
    
    console.log('🎉 Todos los servicios inicializados correctamente');
    
  } catch (error) {
    console.error('❌ Error inicializando servicios:', error);
    process.exit(1);
  }
}

// Iniciar servidor
server.listen(PORT, async () => {
  console.log(`🚀 Meta Sistema de Gestión ejecutándose en puerto ${PORT}`);
  console.log(`📊 Dashboard disponible en: http://localhost:${PORT}`);
  console.log(`🔧 API disponible en: http://localhost:${PORT}/api`);
  
  await initializeServices();
});

// Manejo graceful de cierre
process.on('SIGTERM', () => {
  console.log('🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

module.exports = app;