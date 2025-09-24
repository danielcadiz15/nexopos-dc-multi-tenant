/**
 * Componente de pestañas
 * 
 * Permite organizar contenido en pestañas navegables.
 * 
 * @module components/common/Tabs
 * @requires react
 * @related_files ../pages/productos/ProductoDetalle.js
 */

import React from 'react';

/**
 * Componente para mostrar pestañas de navegación
 * @param {Object} props - Propiedades del componente
 * @param {Array} props.tabs - Lista de pestañas
 * @param {string} props.activeTab - ID de la pestaña activa
 * @param {Function} props.onChange - Función que se ejecuta al cambiar de pestaña
 * @param {string} props.color - Color de las pestañas (primary, secondary, etc)
 * @param {string} props.size - Tamaño de las pestañas (sm, md, lg)
 * @param {boolean} props.fullWidth - Si las pestañas deben ocupar todo el ancho
 * @returns {JSX.Element} Componente Tabs
 */
const Tabs = ({ 
  tabs = [], 
  activeTab, 
  onChange,
  color = 'primary',
  size = 'md',
  fullWidth = false
}) => {
  // Si no hay pestañas, no renderizar nada
  if (!tabs || tabs.length === 0) {
    return null;
  }
  
  /**
   * Cambia la pestaña activa
   * @param {string} tabId - ID de la pestaña a activar
   */
  const handleTabClick = (tabId) => {
    if (onChange && tabId !== activeTab) {
      onChange(tabId);
    }
  };
  
  /**
   * Obtiene las clases para el contenedor de pestañas
   * @returns {string} Clases CSS
   */
  const getContainerClasses = () => {
    let classes = 'flex border-b border-gray-200 ';
    
    if (fullWidth) {
      classes += 'w-full ';
    }
    
    return classes.trim();
  };
  
  /**
   * Obtiene las clases para una pestaña
   * @param {boolean} isActive - Si la pestaña está activa
   * @returns {string} Clases CSS
   */
  const getTabClasses = (isActive) => {
    let classes = 'py-2 px-4 focus:outline-none flex items-center ';
    
    // Tamaño
    if (size === 'sm') {
      classes += 'text-sm ';
    } else if (size === 'lg') {
      classes += 'text-lg ';
    } else {
      classes += 'text-base ';
    }
    
    // Ancho completo
    if (fullWidth) {
      classes += 'flex-1 justify-center text-center ';
    }
    
    // Estado activo
    if (isActive) {
      classes += `border-b-2 font-medium `;
      
      // Color activo
      if (color === 'secondary') {
        classes += 'border-gray-800 text-gray-800 ';
      } else if (color === 'success') {
        classes += 'border-green-600 text-green-600 ';
      } else if (color === 'danger') {
        classes += 'border-red-600 text-red-600 ';
      } else if (color === 'warning') {
        classes += 'border-yellow-600 text-yellow-600 ';
      } else {
        classes += 'border-indigo-600 text-indigo-600 ';
      }
    } else {
      classes += 'text-gray-500 hover:text-gray-700 hover:border-gray-300 border-b-2 border-transparent ';
    }
    
    return classes.trim();
  };

  return (
    <div className={getContainerClasses()}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={getTabClasses(tab.id === activeTab)}
          onClick={() => handleTabClick(tab.id)}
          type="button"
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;