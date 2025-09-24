// src/components/modules/ventas/ConfiguracionMargenesModal.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaTimes, FaSave, FaPercent, FaCalculator } from 'react-icons/fa';
import Button from '../../common/Button';

const ConfiguracionMargenesModal = ({ isOpen, onClose, onSave }) => {
  const [margenes, setMargenes] = useState({
    mayorista: 30,
    interior: 40,
    posadas: 50
  });
  
  const [loading, setLoading] = useState(false);
  
  // Cargar configuración guardada al abrir
  useEffect(() => {
    if (isOpen) {
      // Cargar desde localStorage o desde una configuración global
      const margenesGuardados = localStorage.getItem('margenes_listas');
      if (margenesGuardados) {
        setMargenes(JSON.parse(margenesGuardados));
      }
    }
  }, [isOpen]);
  
  const handleMargenChange = (lista, valor) => {
    setMargenes(prev => ({
      ...prev,
      [lista]: parseFloat(valor) || 0
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Guardar en localStorage
      localStorage.setItem('margenes_listas', JSON.stringify(margenes));
      
      // Llamar callback con los márgenes
      if (onSave) {
        await onSave(margenes);
      }
      
      toast.success('Márgenes configurados correctamente');
      onClose();
    } catch (error) {
      console.error('Error al guardar márgenes:', error);
      toast.error('Error al configurar márgenes');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <FaPercent className="mr-2" />
            Configurar Márgenes por Lista
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Configure los porcentajes de margen que se aplicarán sobre el precio de costo 
              para calcular automáticamente los precios de cada lista.
            </p>
            
            {Object.entries(margenes).map(([lista, margen]) => (
              <div key={lista} className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 capitalize w-32">
                  {lista}:
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={margen}
                    onChange={(e) => handleMargenChange(lista, e.target.value)}
                    className="w-20 border rounded px-2 py-1 text-right"
                    step="0.1"
                    min="0"
                  />
                  <span className="ml-1">%</span>
                </div>
                <div className="text-sm text-gray-500 ml-4">
                  {`(x${(1 + margen/100).toFixed(2)})`}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 bg-blue-50 p-3 rounded">
            <p className="text-xs text-blue-800">
              <strong>Ejemplo:</strong> Si el costo es $100 y el margen es 40%, 
              el precio será $140
            </p>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" color="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              color="primary" 
              icon={<FaSave />}
              loading={loading}
            >
              Guardar Configuración
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfiguracionMargenesModal;