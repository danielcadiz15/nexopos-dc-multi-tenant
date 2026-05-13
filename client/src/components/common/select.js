// src/components/common/Select.js - Si no existe, créalo
import React from 'react';

const Select = ({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder = "Seleccionar...",
  required = false,
  error = '',
  disabled = false 
}) => {
  return (
    <div>
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        className={`
          nexo-field
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}
          ${disabled ? 'bg-slate-100' : ''}
        `}
        required={required}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {(options || []).map((option) => (
          <option key={option.value || option.id} value={option.value || option.id}>
            {option.label || option.nombre}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select;