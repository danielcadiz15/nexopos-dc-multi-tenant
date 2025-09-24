/**
 * Formulario de proveedor
 * 
 * Permite crear y editar proveedores del sistema.
 * 
 * @module pages/proveedores/ProveedorForm
 * @requires react, react-router-dom, ../../services/proveedores.service
 * @related_files ./Proveedores.js
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import proveedoresService from '../../services/proveedores.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaSave, FaTimes, FaBuilding, FaUserTie, FaPhone, 
  FaEnvelope, FaMapMarkerAlt, FaGlobe, FaIdCard,
  FaTruck
} from 'react-icons/fa';

/**
 * Componente de formulario de proveedor
 * @returns {JSX.Element} Componente ProveedorForm
 */
const ProveedorForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const esEdicion = Boolean(id);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: '',
    ciudad: '',
    sitio_web: '',
    cuit: '',
    condicion_iva: 'Responsable Inscripto',
    observaciones: '',
    activo: true
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingDatos, setLoadingDatos] = useState(false);
  const [errors, setErrors] = useState({});
  
  /**
   * Carga los datos del proveedor si es edición
   */
  useEffect(() => {
    if (esEdicion) {
      cargarProveedor();
    }
  }, [id]);
  
  /**
   * Carga los datos del proveedor para edición
   */
  const cargarProveedor = async () => {
    try {
      setLoadingDatos(true);
      const proveedor = await proveedoresService.obtenerPorId(id);
      
      setFormData({
        nombre: proveedor.nombre || '',
        contacto: proveedor.contacto || '',
        telefono: proveedor.telefono || '',
        email: proveedor.email || '',
        direccion: proveedor.direccion || '',
        ciudad: proveedor.ciudad || '',
        sitio_web: proveedor.sitio_web || '',
        cuit: proveedor.cuit || '',
        condicion_iva: proveedor.condicion_iva || 'Responsable Inscripto',
        observaciones: proveedor.observaciones || '',
        activo: proveedor.activo !== false
      });
    } catch (error) {
      console.error('Error al cargar proveedor:', error);
      toast.error('Error al cargar los datos del proveedor');
      navigate('/proveedores');
    } finally {
      setLoadingDatos(false);
    }
  };
  
  /**
   * Maneja los cambios en los inputs del formulario
   * @param {Event} e - Evento del input
   */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Limpiar error del campo al modificarlo
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  /**
   * Valida los datos del formulario
   * @returns {boolean} true si es válido, false si hay errores
   */
  const validarFormulario = () => {
    const newErrors = {};
    
    // Nombre es obligatorio
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre del proveedor es requerido';
    }
    
    // Validar email si se proporciona
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'El email no es válido';
    }
    
    // Validar teléfono si se proporciona (solo números, guiones y espacios)
    if (formData.telefono && !/^[\d\s\-\+\(\)]+$/.test(formData.telefono)) {
      newErrors.telefono = 'El teléfono solo puede contener números, espacios y guiones';
    }
    
    // Validar CUIT si se proporciona
    if (formData.cuit && !/^\d{2}-?\d{8}-?\d{1}$/.test(formData.cuit.replace(/\s/g, ''))) {
      newErrors.cuit = 'El CUIT debe tener el formato XX-XXXXXXXX-X';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  /**
   * Valida formato de email
   * @param {string} email - Email a validar
   * @returns {boolean} true si es válido
   */
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  /**
   * Maneja el envío del formulario
   * @param {Event} e - Evento del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      toast.error('Por favor, corrige los errores del formulario');
      return;
    }
    
    setLoading(true);
    
    try {
      if (esEdicion) {
        await proveedoresService.actualizar(id, formData);
        toast.success('Proveedor actualizado correctamente');
      } else {
        await proveedoresService.crear(formData);
        toast.success('Proveedor creado correctamente');
      }
      
      navigate('/proveedores');
    } catch (error) {
      console.error('Error al guardar proveedor:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(esEdicion ? 'Error al actualizar el proveedor' : 'Error al crear el proveedor');
      }
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Cancela la operación y vuelve al listado
   */
  const handleCancel = () => {
    navigate('/proveedores');
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
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <FaTruck className="mr-3" />
          {esEdicion ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        </h1>
        <p className="text-gray-600 mt-1">
          {esEdicion 
            ? 'Modifica los datos del proveedor' 
            : 'Registra un nuevo proveedor en el sistema'}
        </p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Proveedor *
              </label>
              <div className="relative">
                <FaBuilding className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.nombre ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Nombre del proveedor"
                />
              </div>
              {errors.nombre && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
              )}
            </div>
            
            {/* Contacto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Persona de Contacto
              </label>
              <div className="relative">
                <FaUserTie className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="contacto"
                  value={formData.contacto}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Nombre del contacto"
                />
              </div>
            </div>
            
            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <div className="relative">
                <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.telefono ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Teléfono de contacto"
                />
              </div>
              {errors.telefono && (
                <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
              )}
            </div>
            
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            
            {/* Sitio Web */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sitio Web
              </label>
              <div className="relative">
                <FaGlobe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="sitio_web"
                  value={formData.sitio_web}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="www.ejemplo.com"
                />
              </div>
            </div>
            
            {/* Dirección */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Dirección completa"
                />
              </div>
            </div>
            
            {/* Ciudad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ciudad
              </label>
              <input
                type="text"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ciudad"
              />
            </div>
            
            {/* CUIT */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CUIT
              </label>
              <div className="relative">
                <FaIdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="cuit"
                  value={formData.cuit}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.cuit ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="XX-XXXXXXXX-X"
                />
              </div>
              {errors.cuit && (
                <p className="mt-1 text-sm text-red-600">{errors.cuit}</p>
              )}
            </div>
            
            {/* Condición IVA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condición IVA
              </label>
              <select
                name="condicion_iva"
                value={formData.condicion_iva}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="Responsable Inscripto">Responsable Inscripto</option>
                <option value="Monotributo">Monotributo</option>
                <option value="Exento">Exento</option>
                <option value="Consumidor Final">Consumidor Final</option>
                <option value="No Responsable">No Responsable</option>
              </select>
            </div>
            
            {/* Observaciones */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                rows="3"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Notas adicionales sobre el proveedor"
              />
            </div>
            
            {/* Estado Activo */}
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Proveedor activo
                </span>
              </label>
            </div>
          </div>
          
          {/* Botones */}
          <div className="mt-6 pt-6 border-t flex justify-end space-x-3">
            <Button
              type="button"
              color="secondary"
              onClick={handleCancel}
              icon={<FaTimes />}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              color="primary"
              loading={loading}
              icon={<FaSave />}
            >
              {esEdicion ? 'Actualizar' : 'Guardar'} Proveedor
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
};

export default ProveedorForm;