// Obtener color según impacto
export const obtenerColorImpacto = (impacto) => {
  switch (impacto) {
    case 'alto': return 'text-red-600 bg-red-50 border-red-200';
    case 'medio': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'bajo': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};

// Obtener color según estado
export const obtenerColorEstado = (estado) => {
  switch (estado) {
    case 'implementada': return 'text-green-600 bg-green-100 border-green-300';
    case 'en_proceso': return 'text-blue-600 bg-blue-100 border-blue-300';
    case 'evaluando': return 'text-purple-600 bg-purple-100 border-purple-300';
    case 'nueva': return 'text-gray-600 bg-gray-100 border-gray-300';
    default: return 'text-gray-600 bg-gray-100 border-gray-300';
  }
};

// Obtener icono según categoría
export const obtenerIconoCategoria = (categoria) => {
  switch (categoria) {
    case 'producto': return '📦';
    case 'proceso': return '⚙️';
    case 'tecnologia': return '💻';
    case 'marketing': return '📢';
    case 'servicio': return '🛠️';
    case 'organizacional': return '🏢';
    default: return '💡';
  }
}; 