// src/pages/vehiculos/ServicioForm.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';

// Servicios
import vehiculosService from '../../services/vehiculos.service';

// Componentes
import Button from '../../components/common/Button';

// Iconos
import { 
  FaSave, FaTimes, FaTools, FaCalendarAlt, 
  FaRoad, FaDollarSign, FaBuilding, FaClipboardList
} from 'react-icons/fa';

/**
 * Modal para registrar servicios y mantenimientos
 */
const ServicioForm = ({ vehiculoId, kmActual, onClose, onSuccess }) => {
  // Estado del formulario
  const [formData, setFormData] = useState({
    vehiculo_id: vehiculoId,
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'aceite',
    descripcion: '',
    km_servicio: kmActual || 0,
    monto: '',
    taller: '',
    proximo_km: '',
    proximo_fecha: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Tipos de servicio predefinidos
  const tiposServicio = [
    { value: 'aceite', label: 'Cambio de Aceite', proximoKm: 10000 },
    { value: 'filtros', label: 'Cambio de Filtros', proximoKm: 15000 },
    { value: 'frenos', label: 'Servicio de Frenos', proximoKm: 30000 },
    { value: 'neumaticos', label: 'Cambio de Neumáticos', proximoKm: 40000 },
    { value: 'general', label: 'Service General', proximoKm: 20000 }
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
    
    // Auto-calcular próximo servicio si cambia el tipo
    if (name === 'tipo') {
      const tipoServicio = tiposServicio.find(t => t.value === value);
      if (tipoServicio && formData.km_servicio) {
        const proximoKm = parseInt(formData.km_servicio) + tipoServicio.proximoKm;
        setFormData(prev => ({
          ...prev,
          proximo_km: proximoKm.toString()
        }));
      }
    }
    
    // Auto-calcular próximo km si cambia el km actual
    if (name === 'km_servicio' && formData.tipo) {
      const tipoServicio = tiposServicio.find(t => t.value === formData.tipo);
      if (tipoServicio && value) {
        const proximoKm = parseInt(value) + tipoServicio.proximoKm;
        setFormData(prev => ({
          ...prev,
          proximo_km: proximoKm.toString()
        }));
      }
    }
  };
  
  /**
   * Valida el formulario
   */
  const validarFormulario = () => {
    const nuevosErrores = {};
    
    if (!formData.tipo) {
      nuevosErrores.tipo = 'El tipo de servicio es requerido';
    }
    
    if (!formData.km_servicio || parseInt(formData.km_servicio) < 0) {
      nuevosErrores.km_servicio = 'El kilometraje es requerido y debe ser válido';
    }
    
    if (!formData.fecha) {
      nuevosErrores.fecha = 'La fecha es requerida';
    }
    
    if (formData.monto && parseFloat(formData.monto) < 0) {
      nuevosErrores.monto = 'El monto no puede ser negativo';
    }
    
    if (formData.proximo_km && parseInt(formData.proximo_km) <= parseInt(formData.km_servicio)) {
      nuevosErrores.proximo_km = 'El próximo kilometraje debe ser mayor al actual';
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
      
      const datosServicio = {
        ...formData,
        km_servicio: parseInt(formData.km_servicio),
        monto: formData.monto ? parseFloat(formData.monto) : 0
      };
      
      // Solo enviar próximo km si fue ingresado
      if (formData.proximo_km) {
        datosServicio.proximo_km = parseInt(formData.proximo_km);
      } else {
        delete datosServicio.proximo_km;
      }
      
      // Solo enviar próxima fecha si fue ingresada
      if (!formData.proximo_fecha) {
        delete datosServicio.proximo_fecha;
      }
      
      await vehiculosService.registrarServicio(datosServicio);
      
      toast.success('Servicio registrado correctamente');
      onSuccess();
    } catch (error) {
      console.error('Error al registrar servicio:', error);
      toast.error('Error al registrar el servicio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            <FaTools className="inline mr-2" />
            Nuevo Servicio
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
            {/* Tipo de servicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Servicio
              </label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.tipo ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {tiposServicio.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
              {errors.tipo && (
                <p className="mt-1 text-sm text-red-600">{errors.tipo}</p>
              )}
            </div>
            
            {/* Fecha y Kilometraje */}
            <div className="grid grid-cols-2 gap-4">
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaRoad className="inline mr-2" />
                  Kilometraje
                </label>
                <input
                  type="number"
                  name="km_servicio"
                  value={formData.km_servicio}
                  onChange={handleChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.km_servicio ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0"
                />
                {errors.km_servicio && (
                  <p className="mt-1 text-sm text-red-600">{errors.km_servicio}</p>
                )}
              </div>
            </div>
            
            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FaClipboardList className="inline mr-2" />
                Descripción (Opcional)
              </label>
              <textarea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Detalles del servicio realizado..."
              />
            </div>
            
            {/* Taller y Monto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaBuilding className="inline mr-2" />
                  Taller (Opcional)
                </label>
                <input
                  type="text"
                  name="taller"
                  value={formData.taller}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Nombre del taller"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FaDollarSign className="inline mr-1" />
                  Costo (Opcional)
                </label>
                <input
                  type="number"
                  name="monto"
                  value={formData.monto}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
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
            
            {/* Próximo servicio */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Programar Próximo Servicio (Opcional)
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Próximo en Km
                  </label>
                  <input
                    type="number"
                    name="proximo_km"
                    value={formData.proximo_km}
                    onChange={handleChange}
                    min={formData.km_servicio ? parseInt(formData.km_servicio) + 1 : 0}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.proximo_km ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Kilometraje"
                  />
                  {errors.proximo_km && (
                    <p className="mt-1 text-sm text-red-600">{errors.proximo_km}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    O en Fecha
                  </label>
                  <input
                    type="date"
                    name="proximo_fecha"
                    value={formData.proximo_fecha}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <p className="mt-2 text-xs text-gray-500">
                Recibirás alertas cuando se acerque el próximo servicio
              </p>
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

export default ServicioForm;