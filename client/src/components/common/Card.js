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
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-900/5 ring-1 ring-slate-900/[0.04]">
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3 sm:px-5">
          {title && (
            <h3 className="flex items-center text-base font-semibold tracking-tight text-slate-800 sm:text-lg">
              {icon && <span className="mr-2 text-indigo-500">{icon}</span>}
              {title}
            </h3>
          )}
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}

      <div className={noPadding ? '' : 'p-4 sm:p-5'}>{children}</div>
    </div>
  );
};

export default Card;