/**
 * Componente de botón reutilizable
 * 
 * Proporciona un botón estilizado con diferentes variantes de color,
 * tamaño y capacidad para mostrar iconos.
 * 
 * @module components/common/Button
 * @requires react
 */

import React from 'react';

/**
 * Componente de botón personalizado
 * @param {Object} props - Propiedades del componente
 * @param {ReactNode} props.children - Contenido del botón
 * @param {ReactNode} props.icon - Icono opcional
 * @param {string} props.color - Color del botón (primary, secondary, success, danger, warning)
 * @param {string} props.size - Tamaño del botón (sm, md, lg)
 * @param {boolean} props.small - Atajo para size="sm" (DEPRECATED: usar size="sm")
 * @param {boolean} props.outline - Si es true, se muestra solo el contorno
 * @param {boolean} props.fullWidth - Si es true, ocupa todo el ancho disponible
 * @param {boolean} props.loading - Si es true, muestra un indicador de carga
 * @param {Function} props.onClick - Función a ejecutar al hacer clic
 * @param {boolean} props.disabled - Si es true, el botón estará deshabilitado
 * @param {string} props.type - Tipo de botón (button, submit, reset)
 * @returns {JSX.Element} Componente Button
 */
const Button = ({
  children,
  icon,
  color = 'primary',
  size = 'md',
  small, // ✅ Agregamos small como prop
  outline = false,
  fullWidth = false,
  loading = false,
  onClick,
  disabled = false,
  type = 'button',
  ...rest // ✅ small ya no llegará al DOM
}) => {
  // ✅ Si small=true, forzar size="sm"
  const finalSize = small ? 'sm' : size;

  // Mapeo de colores
  const colorClasses = {
    primary: outline
      ? 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'
      : 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: outline
      ? 'border-gray-600 text-gray-600 hover:bg-gray-50'
      : 'bg-gray-600 hover:bg-gray-700 text-white',
    success: outline
      ? 'border-green-600 text-green-600 hover:bg-green-50'
      : 'bg-green-600 hover:bg-green-700 text-white',
    danger: outline
      ? 'border-red-600 text-red-600 hover:bg-red-50'
      : 'bg-red-600 hover:bg-red-700 text-white',
    warning: outline
      ? 'border-yellow-500 text-yellow-600 hover:bg-yellow-50'
      : 'bg-yellow-500 hover:bg-yellow-600 text-white',
  };

  // Mapeo de tamaños
  const sizeClasses = {
    sm: 'py-1 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
  };

  // Clases base
  let buttonClasses = `
    font-medium rounded-md transition-colors
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
    ${colorClasses[color]}
    ${sizeClasses[finalSize]} 
    ${outline ? 'border' : ''}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'opacity-60 cursor-not-allowed' : ''}
    flex items-center justify-center
  `;

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
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
          <span>Cargando...</span>
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;