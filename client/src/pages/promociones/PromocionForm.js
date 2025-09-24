/**
 * Formulario de promoción
 * 
 * Permite crear o editar una promoción con todos sus detalles,
 * incluyendo tipo, valor, vigencia y productos aplicables.
 * 
 * @module pages/promociones/PromocionForm
 * @requires react, react-router-dom, ../../services/promociones.service
 * @related_files ./Promociones.js
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import promocionesService from '../../services/promociones.service';
import productosService from '../../services/productos.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import SearchBar from '../../components/common/SearchBar';

// Iconos
import {
  FaSave, FaTimes, FaArrowLeft, FaTag, FaPercentage,
  FaDollarSign, FaBoxes, FaCalendarAlt
} from 'react-icons/fa';

/**
 * Componente de formulario para crear o editar promociones
 * @returns {JSX.Element} Componente PromocionForm
 */
const PromocionForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'porcentaje',
    valor: '',
    fecha_inicio: '',
    fecha_fin: '',
    activo: true,
    condiciones: {},
    productos: []
  });
  
  // Estado para selección de productos
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Estado de carga
  const [loading, setLoading] = useState(isEditing);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
/**
 * Carga los datos para edición
 */
useEffect(() => {
  const cargarDatos = async () => {
    try {
      // Cargar productos disponibles
      const productos = await productosService.obtenerTodos();
      setProductosDisponibles(productos);
      setLoadingProductos(false);
      
      // Si estamos editando, cargar la promoción
      if (isEditing) {
        const promocion = await promocionesService.obtenerPorId(id);
        
        if (promocion) {
          // Formatear fechas para el input date
          const fechaInicio = promocion.fecha_inicio.split('T')[0];
          const fechaFin = promocion.fecha_fin.split('T')[0];
          
          setFormData({
            ...promocion,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin
          });
          
          // Establecer productos seleccionados
          if (promocion.productos && promocion.productos.length > 0) {
            const productosSeleccionadosData = productos.filter(prod => 
              promocion.productos.includes(prod.id)
            ).map(prod => ({
              ...prod,
              seleccionado: true
            }));
            
            setProductosSeleccionados(productosSeleccionadosData);
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };
  
  cargarDatos();
}, [id, isEditing]);
  
  /**
   * Actualiza el estado del formulario
   * @param {Event} e - Evento de cambio
   */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Si cambia el tipo a nxm, inicializar condiciones si no existen
      if (name === 'tipo' && value === 'nxm' && !prev.condiciones?.y) {
        newData.condiciones = {
          ...prev.condiciones,
          y: '1'
        };
      }
      
      return newData;
    });
  };
  
  /**
   * Actualiza las condiciones de la promoción
   * @param {Event} e - Evento de cambio
   */
  const handleCondicionChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      condiciones: {
        ...prev.condiciones,
        [name]: type === 'checkbox' ? checked : value
      }
    }));
  };
  
  /**
   * Busca productos para aplicar la promoción
   */
  const buscarProductos = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = productosDisponibles.filter(
      p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setSearchResults(results);
  };
  
  /**
   * Selecciona o deselecciona un producto
   * @param {Object} producto - Producto a seleccionar/deseleccionar
   */
  const toggleProducto = (producto) => {
    // Verificar si ya está seleccionado
    const yaSeleccionado = productosSeleccionados.some(p => p.id === producto.id);
    
    if (yaSeleccionado) {
      // Deseleccionar
      setProductosSeleccionados(prev => prev.filter(p => p.id !== producto.id));
    } else {
      // Seleccionar
      setProductosSeleccionados(prev => [...prev, { ...producto, seleccionado: true }]);
    }
  };
  
  /**
   * Envía el formulario
   * @param {Event} e - Evento de envío
   */
  const handleSubmit = async (e) => {
	  e.preventDefault();
	  
	  try {
		setSubmitting(true);
		
		// Preparar datos
		const promocionData = {
		  ...formData,
		  // IMPORTANTE: Convertir valor a número
		  valor: parseFloat(formData.valor) || 0,
		  productos: productosSeleccionados.map(p => p.id)
		};
		
		// Para promociones tipo nxm, agregar X e Y a las condiciones
		if (formData.tipo === 'nxm') {
		  promocionData.condiciones = {
		    ...promocionData.condiciones,
		    x: parseFloat(formData.valor) || 0,
		    y: parseFloat(formData.condiciones?.y) || 1
		  };
		}
		
		// Enviar a la API
		if (isEditing) {
		  await promocionesService.actualizar(id, promocionData);
		  toast.success('Promoción actualizada correctamente');
		} else {
		  await promocionesService.crear(promocionData);
		  toast.success('Promoción creada correctamente');
		}
		
		// Redirigir a la lista
		navigate('/promociones');
	  } catch (error) {
		console.error('Error al guardar promoción:', error);
		toast.error('Error al guardar la promoción');
	  } finally {
		setSubmitting(false);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Editar Promoción' : 'Nueva Promoción'}
        </h1>
        
        <Button
          color="secondary"
          onClick={() => navigate('/promociones')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel izquierdo: Datos generales */}
          <div className="lg:col-span-2">
            <Card title="Información General" icon={<FaTag />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre de la promoción
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Descripción
                  </label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo de promoción
                  </label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="porcentaje">Descuento por porcentaje</option>
                    <option value="monto_fijo">Descuento por monto fijo</option>
                    <option value="2x1">2x1</option>
                    <option value="nx1">Nx1</option>
                    <option value="nxm">X+Y (Compra X, lleva X+Y)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {formData.tipo === 'porcentaje' ? 'Porcentaje de descuento' :
                     formData.tipo === 'monto_fijo' ? 'Monto de descuento' :
                     formData.tipo === 'nx1' ? 'Número N' :
                     formData.tipo === 'nxm' ? 'Valor X' : 'Valor'}
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      {formData.tipo === 'porcentaje' ? (
                        <FaPercentage className="text-gray-400" />
                      ) : formData.tipo === 'monto_fijo' ? (
                        <FaDollarSign className="text-gray-400" />
                      ) : (
                        <span className="text-gray-400">#</span>
                      )}
                    </div>
                    <input
                      type="number"
                      name="valor"
                      value={formData.valor}
                      onChange={handleChange}
                      className="pl-10 mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      min={formData.tipo === 'porcentaje' ? 0 : 1}
                      max={formData.tipo === 'porcentaje' ? 100 : undefined}
                      step={formData.tipo === 'porcentaje' ? 0.01 : formData.tipo === 'monto_fijo' ? 0.01 : 1}
                      required
                    />
                  </div>
                  {formData.tipo === 'nx1' && (
                    <p className="mt-1 text-sm text-gray-500">
                      Por cada {formData.valor || 'N'} productos, 1 gratis
                    </p>
                  )}
                  
                  {formData.tipo === 'nxm' && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Valor Y (unidades gratis)
                        </label>
                        <input
                          type="number"
                          name="valorY"
                          value={formData.condiciones?.y || ''}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              condiciones: {
                                ...prev.condiciones,
                                y: e.target.value
                              }
                            }));
                          }}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          min="1"
                          step="1"
                          required
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        Compra {formData.valor || 'X'} productos, lleva {formData.valor || 'X'} + {formData.condiciones?.y || 'Y'} productos
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fecha de inicio
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCalendarAlt className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="fecha_inicio"
                      value={formData.fecha_inicio}
                      onChange={handleChange}
                      className="pl-10 mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fecha de fin
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaCalendarAlt className="text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="fecha_fin"
                      value={formData.fecha_fin}
                      onChange={handleChange}
                      className="pl-10 mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      min={formData.fecha_inicio}
                      required
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2">
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
                      Promoción activa
                    </label>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Si está desactivada, no se aplicará aunque esté dentro del rango de fechas.
                  </p>
                </div>
              </div>
            </Card>
            
            {/* Condiciones adicionales */}
            <Card title="Condiciones Adicionales" icon={<FaTag />} className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cantidad mínima de productos
                  </label>
                  <input
                    type="number"
                    name="min_cantidad"
                    value={formData.condiciones.min_cantidad || ''}
                    onChange={handleCondicionChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    min="1"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Cantidad mínima de unidades para aplicar el descuento.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Monto mínimo de compra
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaDollarSign className="text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="min_monto"
                      value={formData.condiciones.min_monto || ''}
                      onChange={handleCondicionChange}
                      className="pl-10 mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Monto mínimo de compra para aplicar el descuento.
                  </p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Panel derecho: Selección de productos */}
          <div>
            <Card title="Productos Aplicables" icon={<FaBoxes />}>
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">
                  Selecciona los productos a los que se aplicará esta promoción.
                  Si no seleccionas ninguno, se aplicará a todos los productos.
                </p>
                
                <SearchBar
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onSearch={buscarProductos}
                  onClear={() => {
                    setSearchTerm('');
                    setSearchResults([]);
                  }}
                />
              </div>
              
              {/* Resultados de búsqueda */}
              {searchTerm && searchResults.length > 0 && (
                <div className="mb-4 border rounded-md overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Producto
                          </th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acción
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {searchResults.map(producto => {
                          const seleccionado = productosSeleccionados.some(p => p.id === producto.id);
                          
                          return (
                            <tr key={producto.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {producto.nombre}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Código: {producto.codigo}
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleProducto(producto)}
                                  className={`
                                    px-3 py-1 text-xs rounded-full font-medium
                                    ${seleccionado
                                      ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                                    }
                                  `}
                                >
                                  {seleccionado ? 'Quitar' : 'Agregar'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Lista de productos seleccionados */}
              <div>
                <h3 className="font-medium text-gray-700 mb-2">
                  Productos seleccionados ({productosSeleccionados.length})
                </h3>
                
                {productosSeleccionados.length === 0 ? (
                  <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-md text-center">
                    No hay productos seleccionados. La promoción se aplicará a todos los productos.
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Producto
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {productosSeleccionados.map(producto => (
                            <tr key={producto.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {producto.nombre}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Código: {producto.codigo}
                                </div>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleProducto(producto)}
                                  className="px-3 py-1 text-xs rounded-full font-medium bg-red-100 text-red-800 hover:bg-red-200"
                                >
                                  Quitar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {productosSeleccionados.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setProductosSeleccionados([])}
                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                  >
                    Limpiar selección
                  </button>
                )}
              </div>
            </Card>
          </div>
        </div>
        
        {/* Botones de acción */}
        <div className="mt-6 flex justify-end space-x-3">
          <Button
            type="button"
            color="secondary"
            onClick={() => navigate('/promociones')}
            icon={<FaTimes />}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            color="primary"
            loading={submitting}
            icon={<FaSave />}
          >
            {isEditing ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PromocionForm;