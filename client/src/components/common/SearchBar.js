/**
 * Componente de barra de búsqueda
 * 
 * Proporciona un campo de búsqueda con botón y funcionalidad para limpiar.
 * 
 * @module components/common/SearchBar
 * @requires react, react-icons/fa
 */

import React, { forwardRef } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

/**
 * Componente de barra de búsqueda
 * @param {Object} props - Propiedades del componente
 * @param {string} props.value - Valor actual del campo
 * @param {Function} props.onChange - Manejador para cambio de valor
 * @param {Function} props.onSearch - Manejador para iniciar búsqueda
 * @param {Function} props.onClear - Manejador para limpiar el campo
 * @param {string} props.placeholder - Texto de placeholder
 * @param {Function} props.onKeyDown - Manejador para eventos de teclado
 * @returns {JSX.Element} Componente SearchBar
 */
const SearchBar = forwardRef(({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = 'Buscar...',
  onKeyDown,
  ...rest
}, ref) => {
  /**
   * Manejador para tecla Enter
   * @param {Event} e - Evento de teclado
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      e.preventDefault();
      onSearch();
    }
    
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className="flex relative">
      {/* Campo de búsqueda */}
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="
          block w-full rounded-md border-gray-300 shadow-sm
          focus:border-indigo-500 focus:ring-indigo-500 pr-20
          py-2 px-3 border
        "
        {...rest}
      />
      
      {/* Botones de acción */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        {/* Botón para limpiar */}
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="text-gray-400 hover:text-gray-600 mr-1"
            aria-label="Limpiar búsqueda"
          >
            <FaTimes />
          </button>
        )}
        
        {/* Botón para buscar */}
        <button
          type="button"
          onClick={onSearch}
          className="text-gray-600 hover:text-indigo-600"
          aria-label="Buscar"
        >
          <FaSearch />
        </button>
      </div>
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;