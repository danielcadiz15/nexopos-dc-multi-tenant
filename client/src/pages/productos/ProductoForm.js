/**
 * Formulario de producto (nuevo/edición)
 * Diseñado para ser resiliente ante errores de API y compatible con Firebase
 * 
 * @module pages/productos/ProductoForm
 * @requires react, react-router-dom, react-toastify
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaSave, FaArrowLeft, FaSpinner } from 'react-icons/fa';

// Servicios
import productosService from '../../services/productos.service';
import categoriasService from '../../services/categorias.service';
import proveedoresService from '../../services/proveedores.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

const ProductoForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  // Estados
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precio_costo: '',
    precio_venta: '',
    categoria_id: '',
    proveedor_id: '',
    stock_minimo: '5',
    activo: true
  });
  
  // Para corregir el error de ESLint, definimos una variable producto para usarla en el formulario
  const producto = formData;
  
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [margenGanancia, setMargenGanancia] = useState(0);
  const [modoCalculo, setModoCalculo] = useState('manual'); // 'manual' o 'porcentaje'
  
  // Datos de respaldo para cuando fallan las APIs
  const CATEGORIAS_RESPALDO = [];
  
  const PROVEEDORES_RESPALDO = [
    { id: 1, nombre: 'Proveedor General' },
    { id: 2, nombre: 'Distribuidora Alimentos' },
    { id: 3, nombre: 'Limpieza Industrial' }
  ];
  
  // Calcular margen de ganancia cuando cambian los precios
  const calcularMargen = (costo, venta) => {
    const costoNum = parseFloat(costo) || 0;
    const ventaNum = parseFloat(venta) || 0;
    
    if (costoNum > 0) {
      const margen = ((ventaNum - costoNum) / costoNum) * 100;
      setMargenGanancia(margen.toFixed(2));
    } else {
      setMargenGanancia(0);
    }
  };

  // Calcular precio de venta basado en margen
  const calcularPrecioVentaPorMargen = (costo, margen) => {
    const costoNum = parseFloat(costo) || 0;
    const margenNum = parseFloat(margen) || 0;
    
    const precioVenta = costoNum * (1 + margenNum / 100);
    return precioVenta.toFixed(2);
  };

  // Actualizar handleChange para los precios
  const handlePrecioChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (modoCalculo === 'manual') {
      if (name === 'precio_costo') {
        calcularMargen(value, formData.precio_venta);
      } else if (name === 'precio_venta') {
        calcularMargen(formData.precio_costo, value);
      }
    }
  };

  // Manejar cambio de margen
  const handleMargenChange = (e) => {
    const nuevoMargen = e.target.value;
    setMargenGanancia(nuevoMargen);
    
    if (modoCalculo === 'porcentaje') {
      const nuevoPrecioVenta = calcularPrecioVentaPorMargen(formData.precio_costo, nuevoMargen);
      setFormData(prev => ({ ...prev, precio_venta: nuevoPrecioVenta }));
    }
  };
  
  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        
        let categoriasData = [];
        let proveedoresData = [];
        
        // Cargar categorías con manejo de errores
        try {
          // Intentar primero con el método estándar
          categoriasData = await categoriasService.obtenerTodos();
        } catch (catError) {
          console.warn('Error con obtenerTodos, intentando con obtenerTodas:', catError);
          
          try {
            // Intentar con método alternativo si falla el primero
            categoriasData = await categoriasService.obtenerTodas();
          } catch (altCatError) {
            console.error('Error incluso con método alternativo:', altCatError);
            // Usar datos de respaldo
            categoriasData = CATEGORIAS_RESPALDO;
            toast.warning('Usando datos de categorías de respaldo');
          }
        }
        
        setCategorias(categoriasData);
        
        // Cargar proveedores con manejo de errores
        try {
          proveedoresData = await proveedoresService.obtenerTodos();
        } catch (provError) {
          console.error('Error al cargar proveedores:', provError);
          // Usar datos de respaldo
          proveedoresData = PROVEEDORES_RESPALDO;
          toast.warning('Usando datos de proveedores de respaldo');
        }
        
        setProveedores(proveedoresData);
        
        // Si estamos editando, cargar datos del producto
        if (isEditing) {
          try {
            const productoData = await productosService.obtenerPorId(id);
            setFormData({
              codigo: productoData.codigo || '',
              nombre: productoData.nombre || '',
              descripcion: productoData.descripcion || '',
              precio_costo: productoData.precio_costo || '',
              precio_venta: productoData.precio_venta || '',
              categoria_id: productoData.categoria_id || '',
              proveedor_id: productoData.proveedor_id || '',
              stock_minimo: productoData.stock_minimo || '5',
              activo: productoData.activo !== undefined ? productoData.activo : true
            });
            
            // Calcular margen para producto existente
            if (productoData.precio_costo && productoData.precio_venta) {
              calcularMargen(productoData.precio_costo, productoData.precio_venta);
            }
          } catch (prodError) {
            console.error('Error al cargar producto para edición:', prodError);
            toast.error('No se pudo cargar el producto para editar');
            setLoadError('No se pudo cargar el producto para editar');
          }
        }
      } catch (error) {
        console.error('Error general al cargar datos iniciales:', error);
        setLoadError('Error al cargar datos iniciales. Intente nuevamente.');
        toast.error('Error al cargar datos iniciales');
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [id, isEditing]);
  
  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) {
      console.log('Formulario ya está siendo enviado, ignorando clic adicional');
      return;
    }
    try {
      setSubmitting(true);
      
      // Validaciones básicas
      if (!formData.nombre || !formData.codigo) {
        toast.error('Nombre y código son obligatorios');
        return;
      }
      
      if (isNaN(parseFloat(formData.precio_costo)) || isNaN(parseFloat(formData.precio_venta))) {
        toast.error('Los precios deben ser valores numéricos');
        return;
      }
      
      // Crear objeto producto para enviar
      const productoData = {
        ...formData,
        precio_costo: parseFloat(formData.precio_costo),
        precio_venta: parseFloat(formData.precio_venta),
        stock_minimo: parseInt(formData.stock_minimo || 5)
      };
      
      if (isEditing) {
        // Actualizar producto existente
        await productosService.actualizar(id, productoData);
        toast.success('Producto actualizado correctamente');
      } else {
        // Crear nuevo producto
        const response = await productosService.crear(productoData);
        toast.success('Producto creado correctamente');
        console.log('Producto creado:', response.data);
      }
      
      // Redireccionar con estado para forzar recarga
      navigate('/productos', { state: { reload: true } });
      
    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast.error('Error al guardar el producto');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Si hay error de carga, mostrar mensaje de error
  if (loadError && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </h1>
          
          <Button
            color="secondary"
            onClick={() => navigate('/productos')}
            icon={<FaArrowLeft />}
          >
            Volver
          </Button>
        </div>
        
        <Card>
          <div className="bg-red-50 p-6 text-center">
            <div className="text-red-600 mb-4 text-lg font-medium">
              {loadError}
            </div>
            <Button color="primary" onClick={() => window.location.reload()}>
              Intentar nuevamente
            </Button>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
        </h1>
        
        <Button
          color="secondary"
          onClick={() => navigate('/productos')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      {loading ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Cargando datos...</p>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información básica */}
            <Card title="Información Básica">
              <div className="space-y-4">
                {/* Código */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    value={producto.codigo}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={producto.nombre}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    name="descripcion"
                    value={producto.descripcion}
                    onChange={handleChange}
                    rows="3"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                
                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    name="categoria_id"
                    value={producto.categoria_id}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Escriba la categoría (se creará si no existe)"
                  />
                </div>
                
                {/* Proveedor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <select
                    name="proveedor_id"
                    value={producto.proveedor_id}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {proveedores.map(proveedor => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
            
            {/* Precios y stock */}
            <Card title="Precios y Stock">
              <div className="space-y-4">
                {/* Precio de costo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de costo *
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="precio_costo"
                      value={producto.precio_costo}
                      onChange={handlePrecioChange}
                      className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>
                
                {/* Selector de Modo de Cálculo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modo de Cálculo
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="modoCalculo"
                        value="manual"
                        checked={modoCalculo === 'manual'}
                        onChange={(e) => setModoCalculo(e.target.value)}
                        className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm">Manual</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="modoCalculo"
                        value="porcentaje"
                        checked={modoCalculo === 'porcentaje'}
                        onChange={(e) => setModoCalculo(e.target.value)}
                        className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm">Por Margen %</span>
                    </label>
                  </div>
                </div>
                
                {/* Precio de venta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de venta *
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="precio_venta"
                      value={producto.precio_venta}
                      onChange={handlePrecioChange}
                      className={`block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-indigo-500 focus:ring-indigo-500 ${
                        modoCalculo === 'porcentaje' ? 'bg-gray-100' : ''
                      }`}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                      readOnly={modoCalculo === 'porcentaje'}
                    />
                  </div>
                </div>
                
                {/* Margen de Ganancia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Margen de Ganancia (%)
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="number"
                      value={margenGanancia}
                      onChange={handleMargenChange}
                      step="0.01"
                      className={`block w-full rounded-md border-gray-300 pr-8 focus:border-indigo-500 focus:ring-indigo-500 ${
                        modoCalculo === 'manual' ? 'bg-gray-100' : ''
                      } ${
                        margenGanancia < 0 ? 'text-red-600' : margenGanancia > 0 ? 'text-green-600' : ''
                      }`}
                      placeholder="0.00"
                      readOnly={modoCalculo === 'manual'}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">%</span>
                    </div>
                  </div>
                  {margenGanancia > 0 && (
                    <p className="mt-1 text-sm text-green-600">
                      Ganancia: ${((parseFloat(formData.precio_venta) || 0) - (parseFloat(formData.precio_costo) || 0)).toFixed(2)}
                    </p>
                  )}
                  {margenGanancia < 0 && (
                    <p className="mt-1 text-sm text-red-600">
                      ⚠️ El precio de venta está por debajo del costo
                    </p>
                  )}
                </div>
                
                {/* Stock mínimo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock mínimo
                  </label>
                  <input
                    type="number"
                    name="stock_minimo"
                    value={producto.stock_minimo}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    min="0"
                  />
                </div>
                
                {/* Activo */}
                <div className="mt-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="activo"
                      checked={producto.activo}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Producto activo
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Botones de acción */}
          <div className="mt-6 flex justify-end space-x-3">
            <Button 
              type="button"
              color="secondary"
              onClick={() => navigate('/productos')}
            >
              Cancelar
            </Button>
            
            <Button
              type="submit"
              color="primary"
              icon={submitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
              disabled={submitting}
            >
              {submitting ? 'Guardando...' : 'Guardar Producto'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ProductoForm;