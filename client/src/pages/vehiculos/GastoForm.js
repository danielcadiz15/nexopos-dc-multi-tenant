// src/pages/vehiculos/GastoForm.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';

// Servicios
import vehiculosService from '../../services/vehiculos.service';

// Componentes
import Button from '../../components/common/Button';

// Iconos
import { 
  FaSave, FaTimes, FaDollarSign, FaCalendarAlt, 
  FaClipboardList, FaShieldAlt, FaFileAlt, FaExclamationTriangle,
  FaShower, FaTag
} from 'react-icons/fa';

/**
 * Modal para registrar gastos varios del vehículo
 */
const GastoForm = ({ vehiculoId, onClose, onSuccess }) => {
  // Estado del formulario
  const [formData, setFormData] = useState({
    vehiculo_id: vehiculoId,
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'seguro',
    concepto: '',
    monto: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Categorías de gastos con iconos
  const categoriasGasto = [
    { value: 'seguro', label: 'Seguro', icon: <FaShieldAlt /> },
    { value: 'patente', label: 'Patente', icon: <FaFileAlt /> },
    { value: 'multas', label: 'Multas', icon: <FaExclamationTriangle /> },
    { value: 'lavado', label: 'Lavado', icon: <FaShower /> },
    { value: 'otros', label: 'Otros', icon: <FaTag /> }
  ];
  
  /**
   * Maneja los cambios en los campos
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  /**
   * Valida el formulario
   */
  const validarFormulario = () => {
    const nuevosErrores = {};
    
    if (!formData.categoria) {
      nuevosErrores.categoria = 'La categoría es requerida';
    }
    
    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      nuevosErrores.monto = 'El monto debe ser mayor a 0';
    }
    
    if (!formData.fecha) {
      nuevosErrores.fecha = 'La fecha es requerida';
    }
    
    if (!formData.concepto.trim() && formData.categoria === 'otros') {
      nuevosErrores.concepto = 'El concepto es requerido para gastos "Otros"';
    }
    
    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };
  
  /**
   * Maneja el envío del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Generar concepto automático si no se especificó
      let concepto = formData.concepto.trim();
      if (!concepto) {
        const categoria = categoriasGasto.find(c => c.value === formData.categoria);
        concepto = `${categoria.label} - ${new Date(formData.fecha).toLocaleDateString()}`;
      }
      
      const datosGasto = {
        ...formData,
        concepto,
        monto: parseFloat(formData.monto)
      };
      
      await vehiculosService.registrarGasto(datosGasto);
      
      toast.success('Gasto registrado correctamente');
      onSuccess();
    } catch (error) {
      console.error('Error al registrar gasto:', error);
      toast.error('Error al registrar el gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            <FaDollarSign className="inline mr-2" />
            Nuevo Gasto
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FaTimes />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaCalendarAlt className="inline mr-2" />
                Fecha
              </label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.fecha ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.fecha && (
                <p className="mt-1 text-sm text-red-600">{errors.fecha}</p>
              )}
            </div>
            
            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categoriasGasto.map(categoria => (
                  <button
                    key={categoria.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, categoria: categoria.value }))}
                    className={`flex items-center justify-center space-x-2 p-3 border rounded-md transition-colors ${
                      formData.categoria === categoria.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-xl">{categoria.icon}</span>
                    <span className="text-sm font-medium">{categoria.label}</span>
                  </button>
                ))}
              </div>
              {errors.categoria && (
                <p className="mt-1 text-sm text-red-600">{errors.categoria}</p>
              )}
            </div>
            
            {/* Concepto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaClipboardList className="inline mr-2" />
                Concepto {formData.categoria === 'otros' ? '(Requerido)' : '(Opcional)'}
              </label>
              <input
                type="text"
                name="concepto"
                value={formData.concepto}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.concepto ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={
                  formData.categoria === 'seguro' ? 'Ej: Póliza mensual' :
                  formData.categoria === 'patente' ? 'Ej: Cuota 1/4' :
                  formData.categoria === 'multas' ? 'Ej: Exceso de velocidad' :
                  formData.categoria === 'lavado' ? 'Ej: Lavado completo' :
                  'Describe el gasto'
                }
              />
              {errors.concepto && (
                <p className="mt-1 text-sm text-red-600">{errors.concepto}</p>
              )}
            </div>
            
            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaDollarSign className="inline mr-1" />
                Monto
              </label>
              <input
                type="number"
                name="monto"
                value={formData.monto}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.monto ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.monto && (
                <p className="mt-1 text-sm text-red-600">{errors.monto}</p>
              )}
            </div>
          </div>
          
          {/* Botones */}
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              type="button"
              color="secondary"
              onClick={onClose}
              disabled={loading}
            >
              <FaTimes className="mr-2" />
              Cancelar
            </Button>
            
            <Button
              type="submit"
              color="primary"
              loading={loading}
              disabled={loading}
            >
              <FaSave className="mr-2" />
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GastoForm;