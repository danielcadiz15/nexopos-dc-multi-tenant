/**
 * Formulario para crear o editar materias primas
 * 
 * @module pages/materiasPrimas/MateriaPrimaForm
 * @requires react, react-router-dom, ../../services/materiasPrimas.service
 * @related_files ./MateriasPrimas.js
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import materiasPrimasService from '../../services/materiasPrimas.service';
import proveedoresService from '../../services/proveedores.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { FaCubes, FaArrowLeft, FaSave, FaTimes } from 'react-icons/fa';

/**
 * Componente de formulario para materias primas
 * @returns {JSX.Element} Componente MateriaPrimaForm
 */
const MateriaPrimaForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const esEdicion = !!id;
  
  // Estado
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    unidad_medida: 'unidad',
    precio_unitario: '',
    stock_actual: '0',
    stock_minimo: '5',
    proveedor_id: '',
    activo: true
  });
  
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar proveedores
        const dataProveedores = await proveedoresService.obtenerTodos();
        setProveedores(dataProveedores);
        
        // Si es edición, cargar materia prima
        if (esEdicion) {
          const materiaPrima = await materiasPrimasService.obtenerPorId(id);
          
          setFormData({
            codigo: materiaPrima.codigo || '',
            nombre: materiaPrima.nombre,
            descripcion: materiaPrima.descripcion || '',
            unidad_medida: materiaPrima.unidad_medida,
            precio_unitario: materiaPrima.precio_unitario,
            stock_actual: materiaPrima.stock_actual,
            stock_minimo: materiaPrima.stock_minimo,
            proveedor_id: materiaPrima.proveedor_id || '',
            activo: materiaPrima.activo
          });
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
        toast.error('Error al cargar los datos necesarios');
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [id, esEdicion]);
  
  /**
   * Maneja cambios en los campos del formulario
   * @param {Event} e - Evento de cambio
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prevState => ({
      ...prevState,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  /**
   * Envía el formulario
   * @param {Event} e - Evento de envío
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.nombre) {
      toast.error('El nombre es obligatorio');
      return;
    }
    
    if (!formData.unidad_medida) {
      toast.error('La unidad de medida es obligatoria');
      return;
    }
    
    if (parseFloat(formData.precio_unitario) <= 0) {
      toast.error('El precio debe ser mayor a cero');
      return;
    }
    
    setGuardando(true);
    
    try {
      const dataToSend = {
        ...formData,
        precio_unitario: parseFloat(formData.precio_unitario),
        stock_actual: parseFloat(formData.stock_actual),
        stock_minimo: parseFloat(formData.stock_minimo),
        proveedor_id: formData.proveedor_id || null
      };
      
      if (esEdicion) {
        await materiasPrimasService.actualizar(id, dataToSend);
        toast.success('Materia prima actualizada correctamente');
      } else {
        await materiasPrimasService.crear(dataToSend);
        toast.success('Materia prima creada correctamente');
      }
      
      navigate('/materias-primas');
    } catch (error) {
      console.error('Error al guardar materia prima:', error);
      toast.error(error.response?.data?.message || 'Error al guardar la materia prima');
    } finally {
      setGuardando(false);
    }
  };
  
  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          {esEdicion ? 'Editar Materia Prima' : 'Nueva Materia Prima'}
        </h1>
        
        <Button
          color="secondary"
          onClick={() => navigate('/materias-primas')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Datos generales */}
          <Card
            title="Información General"
            icon={<FaCubes />}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleChange}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Código o SKU (opcional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Nombre de la materia prima"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  rows={3}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Descripción opcional"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad de Medida *
                </label>
                <select
                  name="unidad_medida"
                  value={formData.unidad_medida}
                  onChange={handleChange}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                >
                  <option value="unidad">Unidad</option>
                  <option value="kg">Kilogramos (kg)</option>
                  <option value="g">Gramos (g)</option>
                  <option value="l">Litros (l)</option>
                  <option value="ml">Mililitros (ml)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proveedor
                </label>
                <select
                  name="proveedor_id"
                  value={formData.proveedor_id}
                  onChange={handleChange}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">Seleccionar proveedor (opcional)</option>
                  {proveedores.map(proveedor => (
                    <option key={`proveedor-${proveedor.id}`} value={proveedor.id}>
                      {proveedor.nombre}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="activo"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="activo" className="ml-2 block text-sm text-gray-700">
                  Activo
                </label>
              </div>
            </div>
          </Card>
          
          {/* Precios y stock */}
          <Card
            title="Precios y Stock"
            icon={<FaCubes />}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Unitario *
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    name="precio_unitario"
                    value={formData.precio_unitario}
                    onChange={handleChange}
                    min="0.01"
                    step="0.01"
                    className="block w-full border-gray-300 pl-7 pr-12 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="0.00"
                    required
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500">{formData.unidad_medida}</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Precio por {formData.unidad_medida === 'unidad' ? 'unidad' : `${formData.unidad_medida}`}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Actual
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="number"
                    name="stock_actual"
                    value={formData.stock_actual}
                    onChange={handleChange}
                    min="0"
                    step={formData.unidad_medida === 'unidad' ? '1' : '0.01'}
                    className="block w-full border-gray-300 pr-12 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="0"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500">{formData.unidad_medida}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Mínimo
                </label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <input
                    type="number"
                    name="stock_minimo"
                    value={formData.stock_minimo}
                    onChange={handleChange}
                    min="0"
                    step={formData.unidad_medida === 'unidad' ? '1' : '0.01'}
                    className="block w-full border-gray-300 pr-12 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="5"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500">{formData.unidad_medida}</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Se generará alerta cuando el stock esté por debajo de este valor
                </p>
              </div>
            </div>
          </Card>
          
          {/* Botones de acción */}
          <div className="md:col-span-2 flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              color="secondary"
              onClick={() => navigate('/materias-primas')}
              icon={<FaTimes />}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              color="primary"
              loading={guardando}
              icon={<FaSave />}
            >
              {esEdicion ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MateriaPrimaForm;