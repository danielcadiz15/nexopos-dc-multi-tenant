/**
 * Formulario de categoría
 * 
 * Permite crear o editar categorías de productos.
 * 
 * @module pages/categorias/CategoriaForm
 * @requires react, react-router-dom, ../../services/categorias.service
 * @related_files ./Categorias.js
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import categoriasService from '../../services/categorias.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaTags, FaSave, FaTimes, FaArrowLeft
} from 'react-icons/fa';

/**
 * Componente de formulario para crear/editar categoría
 * @returns {JSX.Element} Componente CategoriaForm
 */
const CategoriaForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  
  // Estados
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  
  /**
   * Efecto para cargar datos de la categoría si está en modo edición
   */
  useEffect(() => {
    const cargarCategoria = async () => {
      try {
        const categoria = await categoriasService.obtenerPorId(id);
        
        setFormData({
          nombre: categoria.nombre || '',
          descripcion: categoria.descripcion || ''
        });
      } catch (error) {
        console.error('Error al cargar categoría:', error);
        toast.error('Error al cargar los datos de la categoría');
        navigate('/categorias');
      } finally {
        setLoadingData(false);
      }
    };
    
    if (isEditing) {
      cargarCategoria();
    }
  }, [id, isEditing, navigate]);
  
  /**
   * Maneja cambios en los campos del formulario
   * @param {Event} e - Evento de cambio
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  /**
   * Envía el formulario para crear/actualizar categoría
   * @param {Event} e - Evento de envío
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación básica
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la categoría es requerido');
      return;
    }
    
    setLoading(true);
    
    try {
      if (isEditing) {
        // Actualizar categoría existente
        await categoriasService.actualizar(id, formData);
        toast.success('Categoría actualizada correctamente');
      } else {
        // Crear nueva categoría
        await categoriasService.crear(formData);
        toast.success('Categoría creada correctamente');
      }
      
      // Redireccionar a la lista de categorías
      navigate('/categorias');
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(`Error al ${isEditing ? 'actualizar' : 'crear'} la categoría`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Si está cargando los datos (en modo edición)
  if (loadingData) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
        </h1>
        
        <Button
          color="secondary"
          onClick={() => navigate('/categorias')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      <Card
        title={isEditing ? 'Editar Categoría' : 'Datos de la Categoría'}
        icon={<FaTags />}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label 
                htmlFor="nombre"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            
            {/* Descripción */}
            <div>
              <label 
                htmlFor="descripcion"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Descripción
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                rows={4}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            {/* Botones */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                color="secondary"
                onClick={() => navigate('/categorias')}
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
                {isEditing ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CategoriaForm;