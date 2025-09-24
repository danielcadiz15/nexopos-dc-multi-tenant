/**
 * Componente de indicador de carga
 * 
 * Muestra un spinner animado para indicar carga.
 * 
 * @module components/common/Spinner
 * @requires react
 */

import React from 'react';

/**
 * Componente de spinner para indicar carga
 * @param {Object} props - Propiedades del componente
 * @param {string} props.size - Tamaño del spinner (sm, md, lg)
 * @param {string} props.color - Color del spinner (default, primary, white)
 * @returns {JSX.Element} Componente Spinner
 */
const Spinner = ({ size = 'md', color = 'primary' }) => {
  // Mapeo de tamaños
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };
  
  // Mapeo de colores
  const colorClasses = {
    default: 'text-gray-600',
    primary: 'text-indigo-600',
    white: 'text-white',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

export default Spinner;