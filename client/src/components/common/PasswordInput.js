import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

/**
 * Campo contraseña con botón para mostrar/ocultar (ojo).
 *
 * @param {React.ReactNode} [props.leftSlot] — Icono a la izquierda (ej. FaLock, FaKey)
 */
const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  className = '',
  autoComplete = 'current-password',
  disabled = false,
  leftSlot = null,
  ...rest
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {leftSlot ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          {leftSlot}
        </div>
      ) : null}
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        disabled={disabled}
        placeholder={placeholder}
        className={[leftSlot ? 'pl-10' : '', 'pr-11', className].filter(Boolean).join(' ')}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 transition-colors hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 rounded-r-xl"
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        tabIndex={0}
      >
        {visible ? (
          <FaEyeSlash className="h-5 w-5" aria-hidden />
        ) : (
          <FaEye className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  );
};

export default PasswordInput;
