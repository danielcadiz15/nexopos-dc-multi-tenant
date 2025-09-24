// src/pages/vehiculos/CargaCombustible.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';

// Servicios
import vehiculosService from '../../services/vehiculos.service';

// Componentes
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaSave, FaTimes, FaGasPump, FaCalendarAlt, 
  FaRoad, FaDollarSign, FaMapMarkerAlt
} from 'react-icons/fa';

/**
 * Modal para registrar cargas de combustible
 */
const CargaCombustible = ({ vehiculoId, kmActual, onClose, onSuccess }) => {
  // Estado del formulario
  const [formData, setFormData] = useState({
    vehiculo_id: vehiculoId,
    fecha: new Date().toISOString().split('T')[0],
    litros: '',
    monto: '',
    km_carga: kmActual || 0,
    estacion: '',
    tipo_combustible: 'nafta'
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
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
    
    // Calcular precio por litro automáticamente
    if ((name === 'litros' || name === 'monto') && formData.litros && formData.monto) {
      const litros = name === 'litros' ? parseFloat(value) : parseFloat(formData.litros);
      const monto = name === 'monto' ? parseFloat(value) : parseFloat(formData.monto);
      
      if (litros > 0 && monto > 0) {
        const precioLitro = monto / litros;
        // Actualizar visualmente el precio por litro (no es parte del form)
      }
    }
  };
  
  /**
   * Valida el formulario
   */
  const validarFormulario = () => {
    const nuevosErrores = {};
    
    if (!formData.litros || parseFloat(formData.litros) <= 0) {
      nuevosErrores.litros = 'Los litros deben ser mayor a 0';
    }
    
    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      nuevosErrores.monto = 'El monto debe ser mayor a 0';
    }
    
    if (!formData.km_carga || parseInt(formData.km_carga) <= kmActual) {
      nuevosErrores.km_carga = `El kilometraje debe ser mayor a ${kmActual} km`;
    }
    
    if (!formData.fecha) {
      nuevosErrores.fecha = 'La fecha es requerida';
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
      
      const datosCarga = {
        ...formData,
        litros: parseFloat(formData.litros),
        monto: parseFloat(formData.monto),
        km_carga: parseInt(formData.km_carga)
      };
      
      await vehiculosService.registrarCombustible(datosCarga);
      
      toast.success('Carga de combustible registrada correctamente');
      onSuccess();
    } catch (error) {
      console.error('Error al registrar carga:', error);
      
      if (error.message.includes('kilometraje')) {
        setErrors({ km_carga: error.message });
      } else {
        toast.error('Error al registrar la carga de combustible');
      }
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Calcula el precio por litro
   */
  const calcularPrecioLitro = () => {
    const litros = parseFloat(formData.litros);
    const monto = parseFloat(formData.monto);
    
    if (litros > 0 && monto > 0) {
      return (monto / litros).toFixed(2);
    }
    
    return '0.00';
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            <FaGasPump className="inline mr-2" />
            Nueva Carga de Combustible
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
            
            {/* Kilometraje */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaRoad className="inline mr-2" />
                Kilometraje Actual
              </label>
              <input
                type="number"
                name="km_carga"
                value={formData.km_carga}
                onChange={handleChange}
                min={kmActual + 1}
                className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.km_carga ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder={`Mayor a ${kmActual} km`}
              />
              {errors.km_carga && (
                <p className="mt-1 text-sm text-red-600">{errors.km_carga}</p>
              )}
            </div>
            
            {/* Tipo de combustible */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Combustible
              </label>
              <select
                name="tipo_combustible"
                value={formData.tipo_combustible}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="nafta">Nafta</option>
                <option value="diesel">Diesel</option>
                <option value="gnc">GNC</option>
              </select>
            </div>
            
            {/* Litros y Monto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Litros
                </label>
                <input
                  type="number"
                  name="litros"
                  value={formData.litros}
                  onChange={handleChange}
                  step="0.01"
                  min="0.01"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.litros ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.litros && (
                  <p className="mt-1 text-sm text-red-600">{errors.litros}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaDollarSign className="inline mr-1" />
                  Monto Total
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
            
            {/* Precio por litro calculado */}
            {formData.litros && formData.monto && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-600">
                  Precio por litro: <span className="font-semibold">${calcularPrecioLitro()}</span>
                </p>
              </div>
            )}
            
            {/* Estación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaMapMarkerAlt className="inline mr-2" />
                Estación de Servicio (Opcional)
              </label>
              <input
                type="text"
                name="estacion"
                value={formData.estacion}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="YPF, Shell, etc."
              />
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

export default CargaCombustible;