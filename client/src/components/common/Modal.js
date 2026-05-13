// src/components/common/Modal.js
import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  closeOnOverlay = true 
}) => {
  // Prevenir scroll cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          onClick={closeOnOverlay ? onClose : undefined}
        />
        
        {/* Spacer */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>
        
        {/* Modal */}
        <div className={`inline-block w-full transform overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 text-left align-bottom shadow-elevated ring-1 ring-slate-900/5 backdrop-blur-sm transition-all sm:my-8 sm:align-middle ${sizeClasses[size]}`}>
          {/* Header */}
          <div className="bg-white/90 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold leading-6 text-slate-900">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="ml-auto rounded-xl bg-white/80 p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-2"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="bg-white/90 px-4 pb-4 sm:p-6 sm:pt-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;