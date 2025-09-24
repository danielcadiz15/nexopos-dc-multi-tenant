/**
 * Formulario para crear nuevas compras - VERSIÓN FINAL CORREGIDA
 * 
 * Permite registrar nuevas órdenes de compra a proveedores con búsqueda inteligente
 * 
 * @module pages/compras/CompraForm
 * @requires react, react-router-dom, ../../services/compras.service
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Servicios
import comprasService from '../../services/compras.service';
import productosService from '../../services/productos.service';
import proveedoresService from '../../services/proveedores.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaShoppingCart, FaArrowLeft, FaSave, FaTimes, 
  FaPlus, FaTrash, FaUserTie, FaBoxOpen, FaStore,
  FaSearch, FaExclamationTriangle, FaBarcode
} from 'react-icons/fa';

/**
 * Componente de formulario mejorado para crear compras
 */
const CompraForm = () => {
  const navigate = useNavigate();
  const { sucursalSeleccionada } = useAuth();
  
  // Referencias
  const searchInputRef = useRef(null);
  
  // Estado principal
  const [formData, setFormData] = useState({
    proveedor_id: '',
    notas: ''
  });
  
  const [detalles, setDetalles] = useState([
    { producto_id: '', cantidad: '', precio_unitario: '', subtotal: 0, producto_info: null }
  ]);
  
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [total, setTotal] = useState(0);
  
  // Estados para búsqueda de productos
  const [busquedaProductos, setBusquedaProductos] = useState('');
  const [productosSugeridos, setProductosSugeridos] = useState([]);
  const [mostrandoSugerencias, setMostrandoSugerencias] = useState(false);
  const [indiceSugerenciaActiva, setIndiceSugerenciaActiva] = useState(-1);
  const [filaActivaBusqueda, setFilaActivaBusqueda] = useState(-1);

  /**
   * Carga datos iniciales
   */
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Cargar proveedores
        const dataProveedores = await proveedoresService.obtenerTodos();
        setProveedores(dataProveedores);
        setLoadingProveedores(false);
        
        // Cargar productos para búsqueda
        const dataProductos = await productosService.obtenerTodos();
        setProductos(dataProductos);
        setLoadingProductos(false);
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        toast.error('Error al cargar datos necesarios');
      }
    };
    
    cargarDatos();
  }, []);

  /**
   * Búsqueda inteligente de productos
   */
  const buscarProductos = (termino) => {
    if (!termino || termino.length < 2) {
      setProductosSugeridos([]);
      setMostrandoSugerencias(false);
      return;
    }

    const terminoLower = termino.toLowerCase();
    const resultados = productos
      .filter(producto => 
        producto.activo &&
        (producto.nombre.toLowerCase().includes(terminoLower) ||
         producto.codigo.toLowerCase().includes(terminoLower) ||
         (producto.codigo_barras && producto.codigo_barras.toLowerCase().includes(terminoLower)))
      )
      .sort((a, b) => {
        // Priorizar coincidencias exactas de código
        const aCodigoExacto = a.codigo.toLowerCase() === terminoLower;
        const bCodigoExacto = b.codigo.toLowerCase() === terminoLower;
        if (aCodigoExacto && !bCodigoExacto) return -1;
        if (bCodigoExacto && !aCodigoExacto) return 1;
        
        // Luego por nombre que empiece con el término
        const aNombreEmpieza = a.nombre.toLowerCase().startsWith(terminoLower);
        const bNombreEmpieza = b.nombre.toLowerCase().startsWith(terminoLower);
        if (aNombreEmpieza && !bNombreEmpieza) return -1;
        if (bNombreEmpieza && !aNombreEmpieza) return 1;
        
        return a.nombre.localeCompare(b.nombre);
      })
      .slice(0, 8); // Máximo 8 sugerencias

    setProductosSugeridos(resultados);
    setMostrandoSugerencias(true);
    setIndiceSugerenciaActiva(-1);
  };

  /**
   * Maneja cambios en el campo de búsqueda
   */
  const handleBusquedaChange = (e, index) => {
    const valor = e.target.value;
    setBusquedaProductos(valor);
    setFilaActivaBusqueda(index);
    buscarProductos(valor);
  };

  /**
   * Maneja teclas en el campo de búsqueda
   */
  const handleBusquedaKeyDown = (e, index) => {
    if (!mostrandoSugerencias) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIndiceSugerenciaActiva(prev => 
          prev < productosSugeridos.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIndiceSugerenciaActiva(prev => 
          prev > 0 ? prev - 1 : productosSugeridos.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (indiceSugerenciaActiva >= 0) {
          seleccionarProducto(productosSugeridos[indiceSugerenciaActiva], index);
        }
        break;
      case 'Escape':
        setMostrandoSugerencias(false);
        setIndiceSugerenciaActiva(-1);
        break;
    }
  };

  /**
   * Selecciona un producto de las sugerencias
   */
  const seleccionarProducto = (producto, index) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index] = {
      ...nuevosDetalles[index],
      producto_id: producto.id,
      precio_unitario: producto.precio_costo || 0,
      producto_info: {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        precio_costo: producto.precio_costo,
        stock_actual: producto.stock_actual
      }
    };

    // Recalcular subtotal
    const cantidad = parseFloat(nuevosDetalles[index].cantidad) || 0;
    const precio = parseFloat(nuevosDetalles[index].precio_unitario) || 0;
    nuevosDetalles[index].subtotal = cantidad * precio;

    setDetalles(nuevosDetalles);
    setBusquedaProductos('');
    setMostrandoSugerencias(false);
    setProductosSugeridos([]);
    calcularTotal(nuevosDetalles);

    // Enfocar el campo de cantidad
    setTimeout(() => {
      const cantidadInput = document.getElementById(`cantidad-${index}`);
      if (cantidadInput) cantidadInput.focus();
    }, 100);
  };

  /**
   * Limpia la selección de producto
   */
  const limpiarProductoSeleccionado = (index) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index] = {
      producto_id: '',
      cantidad: nuevosDetalles[index].cantidad, // Mantener cantidad si ya tenía
      precio_unitario: '',
      subtotal: 0,
      producto_info: null
    };
    setDetalles(nuevosDetalles);
    calcularTotal(nuevosDetalles);
    setBusquedaProductos('');
    setMostrandoSugerencias(false);
  };

  /**
   * Maneja cambios en los datos generales de la compra
   */
  const handleCompraChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  /**
   * Maneja cambios en los detalles de productos
   */
  const handleDetalleChange = (e, index) => {
    const { name, value } = e.target;
    
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index] = {
      ...nuevosDetalles[index],
      [name]: value
    };
    
    // Si cambió cantidad o precio, recalcular subtotal
    if (name === 'cantidad' || name === 'precio_unitario') {
      const cantidad = name === 'cantidad' 
        ? parseFloat(value) || 0 
        : parseFloat(nuevosDetalles[index].cantidad) || 0;
      
      const precio = name === 'precio_unitario' 
        ? parseFloat(value) || 0 
        : parseFloat(nuevosDetalles[index].precio_unitario) || 0;
      
      nuevosDetalles[index].subtotal = cantidad * precio;
    }
    
    setDetalles(nuevosDetalles);
    calcularTotal(nuevosDetalles);
  };
  
  /**
   * Calcula el total de la compra
   */
  const calcularTotal = (items) => {
    const nuevoTotal = items.reduce(
      (sum, item) => sum + (parseFloat(item.subtotal) || 0), 
      0
    );
    setTotal(nuevoTotal);
  };
  
  /**
   * Agrega una nueva línea de detalle
   */
  const agregarDetalle = () => {
    setDetalles([
      ...detalles,
      { producto_id: '', cantidad: '', precio_unitario: '', subtotal: 0, producto_info: null }
    ]);
  };
  
  /**
   * Elimina una línea de detalle
   */
  const eliminarDetalle = (index) => {
    if (detalles.length === 1) {
      toast.warning('Debe mantener al menos un producto');
      return;
    }
    
    const nuevosDetalles = detalles.filter((_, i) => i !== index);
    setDetalles(nuevosDetalles);
    calcularTotal(nuevosDetalles);
  };
  
  /**
   * Formatea un valor numérico a 2 decimales
   */
  const formatearNumero = (valor) => {
    return parseFloat(valor || 0).toFixed(2);
  };
  
  /**
   * Valida el formulario antes de enviar
   */
  const validarFormulario = () => {
    if (!formData.proveedor_id) {
      toast.error('Debes seleccionar un proveedor');
      return false;
    }
    
    if (detalles.length === 0) {
      toast.error('Debes agregar al menos un producto');
      return false;
    }
    
    // Verificar que todos los detalles tengan producto, cantidad y precio
    for (let i = 0; i < detalles.length; i++) {
      const detalle = detalles[i];
      if (!detalle.producto_id || !detalle.cantidad || !detalle.precio_unitario) {
        toast.error(`Falta información en el producto #${i+1}`);
        return false;
      }
      
      if (parseFloat(detalle.cantidad) <= 0) {
        toast.error(`La cantidad debe ser mayor a 0 en el producto #${i+1}`);
        return false;
      }
      
      if (parseFloat(detalle.precio_unitario) <= 0) {
        toast.error(`El precio debe ser mayor a 0 en el producto #${i+1}`);
        return false;
      }
    }
    
    return true;
  };
  
  /**
   * Envía el formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }
    
    if (!sucursalSeleccionada) {
      toast.error('No hay sucursal seleccionada. Por favor seleccione una sucursal.');
      return;
    }
    
    setGuardando(true);
    
    // Preparar datos para enviar
    const compra = {
      proveedor_id: formData.proveedor_id,
      sucursal_id: sucursalSeleccionada.id,
      sucursal_nombre: sucursalSeleccionada.nombre,
      notas: formData.notas
    };
    
    // Preparar detalles sin el campo subtotal (se calcula en el backend)
    const detallesLimpios = detalles.map(({ subtotal, producto_info, ...rest }) => ({
      ...rest,
      cantidad: parseFloat(rest.cantidad),
      precio_unitario: parseFloat(rest.precio_unitario)
    }));
    
    try {
      const response = await comprasService.crear(compra, detallesLimpios);
      
      toast.success('Compra registrada correctamente');
      const compraId = response.data?.id || response.id || response;
      navigate(`/compras/${compraId}`);
    } catch (error) {
      console.error('Error al crear compra:', error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Error al registrar la compra');
      }
    } finally {
      setGuardando(false);
    }
  };
  
  // Si está cargando, mostrar spinner
  if (loadingProveedores || loadingProductos) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Nueva Compra</h1>
        
        <Button
          color="secondary"
          onClick={() => navigate('/compras')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Panel izquierdo: Datos generales - Ancho fijo */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <Card
              title="Información de la Compra"
              icon={<FaShoppingCart />}
            >
              <div className="space-y-4">
                {/* Mostrar sucursal actual */}
                <div className="bg-blue-50 rounded-md p-3 flex items-center">
                  <FaStore className="text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Sucursal:</p>
                    <p className="text-sm text-blue-700">
                      {sucursalSeleccionada?.nombre || 'No seleccionada'}
                    </p>
                  </div>
                </div>
                
                {/* Selección de proveedor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor *
                  </label>
                  <div className="relative">
                    <FaUserTie className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <select
                      name="proveedor_id"
                      value={formData.proveedor_id}
                      onChange={handleCompraChange}
                      className="block w-full pl-10 pr-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    >
                      <option value="">Selecciona un proveedor</option>
                      {proveedores.map(proveedor => (
                        <option key={proveedor.id} value={proveedor.id}>
                          {proveedor.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Notas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    name="notas"
                    value={formData.notas}
                    onChange={handleCompraChange}
                    rows={3}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Observaciones o detalles adicionales..."
                  />
                </div>
                
                {/* Resumen */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total:</span>
                    <span className="text-indigo-600">${formatearNumero(total)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Panel derecho: Detalles de productos - Ocupa todo el espacio restante */}
          <div className="flex-1 min-w-0">
            <Card
              title="Productos"
              icon={<FaBoxOpen />}
            >
              <div>
                {/* Encabezados de tabla con ancho completo */}
                <div className="w-full">
                  <div className="flex gap-4 mb-3 px-1">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600">Producto *</label>
                    </div>
                    <div className="w-24 text-center flex-shrink-0">
                      <label className="text-xs font-medium text-gray-600">Cantidad *</label>
                    </div>
                    <div className="w-32 text-center flex-shrink-0">
                      <label className="text-xs font-medium text-gray-600">Precio Unit. *</label>
                    </div>
                    <div className="w-32 text-center flex-shrink-0">
                      <label className="text-xs font-medium text-gray-600">Subtotal</label>
                    </div>
                    <div className="w-10 flex-shrink-0"></div>
                  </div>
                  
                  {/* Lista de productos */}
                  <div className="space-y-2 w-full">
                    {detalles.map((detalle, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3 w-full">
                        <div className="flex gap-4 items-start">
                          
                          {/* Búsqueda de producto - Ocupa todo el espacio disponible */}
                          <div className="flex-1 min-w-0 relative">
                            {detalle.producto_info ? (
                              // Producto seleccionado
                              <div className="bg-white border border-green-200 rounded-md p-3">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 min-w-0 pr-2">
                                    <p className="font-medium text-base text-gray-900">
                                      {detalle.producto_info.nombre}
                                    </p>
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                      <FaBarcode className="mr-1" size={12} />
                                      {detalle.producto_info.codigo}
                                      <span className="mx-2">•</span>
                                      <span className="text-green-600">
                                        Stock: {detalle.producto_info.stock_actual}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => limpiarProductoSeleccionado(index)}
                                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded flex-shrink-0"
                                  >
                                    <FaTimes size={14} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Búsqueda de producto
                              <div className="relative">
                                <div className="relative">
                                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
                                  <input
                                    type="text"
                                    placeholder="Buscar producto por nombre o código..."
                                    value={filaActivaBusqueda === index ? busquedaProductos : ''}
                                    onChange={(e) => handleBusquedaChange(e, index)}
                                    onKeyDown={(e) => handleBusquedaKeyDown(e, index)}
                                    onFocus={() => setFilaActivaBusqueda(index)}
                                    className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                  />
                                </div>
                                
                                {/* Sugerencias de productos */}
                                {mostrandoSugerencias && filaActivaBusqueda === index && productosSugeridos.length > 0 && (
                                  <div className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
                                    {productosSugeridos.map((producto, suggestionIndex) => (
                                      <div
                                        key={producto.id}
                                        className={`px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${
                                          suggestionIndex === indiceSugerenciaActiva ? 'bg-indigo-50' : ''
                                        }`}
                                        onClick={() => seleccionarProducto(producto, index)}
                                      >
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-gray-900 truncate">
                                              {producto.nombre}
                                            </p>
                                            <div className="flex items-center text-xs text-gray-500">
                                              <span>Código: {producto.codigo}</span>
                                              <span className="mx-1">•</span>
                                              <span className="text-blue-600">
                                                ${producto.precio_costo?.toLocaleString() || 0}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="text-right ml-2">
                                            <p className="text-xs text-gray-500">
                                              Stock: {producto.stock_actual}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Cantidad */}
                          <div className="w-24 flex-shrink-0">
                            <input
                              id={`cantidad-${index}`}
                              type="number"
                              name="cantidad"
                              value={detalle.cantidad}
                              onChange={(e) => handleDetalleChange(e, index)}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 text-center"
                              min="0.01"
                              step="0.01"
                              required
                              disabled={!detalle.producto_id}
                              placeholder="0"
                            />
                          </div>
                          
                          {/* Precio Unitario */}
                          <div className="w-32 flex-shrink-0">
                            <input
                              type="number"
                              name="precio_unitario"
                              value={detalle.precio_unitario}
                              onChange={(e) => handleDetalleChange(e, index)}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 text-center"
                              min="0.01"
                              step="0.01"
                              required
                              disabled={!detalle.producto_id}
                              placeholder="0.00"
                            />
                          </div>
                          
                          {/* Subtotal */}
                          <div className="w-32 flex-shrink-0">
                            <div className="block w-full px-3 py-2.5 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-center">
                              ${formatearNumero(detalle.subtotal)}
                            </div>
                          </div>
                          
                          {/* Botón eliminar */}
                          <div className="w-10 flex-shrink-0 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => eliminarDetalle(index)}
                              disabled={detalles.length === 1}
                              className={`p-2 rounded-md transition-colors ${
                                detalles.length === 1 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                              }`}
                              title="Eliminar producto"
                            >
                              <FaTrash size={14} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Advertencia si no hay stock */}
                        {detalle.producto_info && detalle.producto_info.stock_actual <= 0 && (
                          <div className="mt-1.5 mx-1 flex items-center text-amber-600 text-xs bg-amber-50 p-1.5 rounded">
                            <FaExclamationTriangle size={11} className="mr-1" />
                            Este producto no tiene stock actual
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Botón para agregar nuevo producto */}
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={agregarDetalle}
                    className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center"
                  >
                    <FaPlus className="mr-2" size={14} />
                    Agregar Producto
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        {/* Botones de acción - Movidos abajo */}
        <div className="flex justify-end space-x-2 mt-6">
          <Button
            type="button"
            color="secondary"
            onClick={() => navigate('/compras')}
            icon={<FaTimes />}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            color="primary"
            loading={guardando}
            icon={<FaSave />}
            disabled={!sucursalSeleccionada}
          >
            Guardar Compra
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CompraForm;