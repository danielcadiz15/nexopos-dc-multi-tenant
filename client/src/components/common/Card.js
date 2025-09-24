/**
 * Componente de tarjeta
 * 
 * Proporciona un contenedor estilizado para mostrar información.
 * 
 * @module components/common/Card
 * @requires react
 */

import React from 'react';

/**
 * Componente de tarjeta reutilizable
 * @param {Object} props - Propiedades del componente
 * @param {ReactNode} props.children - Contenido de la tarjeta
 * @param {string} props.title - Título opcional de la tarjeta
 * @param {ReactNode} props.icon - Icono opcional para el título
 * @param {ReactNode} props.actions - Acciones opcionales en la cabecera (botones, etc.)
 * @param {boolean} props.noPadding - Si es true, elimina el padding interno
 * @returns {JSX.Element} Componente Card
 */
const Card = ({ 
  children, 
  title, 
  icon, 
  actions,
  noPadding = false
}) => {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Cabecera con título y acciones */}
      {(title || actions) && (
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          {/* Título con icono opcional */}
          {title && (
            <h3 className="text-lg font-medium text-gray-700 flex items-center">
              {icon && <span className="mr-2">{icon}</span>}
              {title}
            </h3>
          )}
          
          {/* Acciones opcionales */}
          {actions && <div>{actions}</div>}
        </div>
      )}
      
      {/* Contenido principal */}
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  );
};

export default Card;