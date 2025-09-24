/**
 * Página de ajuste de stock por sucursal
 * 
 * Permite realizar ajustes manuales al inventario de un producto
 * en la sucursal seleccionada.
 * 
 * @module pages/stock/AjusteStock
 * @requires react, react-router-dom, ../../services/stock-sucursal.service
 * @related_files ./Stock.js
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Servicios
import productosService from '../../services/productos.service';
import stockSucursalService from '../../services/stock-sucursal.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaBoxOpen, FaArrowLeft, FaSave, FaTimes,
  FaArrowUp, FaArrowDown, FaHistory, FaStore,
  FaExchangeAlt
} from 'react-icons/fa';

/**
 * Componente de página para ajustar stock de un producto en una sucursal
 * @returns {JSX.Element} Componente AjusteStock
 */
const AjusteStock = () => {
  const { id: productoId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { sucursalSeleccionada, currentUser } = useAuth();
  
  // Obtener datos pasados desde la navegación
  const stockItem = location.state?.stockItem;
  const sucursalId = location.state?.sucursalId || sucursalSeleccionada?.id;
  
  // Estado
  const [producto, setProducto] = useState(null);
  const [stockActual, setStockActual] = useState(0);
  const [stockMinimo, setStockMinimo] = useState(5);
  const [loading, setLoading] = useState(true);
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  
  // Estado del formulario
  const [cantidad, setCantidad] = useState('');
  const [tipoAjuste, setTipoAjuste] = useState('absoluto'); // 'absoluto' o 'relativo'
  const [cantidadAjuste, setCantidadAjuste] = useState('');
  const [motivo, setMotivo] = useState('');
  const [ajustando, setAjustando] = useState(false);
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        
        // Si tenemos stockItem desde la navegación, usarlo
        if (stockItem) {
          setProducto(stockItem.producto);
          setStockActual(stockItem.cantidad);
          setStockMinimo(stockItem.stock_minimo);
          setCantidad(stockItem.cantidad.toString());
        } else {
          // Si no, cargar producto y buscar su stock en la sucursal
          const productoData = await productosService.obtenerPorId(productoId);
          setProducto(productoData);
          
          // Buscar stock del producto en la sucursal actual
          const stockSucursal = await stockSucursalService.obtenerStockPorProducto(productoId);
          const stockEnSucursal = stockSucursal.find(s => s.sucursal_id === sucursalId);
          
          if (stockEnSucursal) {
            setStockActual(stockEnSucursal.cantidad);
            setStockMinimo(stockEnSucursal.stock_minimo);
            setCantidad(stockEnSucursal.cantidad.toString());
          } else {
            // Si no hay stock en esta sucursal, inicializar en 0
            setStockActual(0);
            setCantidad('0');
          }
        }
        
        // Cargar historial de movimientos
        await cargarHistorial();
      } catch (error) {
        console.error('Error al cargar datos:', error);
        toast.error('Error al cargar los datos del producto');
      } finally {
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [productoId, stockItem, sucursalId]);
  
  /**
   * Carga el historial de movimientos
   */
  const cargarHistorial = async () => {
    try {
      setLoadingHistorial(true);
      const movimientos = await stockSucursalService.obtenerMovimientos(sucursalId, {
        producto_id: productoId,
        limit: 10
      });
      setHistorial(movimientos);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setLoadingHistorial(false);
    }
  };
  
  /**
   * Maneja el cambio en el tipo de ajuste
   */
  const handleTipoAjusteChange = (tipo) => {
    setTipoAjuste(tipo);
    if (tipo === 'absoluto') {
      setCantidad(stockActual.toString());
      setCantidadAjuste('');
    } else {
      setCantidad('');
      setCantidadAjuste('');
    }
  };
  
  /**
   * Calcula la cantidad final según el tipo de ajuste
   */
  const calcularCantidadFinal = () => {
    if (tipoAjuste === 'absoluto') {
      return parseFloat(cantidad) || 0;
    } else {
      const ajuste = parseFloat(cantidadAjuste) || 0;
      return Math.max(0, stockActual + ajuste);
    }
  };
  
  /**
 * Envía el formulario para ajustar stock
 */
	const handleSubmit = async (e) => {
	  e.preventDefault();
	  
	  if (!motivo.trim()) {
		toast.error('El motivo del ajuste es requerido');
		return;
	  }
	  
	  const cantidadFinal = calcularCantidadFinal();
	  const diferencia = cantidadFinal - stockActual;
	  
	  if (diferencia === 0) {
		toast.warning('No hay cambios en el stock');
		return;
	  }
	  
	  setAjustando(true);
	  
	  try {
		// Si es ajuste relativo, usar el método de ajuste
		if (tipoAjuste === 'relativo') {
		  await stockSucursalService.ajustarStock(
			sucursalId,
			productoId,
			diferencia,
			motivo
		  );
		} else {
		  // Si es absoluto, actualizar directamente (NO llamar a ajustarStock después)
		  await stockSucursalService.actualizarStock(
			sucursalId,
			productoId,
			cantidadFinal
		  );
		  if (producto.codigo) {
			const { default: stockSyncService } = await import('../../services/stockSync.service');
			await stockSyncService.sincronizarStock(
			  producto.codigo, 
			  cantidadFinal,  // CAMBIO: usar cantidadFinal en lugar de nuevoStock
			  'producto'
			);
		  }
		  // NO registrar el movimiento manualmente aquí
		}
		
		toast.success('Stock ajustado correctamente');
		
		// Actualizar datos
		setStockActual(cantidadFinal);
		await cargarHistorial();
		// AGREGAR ESTO - Forzar actualización en la vista principal
		if (location.state?.onUpdate) {
		  location.state.onUpdate();
		}

		// O navegar de vuelta con un flag de actualización
		setTimeout(() => {
		  navigate('/stock', { state: { updated: true } });
		}, 1500);
		
		// Limpiar formulario
		setMotivo('');
		if (tipoAjuste === 'relativo') {
		  setCantidadAjuste('');
		}
	  } catch (error) {
		console.error('Error al ajustar stock:', error);
		toast.error('Error al ajustar el stock');
	  } finally {
		setAjustando(false);
	  }
	};
  
	/**
	 * Ver historial completo de movimientos
	 * @param {string} productoId - ID del producto
	 */
	const verHistorialMovimientos = (productoId) => {
	  navigate(`/stock/movimientos/${productoId}`, {
		state: { 
		  sucursalId: sucursalSeleccionada.id,
		  producto: producto
		}
	  });
	};

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  // Si no se encontró el producto
  if (!producto) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <FaBoxOpen className="mx-auto text-4xl text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">
            Producto no encontrado
          </h3>
          <p className="text-gray-500 mb-4">
            El producto que intentas ajustar no existe o ha sido eliminado.
          </p>
          <Button
            color="primary"
            onClick={() => navigate('/stock')}
            icon={<FaArrowLeft />}
          >
            Volver al Inventario
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ajuste de Inventario</h1>
          <p className="text-gray-600 text-sm mt-1">
            <FaStore className="inline mr-1" />
            {sucursalSeleccionada?.nombre || 'Sucursal'}
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
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo: Información del producto y stock */}
        <Card
          title="Información del Producto"
          icon={<FaBoxOpen />}
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                {producto.nombre}
              </h3>
              <p className="text-gray-600">
                <span className="font-medium">Código:</span> {producto.codigo}
              </p>
              {producto.descripcion && (
                <p className="text-gray-600 text-sm mt-1">
                  {producto.descripcion}
                </p>
              )}
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">
                Stock en esta Sucursal
              </h4>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Stock Actual:</span>
                  <span className={`
                    px-3 py-1 rounded-full text-sm font-medium
                    ${stockActual <= stockMinimo
                      ? 'text-red-600 bg-red-100'
                      : stockActual <= stockMinimo * 1.5
                        ? 'text-yellow-600 bg-yellow-100'
                        : 'text-green-600 bg-green-100'
                    }
                  `}>
                    {stockActual}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Stock Mínimo:</span>
                  <span className="text-gray-800 font-medium">{stockMinimo}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Estado:</span>
                  <span className="text-gray-800">
                    {stockActual <= 0 
                      ? 'Sin stock'
                      : stockActual <= stockMinimo
                        ? 'Stock crítico'
                        : stockActual <= stockMinimo * 1.5
                          ? 'Stock bajo'
                          : 'Stock normal'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">
                Información de Costos
              </h4>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Precio Costo:</span>
                  <span className="text-gray-800">
                    ${parseFloat(producto.precio_costo || 0).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Precio Venta:</span>
                  <span className="text-gray-800">
                    ${parseFloat(producto.precio_venta || 0).toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Valor en Stock:</span>
                  <span className="text-gray-800 font-medium">
                    ${(stockActual * parseFloat(producto.precio_costo || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Panel central: Formulario de ajuste */}
        <Card
          title="Realizar Ajuste"
          icon={<FaArrowUp />}
        >
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Tipo de ajuste */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Ajuste
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTipoAjusteChange('absoluto')}
                    className={`
                      px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${tipoAjuste === 'absoluto'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                    `}
                  >
                    Cantidad Total
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTipoAjusteChange('relativo')}
                    className={`
                      px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${tipoAjuste === 'relativo'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                    `}
                  >
                    Sumar/Restar
                  </button>
                </div>
              </div>
              
              {/* Campo de cantidad según tipo */}
              {tipoAjuste === 'absoluto' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva Cantidad Total
                  </label>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    min="0.001"
					step="0.001"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {parseFloat(cantidad) > stockActual
                      ? `+${parseFloat(cantidad) - stockActual} unidades`
                      : parseFloat(cantidad) < stockActual
                        ? `-${stockActual - parseFloat(cantidad)} unidades`
                        : 'Sin cambios'}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad a Ajustar
                  </label>
                  <input
                    type="number"
                    value={cantidadAjuste}
                    onChange={(e) => setCantidadAjuste(e.target.value)}
					step="any"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: 10 o -5"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Stock resultante: {calcularCantidadFinal()} unidades
                  </p>
                </div>
              )}
              
              {/* Motivo del ajuste */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo del Ajuste <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Explica el motivo del ajuste..."
                  required
                />
              </div>
              
              {/* Resumen del ajuste */}
              {(tipoAjuste === 'absoluto' ? (parseFloat(cantidad) !== stockActual) : (cantidadAjuste !== '')) && (
                <div className="bg-gray-50 rounded-md p-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Resumen del Ajuste
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stock actual:</span>
                      <span className="font-medium">{stockActual}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cambio:</span>
                      <span className={`font-medium ${
                        calcularCantidadFinal() > stockActual 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {calcularCantidadFinal() > stockActual ? '+' : ''}
                        {calcularCantidadFinal() - stockActual}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-gray-700 font-medium">Stock final:</span>
                      <span className="font-medium text-indigo-600">
                        {calcularCantidadFinal()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Botones de acción */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  color="secondary"
                  onClick={() => navigate('/stock')}
                  icon={<FaTimes />}
                >
                  Cancelar
                </Button>
                
                <Button
                  type="submit"
                  color="primary"
                  loading={ajustando}
                  disabled={
                    tipoAjuste === 'absoluto' 
                      ? parseFloat(cantidad) === stockActual
                      : !cantidadAjuste || parseFloat(cantidadAjuste) === 0
                  }
                  icon={<FaSave />}
                >
                  Guardar Ajuste
                </Button>
              </div>
            </div>
          </form>
        </Card>
        
        {/* Panel derecho: Historial de movimientos */}
        <Card
          title="Últimos Movimientos"
          icon={<FaHistory />}
        >
          {loadingHistorial ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              {historial.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">
                    No hay movimientos registrados para este producto en esta sucursal.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {historial.map(movimiento => (
                    <div 
                      key={movimiento.id}
                      className="border rounded-lg p-3 bg-gray-50"
                    >
                      <div className="flex items-start">
                        <div className={`
                          p-2 rounded-full mr-3 flex-shrink-0
                          ${movimiento.tipo === 'entrada' 
                            ? 'bg-green-100 text-green-600' 
                            : movimiento.tipo === 'salida'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-blue-100 text-blue-600'}
                        `}>
                          {movimiento.tipo === 'entrada' 
                            ? <FaArrowUp /> 
                            : movimiento.tipo === 'salida'
                              ? <FaArrowDown />
                              : <FaExchangeAlt />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-sm">
                              {movimiento.tipo === 'entrada' 
                                ? 'Entrada' 
                                : movimiento.tipo === 'salida'
                                  ? 'Salida'
                                  : 'Transferencia'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(movimiento.fecha).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1">
                            {movimiento.motivo}
                          </p>
                          
                          <div className="flex justify-between mt-2 text-xs">
                            <span className="text-gray-500">
                              Cantidad: 
                              <span className="font-medium text-gray-700 ml-1">
                                {movimiento.cantidad}
                              </span>
                            </span>
                            <span className="text-gray-500">
                              Stock: {movimiento.stock_anterior} → {movimiento.stock_nuevo}
                            </span>
                          </div>
                          
                          {movimiento.usuario_id && (
                            <div className="text-xs text-gray-500 mt-1">
                              Por: {movimiento.usuario_nombre || movimiento.usuario_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {historial.length > 0 && (
                <div className="text-center pt-3 border-t">
                  <button
                    onClick={() => verHistorialMovimientos(productoId)}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    Ver historial completo
                  </button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AjusteStock;