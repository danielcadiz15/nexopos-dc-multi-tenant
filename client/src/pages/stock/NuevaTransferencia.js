// src/pages/stock/NuevaTransferencia.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Servicios
import transferenciasService from '../../services/transferencias.service';
import stockSucursalService from '../../services/stock-sucursal.service';
import sucursalesService from '../../services/sucursales.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import SearchBar from '../../components/common/SearchBar';

// Iconos
import { 
  FaExchangeAlt, FaStore, FaArrowRight, FaPlus, FaMinus,
  FaTrash, FaBoxOpen, FaSave, FaTimes, FaArrowLeft,
  FaExclamationTriangle
} from 'react-icons/fa';

/**
 * Componente para crear nueva transferencia entre sucursales
 */
const NuevaTransferencia = () => {
  const navigate = useNavigate();
  const { currentUser, sucursalSeleccionada, sucursalesDisponibles } = useAuth();
  
  // Estado
  const [sucursalOrigen, setSucursalOrigen] = useState('');
  const [sucursalDestino, setSucursalDestino] = useState('');
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [motivo, setMotivo] = useState('');
  const [creando, setCreando] = useState(false);
  
  // Inicializar sucursal origen si hay una seleccionada
  useEffect(() => {
    if (sucursalSeleccionada && !sucursalOrigen) {
      setSucursalOrigen(sucursalSeleccionada.id);
    }
  }, [sucursalSeleccionada]);
  
  // Cargar productos cuando se selecciona sucursal origen
  useEffect(() => {
    if (sucursalOrigen) {
      cargarProductosDisponibles();
    } else {
      setProductosDisponibles([]);
      setProductosSeleccionados([]);
    }
  }, [sucursalOrigen]);
  
  /**
   * Carga los productos disponibles en la sucursal origen
   */
  const cargarProductosDisponibles = async () => {
    try {
      setLoadingProductos(true);
      const stock = await stockSucursalService.obtenerStockPorSucursal(sucursalOrigen);
      
      // Filtrar solo productos con stock > 0
      const productosConStock = stock.filter(item => item.cantidad > 0);
      setProductosDisponibles(productosConStock);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast.error('Error al cargar los productos disponibles');
    } finally {
      setLoadingProductos(false);
    }
  };
  
  /**
   * Agrega un producto a la transferencia
   */
  const agregarProducto = (stockItem) => {
    // Verificar si ya está en la lista
    const existe = productosSeleccionados.find(p => p.producto_id === stockItem.producto_id);
    
    if (existe) {
      toast.warning('Este producto ya está en la lista');
      return;
    }
    
    // Agregar con cantidad inicial 1
    setProductosSeleccionados([
      ...productosSeleccionados,
      {
        ...stockItem,
        cantidad_transferir: 1,
        cantidad_maxima: stockItem.cantidad
      }
    ]);
    
    // Limpiar búsqueda
    setSearchTerm('');
  };
  
  /**
   * Actualiza la cantidad a transferir
   */
  const actualizarCantidad = (productoId, cantidad) => {
    setProductosSeleccionados(productos =>
      productos.map(p => {
        if (p.producto_id === productoId) {
          const cantidadNum = parseInt(cantidad) || 0;
          return {
            ...p,
            cantidad_transferir: Math.min(Math.max(0, cantidadNum), p.cantidad_maxima)
          };
        }
        return p;
      })
    );
  };
  
  /**
   * Incrementa la cantidad
   */
  const incrementarCantidad = (productoId) => {
    const producto = productosSeleccionados.find(p => p.producto_id === productoId);
    if (producto && producto.cantidad_transferir < producto.cantidad_maxima) {
      actualizarCantidad(productoId, producto.cantidad_transferir + 1);
    }
  };
  
  /**
   * Decrementa la cantidad
   */
  const decrementarCantidad = (productoId) => {
    const producto = productosSeleccionados.find(p => p.producto_id === productoId);
    if (producto && producto.cantidad_transferir > 1) {
      actualizarCantidad(productoId, producto.cantidad_transferir - 1);
    }
  };
  
  /**
   * Quita un producto de la lista
   */
  const quitarProducto = (productoId) => {
    setProductosSeleccionados(productos =>
      productos.filter(p => p.producto_id !== productoId)
    );
  };
  
  /**
   * Filtra productos según búsqueda
   */
  const productosFiltrados = productosDisponibles.filter(item => {
    if (!searchTerm) return true;
    
    const termino = searchTerm.toLowerCase();
    return (
      item.producto?.nombre?.toLowerCase().includes(termino) ||
      item.producto?.codigo?.toLowerCase().includes(termino)
    );
  });
  
  /**
   * Valida y crea la transferencia
   */
  const crearTransferencia = async () => {
    // Validaciones
    if (!sucursalOrigen || !sucursalDestino) {
      toast.error('Debe seleccionar las sucursales de origen y destino');
      return;
    }
    
    if (sucursalOrigen === sucursalDestino) {
      toast.error('Las sucursales de origen y destino deben ser diferentes');
      return;
    }
    
    if (productosSeleccionados.length === 0) {
      toast.error('Debe agregar al menos un producto');
      return;
    }
    
    if (!motivo.trim()) {
      toast.error('Debe especificar un motivo para la transferencia');
      return;
    }
    
    setCreando(true);
    
    try {
      // Preparar datos de la transferencia
      const transferencia = {
        sucursal_origen_id: sucursalOrigen,
        sucursal_destino_id: sucursalDestino,
        productos: productosSeleccionados.map(p => ({
          producto_id: p.producto_id,
          cantidad: p.cantidad_transferir
        })),
        motivo: motivo.trim(),
        usuario_id: currentUser.id
      };
      
      await transferenciasService.crear(transferencia);
      
      toast.success('Transferencia creada correctamente. Pendiente de aprobación.');
      navigate('/stock/transferencias');
    } catch (error) {
      console.error('Error al crear transferencia:', error);
      toast.error('Error al crear la transferencia');
    } finally {
      setCreando(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Nueva Transferencia
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Solicitar movimiento de productos entre sucursales
          </p>
        </div>
        
        <Button
          color="secondary"
          onClick={() => navigate('/stock/transferencias')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      {/* Selección de sucursales */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sucursal Origen
            </label>
            <select
              value={sucursalOrigen}
              onChange={(e) => setSucursalOrigen(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Seleccionar sucursal...</option>
              {sucursalesDisponibles.map(sucursal => (
                <option key={sucursal.id} value={sucursal.id}>
                  {sucursal.nombre}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sucursal Destino
            </label>
            <select
              value={sucursalDestino}
              onChange={(e) => setSucursalDestino(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!sucursalOrigen}
            >
              <option value="">Seleccionar sucursal...</option>
              {sucursalesDisponibles
                .filter(s => s.id !== sucursalOrigen)
                .map(sucursal => (
                  <option key={sucursal.id} value={sucursal.id}>
                    {sucursal.nombre}
                  </option>
                ))}
            </select>
          </div>
        </div>
        
        {sucursalOrigen && sucursalDestino && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md flex items-center justify-center text-blue-700">
            <FaStore className="mr-2" />
            <span className="font-medium">
              {sucursalesDisponibles.find(s => s.id === sucursalOrigen)?.nombre}
            </span>
            <FaArrowRight className="mx-3" />
            <FaStore className="mr-2" />
            <span className="font-medium">
              {sucursalesDisponibles.find(s => s.id === sucursalDestino)?.nombre}
            </span>
          </div>
        )}
      </Card>
      
      {/* Selección de productos */}
      {sucursalOrigen && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel izquierdo: Productos disponibles */}
          <Card title="Productos Disponibles" icon={<FaBoxOpen />}>
            <div className="space-y-4">
              <SearchBar
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={() => {}}
                onClear={() => setSearchTerm('')}
              />
              
              {loadingProductos ? (
                <div className="flex justify-center py-10">
                  <Spinner />
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {productosFiltrados.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      {searchTerm 
                        ? 'No se encontraron productos'
                        : 'No hay productos con stock en esta sucursal'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {productosFiltrados.map(item => {
                        const yaSeleccionado = productosSeleccionados.find(
                          p => p.producto_id === item.producto_id
                        );
                        
                        return (
                          <div
                            key={item.producto_id}
                            className={`p-3 border rounded-lg ${
                              yaSeleccionado 
                                ? 'bg-gray-100 border-gray-300' 
                                : 'hover:bg-gray-50 cursor-pointer border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {item.producto?.nombre}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Código: {item.producto?.codigo} | Stock: {item.cantidad}
                                </div>
                              </div>
                              
                              {!yaSeleccionado && (
                                <Button
                                  size="sm"
                                  color="primary"
                                  onClick={() => agregarProducto(item)}
                                  icon={<FaPlus />}
                                >
                                  Agregar
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
          
          {/* Panel derecho: Productos seleccionados */}
          <Card title="Productos a Transferir" icon={<FaExchangeAlt />}>
            {productosSeleccionados.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <FaBoxOpen className="mx-auto text-4xl text-gray-300 mb-2" />
                <p>No hay productos seleccionados</p>
                <p className="text-sm mt-1">
                  Agrega productos desde el panel izquierdo
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {productosSeleccionados.map(item => (
                  <div key={item.producto_id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {item.producto?.nombre}
                        </div>
                        <div className="text-xs text-gray-500">
                          Stock disponible: {item.cantidad}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => quitarProducto(item.producto_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => decrementarCantidad(item.producto_id)}
                        className="p-1 rounded-md bg-gray-100 hover:bg-gray-200"
                        disabled={item.cantidad_transferir <= 1}
                      >
                        <FaMinus className="h-3 w-3" />
                      </button>
                      
                      <input
                        type="number"
                        value={item.cantidad_transferir}
                        onChange={(e) => actualizarCantidad(item.producto_id, e.target.value)}
                        className="w-20 px-2 py-1 text-center border border-gray-300 rounded-md"
                        min="1"
                        max={item.cantidad_maxima}
                      />
                      
                      <button
                        onClick={() => incrementarCantidad(item.producto_id)}
                        className="p-1 rounded-md bg-gray-100 hover:bg-gray-200"
                        disabled={item.cantidad_transferir >= item.cantidad_maxima}
                      >
                        <FaPlus className="h-3 w-3" />
                      </button>
                      
                      <span className="text-sm text-gray-500">
                        de {item.cantidad_maxima}
                      </span>
                    </div>
                    
                    {item.cantidad_transferir > item.cantidad_maxima * 0.8 && (
                      <div className="mt-2 text-xs text-yellow-600 flex items-center">
                        <FaExclamationTriangle className="mr-1" />
                        Transferirás más del 80% del stock
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
      
      {/* Motivo y acciones */}
      {sucursalOrigen && sucursalDestino && productosSeleccionados.length > 0 && (
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo de la Transferencia
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Explique el motivo de esta transferencia..."
              />
            </div>
            
            {/* Resumen */}
            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="font-medium text-gray-700 mb-2">Resumen de la Transferencia</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Productos a transferir:</span>
                  <span className="font-medium">{productosSeleccionados.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de unidades:</span>
                  <span className="font-medium">
                    {productosSeleccionados.reduce((sum, p) => sum + p.cantidad_transferir, 0)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Botones de acción */}
            <div className="flex justify-end space-x-3">
              <Button
                color="secondary"
                onClick={() => navigate('/stock/transferencias')}
                icon={<FaTimes />}
              >
                Cancelar
              </Button>
              
              <Button
                color="primary"
                onClick={crearTransferencia}
                loading={creando}
                icon={<FaSave />}
                disabled={!motivo.trim()}
              >
                Crear Transferencia
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default NuevaTransferencia;