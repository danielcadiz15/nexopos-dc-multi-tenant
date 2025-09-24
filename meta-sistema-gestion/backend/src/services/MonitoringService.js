const cron = require('node-cron');
const SystemRegistry = require('./SystemRegistry');

class MonitoringService {
  constructor() {
    this.isRunning = false;
    this.metrics = new Map();
    this.alerts = [];
    this.io = null;
  }

  initialize(io) {
    this.io = io;
    this.startMonitoring();
    console.log('📊 Servicio de monitoreo iniciado');
  }

  startMonitoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // En desarrollo, deshabilitar tareas automáticas para evitar reinicios
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔧 Monitoreo automático deshabilitado (modo desarrollo)');
      return;
    }
    
    // Monitoreo cada 30 segundos
    cron.schedule('*/30 * * * * *', () => {
      this.checkSystemsHealth();
    });

    // Limpiar métricas antiguas cada hora
    cron.schedule('0 * * * *', () => {
      this.cleanOldMetrics();
    });
  }

  async checkSystemsHealth() {
    const systems = SystemRegistry.getAllSystems();
    
    for (const system of systems) {
      try {
        const health = await this.checkSystemHealth(system);
        this.updateMetrics(system.id, health);
        
        // Detectar problemas y enviar alertas
        if (health.status === 'error' || health.status === 'warning') {
          this.sendAlert(system, health);
        }
      } catch (error) {
        console.error(`Error monitoreando sistema ${system.name}:`, error);
      }
    }
  }

  async checkSystemHealth(system) {
    const health = {
      systemId: system.id,
      timestamp: new Date().toISOString(),
      status: 'healthy',
      metrics: {
        responseTime: Math.random() * 100 + 50, // Simulado
        memoryUsage: Math.random() * 80 + 10,   // Simulado
        cpuUsage: Math.random() * 60 + 10,      // Simulado
        diskUsage: Math.random() * 40 + 20      // Simulado
      },
      checks: []
    };

    // Aquí se harían checks reales del sistema
    // Por ahora simulamos algunos checks básicos
    
    if (health.metrics.memoryUsage > 85) {
      health.status = 'warning';
      health.checks.push({
        name: 'Memoria',
        status: 'warning',
        message: 'Uso de memoria alto'
      });
    }

    if (health.metrics.cpuUsage > 90) {
      health.status = 'error';
      health.checks.push({
        name: 'CPU',
        status: 'error',
        message: 'Uso de CPU crítico'
      });
    }

    return health;
  }

  updateMetrics(systemId, health) {
    if (!this.metrics.has(systemId)) {
      this.metrics.set(systemId, []);
    }

    const systemMetrics = this.metrics.get(systemId);
    systemMetrics.push(health);

    // Mantener solo las últimas 100 métricas por sistema
    if (systemMetrics.length > 100) {
      systemMetrics.shift();
    }

    // Emitir métricas en tiempo real
    if (this.io) {
      this.io.emit('metrics-update', {
        systemId,
        metrics: health.metrics,
        timestamp: health.timestamp
      });
    }
  }

  sendAlert(system, health) {
    const alert = {
      id: `alert_${Date.now()}`,
      systemId: system.id,
      systemName: system.name,
      type: health.status,
      message: `Sistema ${system.name}: ${health.checks.map(c => c.message).join(', ')}`,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alerts.push(alert);

    // Emitir alerta
    if (this.io) {
      this.io.emit('system-alert', alert);
    }

    // Mantener solo las últimas 50 alertas
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }
  }

  getSystemMetrics(systemId, timeRange = '1h') {
    const systemMetrics = this.metrics.get(systemId) || [];
    const now = new Date();
    let cutoffTime;

    switch (timeRange) {
      case '1h':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
    }

    return systemMetrics.filter(metric => 
      new Date(metric.timestamp) >= cutoffTime
    );
  }

  getAlerts(systemId = null, resolved = null) {
    let filteredAlerts = this.alerts;

    if (systemId) {
      filteredAlerts = filteredAlerts.filter(alert => alert.systemId === systemId);
    }

    if (resolved !== null) {
      filteredAlerts = filteredAlerts.filter(alert => alert.resolved === resolved);
    }

    return filteredAlerts.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      
      if (this.io) {
        this.io.emit('alert-resolved', alert);
      }
      
      return true;
    }
    return false;
  }

  cleanOldMetrics() {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas
    
    for (const [systemId, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(metric => 
        new Date(metric.timestamp) >= cutoffTime
      );
      this.metrics.set(systemId, filteredMetrics);
    }

    console.log('🧹 Métricas antiguas limpiadas');
  }

  getOverview() {
    const systems = SystemRegistry.getAllSystems();
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const overview = {
      totalSystems: systems.length,
      healthySystems: 0,
      warningSystems: 0,
      errorSystems: 0,
      recentAlerts: this.getAlerts().filter(alert => 
        new Date(alert.timestamp) >= oneHourAgo && !alert.resolved
      ).length,
      avgResponseTime: 0,
      avgMemoryUsage: 0,
      avgCpuUsage: 0
    };

    let totalResponseTime = 0;
    let totalMemoryUsage = 0;
    let totalCpuUsage = 0;
    let systemsWithMetrics = 0;

    for (const system of systems) {
      const recentMetrics = this.getSystemMetrics(system.id, '1h');
      
      if (recentMetrics.length > 0) {
        const latestMetric = recentMetrics[recentMetrics.length - 1];
        
        switch (latestMetric.status) {
          case 'healthy':
            overview.healthySystems++;
            break;
          case 'warning':
            overview.warningSystems++;
            break;
          case 'error':
            overview.errorSystems++;
            break;
        }

        totalResponseTime += latestMetric.metrics.responseTime;
        totalMemoryUsage += latestMetric.metrics.memoryUsage;
        totalCpuUsage += latestMetric.metrics.cpuUsage;
        systemsWithMetrics++;
      }
    }

    if (systemsWithMetrics > 0) {
      overview.avgResponseTime = Math.round(totalResponseTime / systemsWithMetrics);
      overview.avgMemoryUsage = Math.round(totalMemoryUsage / systemsWithMetrics);
      overview.avgCpuUsage = Math.round(totalCpuUsage / systemsWithMetrics);
    }

    return overview;
  }

  cleanOldMetrics() {
    console.log('🧹 Métricas antiguas limpiadas');
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    for (const [systemId, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(metric => {
        return (now - new Date(metric.timestamp).getTime()) < maxAge;
      });
      this.metrics.set(systemId, filteredMetrics);
    }

    // Limpiar alertas antiguas (más de 7 días)
    const alertMaxAge = 7 * 24 * 60 * 60 * 1000;
    this.alerts = this.alerts.filter(alert => {
      return (now - new Date(alert.timestamp).getTime()) < alertMaxAge;
    });
  }

  stop() {
    this.isRunning = false;
    console.log('📊 Servicio de monitoreo detenido');
  }
}

module.exports = new MonitoringService();