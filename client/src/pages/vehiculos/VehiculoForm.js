// src/pages/vehiculos/VehiculoForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import vehiculosService from '../../services/vehiculos.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaSave, FaTimes, FaCar, FaTruck, FaMotorcycle, FaBus,
  FaCalendarAlt, FaRoad, FaIdCard
} from 'react-icons/fa';

/**
 * Formulario para crear/editar vehículos
 */
const VehiculoForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const esEdicion = !!id;
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    patente: '',
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    tipo: 'auto',
    km_actual: 0,
    fecha_vencimiento_seguro: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Cargar datos si es edición
  useEffect(() => {
    if (esEdicion) {
      cargarVehiculo();
    }
  }, [id]);
  
  /**
   * Carga los datos del vehículo para edición
   */
  const cargarVehiculo = async () => {
    try {
      setLoadingDatos(true);
      const vehiculo = await vehiculosService.obtenerPorId(id);
      
      // Formatear fecha de seguro si existe
      let fechaSeguro = '';
      if (vehiculo.fecha_vencimiento_seguro) {
        if (vehiculo.fecha_vencimiento_seguro._seconds) {
          fechaSeguro = new Date(vehiculo.fecha_vencimiento_seguro._seconds * 1000)
            .toISOString().split('T')[0];
        } else {
          fechaSeguro = new Date(vehiculo.fecha_vencimiento_seguro)
            .toISOString().split('T')[0];
        }
      }
      
      setFormData({
        patente: vehiculo.patente || '',
        marca: vehiculo.marca || '',
        modelo: vehiculo.modelo || '',
        año: vehiculo.año || new Date().getFullYear(),
        tipo: vehiculo.tipo || 'auto',
        km_actual: vehiculo.km_actual || 0,
        fecha_vencimiento_seguro: fechaSeguro
      });
    } catch (error) {
      console.error('Error al cargar vehículo:', error);
      toast.error('Error al cargar los datos del vehículo');
      navigate('/vehiculos');
    } finally {
      setLoadingDatos(false);
    }
  };
  
  /**
   * Maneja los cambios en los campos del formulario
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
    
    if (!formData.patente.trim()) {
      nuevosErrores.patente = 'La patente es requerida';
    } else if (formData.patente.length < 6) {
      nuevosErrores.patente = 'La patente debe tener al menos 6 caracteres';
    }
    
    if (!formData.marca.trim()) {
      nuevosErrores.marca = 'La marca es requerida';
    }
    
    if (!formData.modelo.trim()) {
      nuevosErrores.modelo = 'El modelo es requerido';
    }
    
    if (!formData.año || formData.año < 1900 || formData.año > new Date().getFullYear() + 1) {
      nuevosErrores.año = 'El año debe ser válido';
    }
    
    if (formData.km_actual < 0) {
      nuevosErrores.km_actual = 'El kilometraje no puede ser negativo';
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
      
      const datosVehiculo = {
        ...formData,
        año: parseInt(formData.año),
        km_actual: parseInt(formData.km_actual)
      };
      
      // Solo enviar fecha de seguro si fue ingresada
      if (!formData.fecha_vencimiento_seguro) {
        delete datosVehiculo.fecha_vencimiento_seguro;
      }
      
      if (esEdicion) {
        await vehiculosService.actualizar(id, datosVehiculo);
        toast.success('Vehículo actualizado correctamente');
      } else {
        await vehiculosService.crear(datosVehiculo);
        toast.success('Vehículo creado correctamente');
      }
      
      navigate('/vehiculos');
    } catch (error) {
      console.error('Error al guardar vehículo:', error);
      
      if (error.message.includes('patente')) {
        setErrors({ patente: 'Ya existe un vehículo con esa patente' });
      } else {
        toast.error('Error al guardar el vehículo');
      }
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Renderiza el icono según el tipo seleccionado
   */
  const renderIconoTipo = (tipo) => {
    switch (tipo) {
      case 'auto':
        return <FaCar className="text-blue-500" />;
      case 'camioneta':
        return <FaTruck className="text-green-500" />;
      case 'camion':
        return <FaTruck className="text-green-600" />;
      case 'moto':
        return <FaMotorcycle className="text-purple-500" />;
      default:
        return <FaBus className="text-gray-500" />;
    }
  };

  if (loadingDatos) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {esEdicion ? 'Editar Vehículo' : 'Nuevo Vehículo'}
        </h1>
        <p className="text-gray-600">
          {esEdicion ? 'Modifica los datos del vehículo' : 'Registra un nuevo vehículo en la flota'}
        </p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaIdCard className="inline mr-2" />
                Patente
              </label>
              <input
                type="text"
                name="patente"
                value={formData.patente}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.patente ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="ABC123"
                style={{ textTransform: 'uppercase' }}
              />
              {errors.patente && (
                <p className="mt-1 text-sm text-red-600">{errors.patente}</p>
              )}
            </div>
            
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Vehículo
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'auto', label: 'Auto', icon: 'auto' },
                  { value: 'camioneta', label: 'Camioneta', icon: 'camioneta' },
                  { value: 'camion', label: 'Camión', icon: 'camion' },
                  { value: 'moto', label: 'Moto', icon: 'moto' }
                ].map(tipo => (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, tipo: tipo.value }))}
                    className={`flex items-center justify-center space-x-2 p-3 border rounded-md transition-colors ${
                      formData.tipo === tipo.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {renderIconoTipo(tipo.icon)}
                    <span className="text-sm font-medium">{tipo.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Marca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca
              </label>
              <input
                type="text"
                name="marca"
                value={formData.marca}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.marca ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Toyota, Ford, etc."
              />
              {errors.marca && (
                <p className="mt-1 text-sm text-red-600">{errors.marca}</p>
              )}
            </div>
            
            {/* Modelo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo
              </label>
              <input
                type="text"
                name="modelo"
                value={formData.modelo}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.modelo ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Corolla, Ranger, etc."
              />
              {errors.modelo && (
                <p className="mt-1 text-sm text-red-600">{errors.modelo}</p>
              )}
            </div>
            
            {/* Año */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año
              </label>
              <input
                type="number"
                name="año"
                value={formData.año}
                onChange={handleChange}
                min="1900"
                max={new Date().getFullYear() + 1}
                className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.año ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.año && (
                <p className="mt-1 text-sm text-red-600">{errors.año}</p>
              )}
            </div>
            
            {/* Kilometraje */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaRoad className="inline mr-2" />
                Kilometraje Actual
              </label>
              <input
                type="number"
                name="km_actual"
                value={formData.km_actual}
                onChange={handleChange}
                min="0"
                className={`w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.km_actual ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {errors.km_actual && (
                <p className="mt-1 text-sm text-red-600">{errors.km_actual}</p>
              )}
            </div>
            
            {/* Vencimiento Seguro */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FaCalendarAlt className="inline mr-2" />
                Fecha de Vencimiento del Seguro (Opcional)
              </label>
              <input
                type="date"
                name="fecha_vencimiento_seguro"
                value={formData.fecha_vencimiento_seguro}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Recibirás alertas cuando el seguro esté próximo a vencer
              </p>
            </div>
          </div>
          
          {/* Botones */}
          <div className="mt-6 flex justify-end space-x-3 pt-6 border-t">
            <Button
              type="button"
              color="secondary"
              onClick={() => navigate('/vehiculos')}
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
              {esEdicion ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default VehiculoForm;