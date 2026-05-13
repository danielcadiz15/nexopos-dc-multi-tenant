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
    <div className="relative flex">
      {/* Campo de búsqueda */}
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="nexo-field pr-20"
        {...rest}
      />
      
      {/* Botones de acción */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        {/* Botón para limpiar */}
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="mr-1 text-slate-400 hover:text-slate-600"
            aria-label="Limpiar búsqueda"
          >
            <FaTimes />
          </button>
        )}
        
        {/* Botón para buscar */}
        <button
          type="button"
          onClick={onSearch}
          className="text-slate-500 hover:text-indigo-600"
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