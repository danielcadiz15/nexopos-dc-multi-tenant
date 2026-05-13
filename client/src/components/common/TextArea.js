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
        nexo-field min-h-[5rem] resize-y
        ${className}
      `}
      {...props}
    />
  );
};

export default TextArea; 