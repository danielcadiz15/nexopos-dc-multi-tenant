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
      ? 'border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50/90'
      : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500',
    secondary: outline
      ? 'border-2 border-slate-400 text-slate-700 hover:bg-slate-50'
      : 'bg-slate-600 text-white hover:bg-slate-700',
    success: outline
      ? 'border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50'
      : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-500',
    danger: outline
      ? 'border-2 border-red-500 text-red-600 hover:bg-red-50'
      : 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/20 hover:from-red-500 hover:to-rose-500',
    warning: outline
      ? 'border-2 border-amber-400 text-amber-800 hover:bg-amber-50'
      : 'bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 shadow-md hover:from-amber-300 hover:to-orange-400',
    info: outline
      ? 'border-2 border-sky-500 text-sky-700 hover:bg-sky-50'
      : 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md shadow-sky-500/20 hover:from-sky-500 hover:to-cyan-500',
  };

  // Mapeo de tamaños
  const sizeClasses = {
    sm: 'py-1 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
  };

  // Clases base
  let buttonClasses = `
    font-semibold rounded-xl transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
    ${colorClasses[color] || colorClasses.primary}
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