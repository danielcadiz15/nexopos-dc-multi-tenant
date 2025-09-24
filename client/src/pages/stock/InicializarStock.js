// src/pages/stock/InicializarStock.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Servicios
import productosService from '../../services/productos.service';
import stockSucursalService from '../../services/stock-sucursal.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import SearchBar from '../../components/common/SearchBar';

// Iconos
import { 
  FaBoxOpen, FaArrowLeft, FaSave, FaPlus, FaTrash,
  FaStore, FaExclamationTriangle
} from 'react-icons/fa';

const InicializarStock = () => {
  const navigate = useNavigate();
  const { sucursalSeleccionada } = useAuth();
  
  // Estado
  const [productos, setProductos] = useState([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inicializando, setInicializando] = useState(false);
  
  // Cargar productos al montar
  useEffect(() => {
    cargarProductos();
  }, []);
  
  /**
   * Carga todos los productos disponibles
   */
  const cargarProductos = async () => {
    try {
      setLoadingProductos(true);
      const productosData = await productosService.obtenerTodos();
      setProductos(productosData);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast.error('Error al cargar los productos');
    } finally {
      setLoadingProductos(false);
    }
  };
  
  /**
   * Agrega un producto para inicializar
   */
  const agregarProducto = (producto) => {
    const existe = productosSeleccionados.find(p => p.producto_id === producto.id);
    
    if (existe) {
      toast.warning('Este producto ya está en la lista');
      return;
    }
    
    setProductosSeleccionados([
      ...productosSeleccionados,
      {
        producto_id: producto.id,
        producto,
        cantidad: 0,
        stock_minimo: 5
      }
    ]);
    
    setSearchTerm('');
  };
  
  /**
   * Actualiza valores del producto
   */
  const actualizarProducto = (productoId, campo, valor) => {
    setProductosSeleccionados(productos =>
      productos.map(p => {
        if (p.producto_id === productoId) {
          return {
            ...p,
            [campo]: parseInt(valor) || 0
          };
        }
        return p;
      })
    );
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
   * Agrega todos los productos
   */
  const agregarTodos = () => {
    const nuevosProductos = productos
      .filter(p => !productosSeleccionados.find(ps => ps.producto_id === p.id))
      .map(p => ({
        producto_id: p.id,
        producto: p,
        cantidad: 0,
        stock_minimo: 5
      }));
    
    setProductosSeleccionados([
      ...productosSeleccionados,
      ...nuevosProductos
    ]);
    
    toast.success(`${nuevosProductos.length} productos agregados`);
  };
  
  /**
   * Filtra productos según búsqueda
   */
  const productosFiltrados = productos.filter(producto => {
    if (!searchTerm) return true;
    
    const termino = searchTerm.toLowerCase();
    return (
      producto.nombre?.toLowerCase().includes(termino) ||
      producto.codigo?.toLowerCase().includes(termino)
    );
  });
  
  /**
   * Inicializa el stock
   */
  const inicializarStock = async () => {
    if (productosSeleccionados.length === 0) {
      toast.error('Debe seleccionar al menos un producto');
      return;
    }
    
    setInicializando(true);
    
    try {
      const productosParaInicializar = productosSeleccionados.map(p => ({
        producto_id: p.producto_id,
        cantidad: p.cantidad,
        stock_minimo: p.stock_minimo
      }));
      
      await stockSucursalService.inicializarStock(
        sucursalSeleccionada.id,
        productosParaInicializar
      );
      
      toast.success('Stock inicializado correctamente');
      navigate('/stock');
    } catch (error) {
      console.error('Error al inicializar stock:', error);
      toast.error('Error al inicializar el stock');
    } finally {
      setInicializando(false);
    }
  };
  
  if (!sucursalSeleccionada) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <FaStore className="mx-auto text-4xl text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">
            No hay sucursal seleccionada
          </h3>
          <p className="text-gray-500">
            Por favor, selecciona una sucursal desde el menú superior
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Inicializar Stock
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            <FaStore className="inline mr-1" />
            {sucursalSeleccionada.nombre}
          </p>
        </div>
        
        <Button
          color="secondary"
          onClick={() => navigate('/stock')}
          icon={<FaArrowLeft />}
        >
          Volver
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: Productos disponibles */}
        <Card title="Productos Disponibles" icon={<FaBoxOpen />}>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchBar
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onSearch={() => {}}
                  onClear={() => setSearchTerm('')}
                />
              </div>
              <Button
                size="sm"
                color="secondary"
                onClick={agregarTodos}
                disabled={productos.length === productosSeleccionados.length}
              >
                Agregar Todos
              </Button>
            </div>
            
            {loadingProductos ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {productosFiltrados.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    No se encontraron productos
                  </div>
                ) : (
                  <div className="space-y-2">
                    {productosFiltrados.map(producto => {
                      const yaSeleccionado = productosSeleccionados.find(
                        p => p.producto_id === producto.id
                      );
                      
                      return (
                        <div
                          key={producto.id}
                          className={`p-3 border rounded-lg ${
                            yaSeleccionado 
                              ? 'bg-gray-100 border-gray-300' 
                              : 'hover:bg-gray-50 cursor-pointer border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {producto.nombre}
                              </div>
                              <div className="text-xs text-gray-500">
                                Código: {producto.codigo}
                              </div>
                            </div>
                            
                            {!yaSeleccionado && (
                              <Button
                                size="sm"
                                color="primary"
                                onClick={() => agregarProducto(producto)}
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
        <Card title="Productos a Inicializar" icon={<FaBoxOpen />}>
          {productosSeleccionados.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <FaBoxOpen className="mx-auto text-4xl text-gray-300 mb-2" />
              <p>No hay productos seleccionados</p>
              <p className="text-sm mt-1">
                Agrega productos desde el panel izquierdo
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg flex items-start">
                <FaExclamationTriangle className="text-yellow-600 mt-0.5 mr-2" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Importante:</p>
                  <p>Solo se inicializarán productos que no tengan stock previo en esta sucursal.</p>
                </div>
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {productosSeleccionados.map(item => (
                  <div key={item.producto_id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {item.producto.nombre}
                        </div>
                        <div className="text-xs text-gray-500">
                          Código: {item.producto.codigo}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => quitarProducto(item.producto_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Cantidad Inicial
                        </label>
                        <input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => actualizarProducto(item.producto_id, 'cantidad', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          min="0"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Stock Mínimo
                        </label>
                        <input
                          type="number"
                          value={item.stock_minimo}
                          onChange={(e) => actualizarProducto(item.producto_id, 'stock_minimo', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-600">
                    Total productos: <span className="font-medium">{productosSeleccionados.length}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Total unidades: <span className="font-medium">
                      {productosSeleccionados.reduce((sum, p) => sum + p.cantidad, 0)}
                    </span>
                  </div>
                </div>
                
                <Button
                  color="primary"
                  fullWidth
                  onClick={inicializarStock}
                  loading={inicializando}
                  icon={<FaSave />}
                >
                  Inicializar Stock
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default InicializarStock;