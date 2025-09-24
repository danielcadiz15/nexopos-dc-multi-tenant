/**
 * Componente TextArea reutilizable
 * 
 * @module components/common/TextArea
 * @requires react
 */

import React from 'react';

const TextArea = ({ 
  value, 
  onChange, 
  placeholder = '', 
  rows = 3, 
  className = '', 
  required = false,
  disabled = false,
  maxLength,
  ...props 
}) => {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      required={required}
      disabled={disabled}
      maxLength={maxLength}
      className={`
        w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
        placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:bg-gray-100 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    />
  );
};

export default TextArea; 