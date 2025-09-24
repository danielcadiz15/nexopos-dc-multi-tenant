// Configuración específica para la app móvil
export const mobileConfig = {
  // Configuración de la interfaz móvil
  ui: {
    // Tamaños de botones para móviles
    buttonSizes: {
      small: 'px-3 py-2 text-sm',
      medium: 'px-4 py-3 text-base',
      large: 'px-6 py-4 text-lg'
    },
    
    // Colores específicos para móviles
    colors: {
      primary: '#3B82F6',
      secondary: '#6B7280',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#06B6D4'
    },
    
    // Espaciado para móviles
    spacing: {
      xs: '0.5rem',
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
      xl: '3rem'
    }
  },
  
  // Configuración de funcionalidades móviles
  features: {
    // Habilitar gestos táctiles
    touchGestures: true,
    
    // Habilitar vibración en feedback
    hapticFeedback: true,
    
    // Tamaño mínimo para elementos táctiles
    minTouchTarget: 44,
    
    // Tiempo de espera para acciones táctiles
    touchDelay: 300
  },
  
  // Configuración de rendimiento
  performance: {
    // Lazy loading de imágenes
    lazyLoading: true,
    
    // Compresión de imágenes
    imageCompression: true,
    
    // Cache de datos
    dataCache: true,
    
    // Tiempo de timeout para requests
    requestTimeout: 10000
  },
  
  // Configuración de navegación
  navigation: {
    // Animaciones de transición
    animations: true,
    
    // Historial de navegación
    historyLimit: 10,
    
    // Navegación por gestos
    gestureNavigation: true
  },
  
  // Configuración de sincronización
  sync: {
    // Intervalo de sincronización (ms)
    interval: 30000,
    
    // Sincronización automática
    autoSync: true,
    
    // Sincronización en segundo plano
    backgroundSync: true
  }
};

// Configuración específica por plataforma
export const platformConfig = {
  android: {
    // Configuraciones específicas de Android
    statusBar: {
      style: 'dark',
      backgroundColor: '#ffffff'
    },
    splash: {
      backgroundColor: '#ffffff',
      showSpinner: true
    }
  },
  
  ios: {
    // Configuraciones específicas de iOS
    statusBar: {
      style: 'dark',
      backgroundColor: '#ffffff'
    },
    splash: {
      backgroundColor: '#ffffff',
      showSpinner: true
    }
  }
};

// Configuración de desarrollo móvil
export const developmentConfig = {
  // Habilitar logs detallados en desarrollo
  verboseLogging: process.env.NODE_ENV === 'development',
  
  // Simular conexión lenta
  simulateSlowConnection: false,
  
  // Simular errores de red
  simulateNetworkErrors: false,
  
  // Mostrar información de rendimiento
  showPerformanceInfo: process.env.NODE_ENV === 'development'
};

export default {
  mobileConfig,
  platformConfig,
  developmentConfig
}; 