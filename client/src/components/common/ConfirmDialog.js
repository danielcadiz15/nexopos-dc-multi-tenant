/**
 * Componente de diálogo de confirmación
 * 
 * Muestra un modal para confirmar acciones importantes.
 * 
 * @module components/common/ConfirmDialog
 * @requires react
 */

import React from 'react';
import Button from './Button';
import Spinner from './Spinner';

/**
 * Componente modal para confirmar acciones
 * @param {Object} props - Propiedades del componente
 * @param {boolean} props.isOpen - Si es true, el diálogo se muestra
 * @param {string} props.title - Título del diálogo
 * @param {ReactNode} props.message - Mensaje a mostrar
 * @param {string} props.confirmText - Texto del botón de confirmación
 * @param {string} props.cancelText - Texto del botón de cancelación
 * @param {Function} props.onConfirm - Función a ejecutar al confirmar
 * @param {Function} props.onCancel - Función a ejecutar al cancelar
 * @param {string} props.confirmColor - Color del botón de confirmación
 * @param {boolean} props.loading - Si es true, muestra indicador de carga
 * @returns {JSX.Element} Componente ConfirmDialog
 */
const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  confirmColor = 'primary',
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
        onClick={onCancel}
      >
        {/* Modal */}
        <div 
          className="z-50 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-elevated ring-1 ring-slate-900/5 backdrop-blur-sm"
          onClick={e => e.stopPropagation()}
        >
          {/* Cabecera */}
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          </div>
          
          {/* Cuerpo */}
          <div className="px-6 py-4">
            {typeof message === 'string' ? <p>{message}</p> : message}
          </div>
          
          {/* Pie */}
          <div className="flex justify-end space-x-2 rounded-b-2xl bg-slate-50/80 px-6 py-4">
            {/* Botón cancelar */}
            <Button
              color="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </Button>
            
            {/* Botón confirmar */}
            <Button
              color={confirmColor}
              onClick={onConfirm}
              loading={loading}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmDialog;