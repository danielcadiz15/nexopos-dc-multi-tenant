// src/config/empresaConfig.js
// Configuración específica para NexoPOS DC

export const EMPRESA_CONFIG = {
  // Información de la empresa
  nombre: 'NexoPOS DC',
  id: 'nexoposdc',
  
  // Módulos activos (true = activo, false = oculto)
  modulos: {
    // CORE - Siempre activos
    dashboard: true,
    productos: true,
    ventas: true,
    clientes: true,
    stock: true,
    usuarios: true,
    
    // OPCIONALES - Configura según la empresa
    compras: true,        // Sistema de compras y proveedores
    produccion: true,     // Materias primas y recetas
    vehiculos: false,     // Control de flota
    reportes: true,       // Reportes avanzados
    promociones: true,    // Sistema de promociones
    finanzas: true,       // Caja y gastos
    devoluciones: true,   // Gestión de devoluciones
    auditoria: true,      // Logs de auditoría
    transferencias: false, // Transferencias entre sucursales
    listas_precios: true  // Múltiples listas de precios
  },
  
  // Configuraciones adicionales
  configuraciones: {
    manejaMultiplesSucursales: false,
    requiereAprobacionCompras: false,
    permiteVentasCredito: true,
    diasCreditoDefault: 30,
    permiteDescuentos: true,
    descuentoMaximo: 20, // porcentaje
    manejaInventarioNegativo: false,
    requiereClienteEnVenta: false
  },
  
  // Personalización visual
  tema: {
    colorPrimario: 'green',
    mostrarLogoSidebar: true,
    nombreCorto: 'NexoPOS DC'
  }
};

// Función helper para verificar si un módulo está activo
export const moduloActivo = (modulo) => {
  return EMPRESA_CONFIG.modulos[modulo] === true;
};

// Función helper para obtener configuración
export const getConfiguracion = (key) => {
  return EMPRESA_CONFIG.configuraciones[key];
};