// Obtener el estado visual de la planta según la prioridad y completado
export const obtenerEstadoPlanta = (tarea) => {
  if (tarea.completada) return 'tree'; // Árbol maduro
  if (tarea.prioridad === 'alta') return 'leaf'; // Hoja creciendo
  return 'seedling'; // Semilla
};

// Obtener color según prioridad
export const obtenerColorPrioridad = (prioridad) => {
  switch (prioridad) {
    case 'alta': return 'text-red-600';
    case 'media': return 'text-yellow-600';
    case 'baja': return 'text-green-600';
    default: return 'text-blue-600';
  }
};

// Obtener color de fondo según prioridad
export const obtenerBgPrioridad = (prioridad) => {
  switch (prioridad) {
    case 'alta': return 'bg-red-50 border-red-200';
    case 'media': return 'bg-yellow-50 border-yellow-200';
    case 'baja': return 'bg-green-50 border-green-200';
    default: return 'bg-blue-50 border-blue-200';
  }
};

// Calcular días restantes
export const calcularDiasRestantes = (fechaLimite) => {
  if (!fechaLimite) return null;
  const hoy = new Date();
  const limite = new Date(fechaLimite);
  const diffTime = limite - hoy;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Obtener texto de días restantes
export const obtenerTextoDias = (dias) => {
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} días`;
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Vence en ${dias} días`;
};

// Obtener color de días restantes
export const obtenerColorDias = (dias) => {
  if (dias < 0) return 'text-red-600';
  if (dias <= 1) return 'text-orange-600';
  if (dias <= 3) return 'text-yellow-600';
  return 'text-green-600';
}; 