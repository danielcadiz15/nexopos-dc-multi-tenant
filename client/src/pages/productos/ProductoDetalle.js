/**
 * Componente de detalle de producto
 * 
 * Muestra la información detallada de un producto y permite editar o eliminar.
 * 
 * @module pages/productos/ProductoDetalle
 * @requires react, react-router-dom, ../../services/productos.service
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import productosService from '../../services/productos.service';
import categoriasService from '../../services/categorias.service';
import proveedoresService from '../../services/proveedores.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import Tabs from '../../components/common/Tabs';
import ConfirmDialog from '../../components/common/ConfirmDialog'; // Asegúrate de importar esto

// Iconos
import { 
  FaBox, FaEdit, FaTrash, FaArrowLeft, FaHistory,
  FaTag, FaIndustry, FaBoxOpen, FaMoneyBillWave,
  FaShoppingCart, FaShoppingBag, FaExclamationTriangle,
  FaChartBar
} from 'react-icons/fa';

/**
 * Componente para mostrar los detalles de un producto
 * @returns {JSX.Element} Componente ProductoDetalle
 */
const ProductoDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estado inicial de la pestaña activa (puede venir de la navegación)
  const initialTab = location.state?.tab || 'info';
  
  // Estados
  const [producto, setProducto] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMovimientos, setLoadingMovimientos] = useState(true);
  const [loadingVentas, setLoadingVentas] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [categoria, setCategoria] = useState(null);
  const [proveedor, setProveedor] = useState(null);
  
  // Estados para el diálogo de confirmación
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  /**
   * Efecto para cargar datos del producto
   */
  useEffect(() => {
    const cargarProducto = async () => {
      try {
        const data = await productosService.obtenerPorId(id);
        setProducto(data);
        
        // Cargar datos relacionados si existen
        if (data.categoria_id) {
          try {
            const categoriaData = await categoriasService.obtenerPorId(data.categoria_id);
            setCategoria(categoriaData);
          } catch (error) {
            console.error('Error al cargar categoría:', error);
          }
        }
        
        if (data.proveedor_id) {
          try {
            const proveedorData = await proveedoresService.obtenerPorId(data.proveedor_id);
            setProveedor(proveedorData);
          } catch (error) {
            console.error('Error al cargar proveedor:', error);
          }
        }
      } catch (error) {
        console.error('Error al cargar producto:', error);
        toast.error('Error al cargar los datos del producto');
        navigate('/productos');
      } finally {
        setLoading(false);
      }
    };
    
    cargarProducto();
  }, [id, navigate]);
  
  /**
   * Efecto para cargar movimientos cuando se activa la pestaña
   */
  useEffect(() => {
    if (activeTab === 'movimientos' && id) {
      const cargarMovimientos = async () => {
        try {
          setLoadingMovimientos(true);
          const data = await productosService.obtenerMovimientos(id);
          setMovimientos(data);
        } catch (error) {
          console.error('Error al cargar movimientos:', error);
          toast.error('Error al cargar el historial de movimientos');
        } finally {
          setLoadingMovimientos(false);
        }
      };
      
      cargarMovimientos();
    }
  }, [activeTab, id]);
  
  /**
   * Efecto para cargar ventas cuando se activa la pestaña
   */
  useEffect(() => {
    if (activeTab === 'ventas' && id) {
      const cargarVentas = async () => {
        try {
          setLoadingVentas(true);
          const data = await productosService.obtenerVentas(id);
          setVentas(data);
        } catch (error) {
          console.error('Error al cargar ventas:', error);
          toast.error('Error al cargar el historial de ventas');
        } finally {
          setLoadingVentas(false);
        }
      };
      
      cargarVentas();
    }
  }, [activeTab, id]);
  
  /**
   * Prepara la eliminación de un producto mostrando el diálogo de confirmación
   * CORREGIDO: Ahora usa un ConfirmDialog en lugar de window.confirm
   */
  const prepararEliminarProducto = () => {
    setShowConfirmDialog(true);
  };
  
  /**
   * Confirma y ejecuta la eliminación del producto
   */
  const confirmarEliminarProducto = async () => {
    try {
      await productosService.eliminar(id);
      toast.success('Producto eliminado correctamente');
      navigate('/productos');
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      toast.error('Error al eliminar el producto');
    } finally {
      setShowConfirmDialog(false);
    }
  };
  
  /**
   * Pestañas disponibles
   */
  const tabs = [
    { id: 'info', label: 'Información', icon: <FaBox /> },
    { id: 'movimientos', label: 'Movimientos', icon: <FaHistory /> },
    { id: 'ventas', label: 'Ventas', icon: <FaShoppingBag /> }
  ];
  
  /**
   * Columnas para la tabla de movimientos
   */
  const columnasMovimientos = [
    {
      header: 'Fecha',
      accessor: 'fecha',
      cell: (row) => (
        <span className="text-sm">
          {new Date(row.fecha).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Tipo',
      accessor: 'tipo',
      cell: (row) => {
        const tipo = row.tipo.toLowerCase();
        const clases = 
          tipo === 'entrada'
            ? 'bg-green-100 text-green-800'
            : tipo === 'salida'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800';
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${clases}`}>
            {row.tipo.charAt(0).toUpperCase() + row.tipo.slice(1)}
          </span>
        );
      }
    },
    {
      header: 'Cantidad',
      accessor: 'cantidad',
      cell: (row) => (
        <span className="font-medium">
          {row.tipo.toLowerCase() === 'entrada' ? '+' : '-'}{row.cantidad}
        </span>
      )
    },
    {
      header: 'Referencia',
      accessor: 'referencia_tipo',
      cell: (row) => {
        let tipoReferencia = '';
        let icono = null;
        
        switch (row.referencia_tipo) {
          case 'compra':
            tipoReferencia = 'Compra';
            icono = <FaShoppingCart className="text-blue-500" />;
            break;
          case 'venta':
            tipoReferencia = 'Venta';
            icono = <FaShoppingBag className="text-green-500" />;
            break;
          case 'ajuste':
            tipoReferencia = 'Ajuste';
            icono = <FaBoxOpen className="text-yellow-500" />;
            break;
          case 'devolucion':
            tipoReferencia = 'Devolución';
            icono = <FaExclamationTriangle className="text-red-500" />;
            break;
          default:
            tipoReferencia = 'Otro';
            icono = <FaHistory className="text-gray-500" />;
        }
        
        return (
          <div className="flex items-center">
            <span className="mr-1">{icono}</span>
            <span>{tipoReferencia}</span>
            {row.referencia_id && (
              <span className="ml-1 text-xs text-gray-500">
                #{row.referencia_id}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Motivo',
      accessor: 'motivo',
      cell: (row) => (
        <span className="text-sm text-gray-600">
          {row.motivo || 'No especificado'}
        </span>
      )
    },
    {
      header: 'Usuario',
      accessor: 'usuario_id',
      cell: (row) => (
        <span className="text-sm">
          {row.usuario || 'Sistema'}
        </span>
      )
    }
  ];
  
  /**
   * Columnas para la tabla de ventas
   */
  const columnasVentas = [
    {
      header: 'Fecha',
      accessor: 'fecha',
      cell: (row) => (
        <span className="text-sm">
          {new Date(row.fecha).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Venta',
      accessor: 'venta_id',
      cell: (row) => (
        <Link 
          to={`/ventas/${row.venta_id}`}
          className="text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {row.numero_venta || `#${row.venta_id}`}
        </Link>
      )
    },
    {
      header: 'Cantidad',
      accessor: 'cantidad',
      cell: (row) => (
        <span className="font-medium">
          {row.cantidad}
        </span>
      )
    },
    {
      header: 'Precio',
      accessor: 'precio_unitario',
      cell: (row) => (
        <div>
          <div className="font-medium">
            ${parseFloat(row.precio_unitario).toFixed(2)}
          </div>
          {row.descuento > 0 && (
            <div className="text-xs text-green-600">
              Desc: ${parseFloat(row.descuento).toFixed(2)}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Total',
      accessor: 'precio_total',
      cell: (row) => (
        <span className="font-medium text-indigo-600">
          ${parseFloat(row.precio_total).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Cliente',
      accessor: 'cliente',
      cell: (row) => (
        <span className="text-sm">
          {row.cliente || 'Venta General'}
        </span>
      )
    },
    {
      header: 'Estado',
      accessor: 'estado',
      cell: (row) => {
        const estado = row.estado?.toLowerCase() || 'completada';
        let clases = '';
        
        switch (estado) {
          case 'completada':
            clases = 'bg-green-100 text-green-800';
            break;
          case 'pendiente':
            clases = 'bg-yellow-100 text-yellow-800';
            break;
          case 'cancelada':
            clases = 'bg-red-100 text-red-800';
            break;
          case 'devuelta':
            clases = 'bg-purple-100 text-purple-800';
            break;
          default:
            clases = 'bg-gray-100 text-gray-800';
        }
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${clases}`}>
            {estado.charAt(0).toUpperCase() + estado.slice(1)}
          </span>
        );
      }
    }
  ];

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
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <FaBox className="mx-auto text-4xl text-gray-400 mb-2" />
        <h3 className="text-lg font-medium text-gray-700 mb-1">
          Producto no encontrado
        </h3>
        <p className="text-gray-500 mb-4">
          El producto que buscas no existe o ha sido eliminado.
        </p>
        <Button
          color="primary"
          onClick={() => navigate('/productos')}
          icon={<FaArrowLeft />}
        >
          Volver a Productos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 truncate">
          {producto.nombre}
        </h1>
        
        <div className="flex space-x-2">
          <Button
            color="secondary"
            onClick={() => navigate('/productos')}
            icon={<FaArrowLeft />}
          >
            Volver
          </Button>
          
          <Button
            color="primary"
            onClick={() => navigate(`/productos/editar/${id}`)}
            icon={<FaEdit />}
          >
            Editar
          </Button>
          
          <Button
            color="danger"
            onClick={prepararEliminarProducto}
            icon={<FaTrash />}
          >
            Eliminar
          </Button>
        </div>
      </div>
      
      {/* Pestañas */}
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />
      
      {/* Contenido según pestaña activa */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel izquierdo: Información básica */}
          <Card
            title="Información del Producto"
            icon={<FaBox />}
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  {producto.nombre}
                </h3>
                <p className="text-gray-600">
                  <span className="font-medium">Código:</span> {producto.codigo}
                </p>
                {categoria && (
                  <p className="text-gray-600 flex items-center mt-1">
                    <FaTag className="text-indigo-500 mr-1" />
                    <span className="font-medium mr-1">Categoría:</span>
                    <Link 
                      to={`/categorias/${categoria.id}`}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      {categoria.nombre}
                    </Link>
                  </p>
                )}
                {proveedor && (
                  <p className="text-gray-600 flex items-center mt-1">
                    <FaIndustry className="text-blue-500 mr-1" />
                    <span className="font-medium mr-1">Proveedor:</span>
                    <Link 
                      to={`/proveedores/${proveedor.id}`}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      {proveedor.nombre}
                    </Link>
                  </p>
                )}
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-2">Descripción</h4>
                <p className="text-gray-600">
                  {producto.descripcion || 'Sin descripción'}
                </p>
              </div>
              
              {producto.imagen && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Imagen</h4>
                  <div className="flex justify-center">
                    <img 
                      src={producto.imagen} 
                      alt={producto.nombre} 
                      className="max-w-full h-auto rounded-md"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
          
          {/* Panel central: Precios */}
          <Card
            title="Precios y Stock"
            icon={<FaMoneyBillWave />}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Precio de Costo</div>
                  <div className="text-xl font-bold text-gray-700">
                    ${parseFloat(producto.precio_costo).toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Precio de Venta</div>
                  <div className="text-xl font-bold text-indigo-600">
                    ${parseFloat(producto.precio_venta).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Margen de Ganancia</div>
                <div className="text-xl font-bold text-green-600">
                  {(((producto.precio_venta - producto.precio_costo) / producto.precio_venta) * 100).toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Ganancia por unidad: ${(producto.precio_venta - producto.precio_costo).toFixed(2)}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">Stock Actual:</span>
                  <span className={`
                    px-3 py-1 rounded-full text-sm font-medium
                    ${producto.stock_actual <= producto.stock_minimo
                      ? 'text-red-600 bg-red-100'
                      : producto.stock_actual <= producto.stock_minimo * 1.5
                        ? 'text-yellow-600 bg-yellow-100'
                        : 'text-green-600 bg-green-100'
                    }
                  `}>
                    {producto.stock_actual}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Stock Mínimo:</span>
                  <span className="text-gray-600">{producto.stock_minimo}</span>
                </div>
                
                {producto.ubicacion && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-medium text-gray-700">Ubicación:</span>
                    <span className="text-gray-600">{producto.ubicacion}</span>
                  </div>
                )}
              </div>
              
              <div className="border-t pt-4 flex justify-center">
                <Link
                  to={`/stock/ajuste/${id}`}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <Button
                    color="secondary"
                    icon={<FaBoxOpen />}
                  >
                    Ajustar Stock
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
          
          {/* Panel derecho: Estadísticas */}
          <Card
            title="Estadísticas de Venta"
            icon={<FaShoppingBag />}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Unidades Vendidas</div>
                  <div className="text-xl font-bold text-gray-700">
                    {producto.unidades_vendidas || 0}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Ventas Totales</div>
                  <div className="text-xl font-bold text-indigo-600">
                    ${parseFloat(producto.ventas_totales || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Última Venta</div>
                <div className="text-lg font-medium text-gray-700">
                  {producto.ultima_venta 
                    ? new Date(producto.ultima_venta).toLocaleDateString() 
                    : 'Sin ventas'
                  }
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-2">Rendimiento</h4>
                
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-600">Rotación Mensual:</span>
                  <span className="font-medium">
                    {(producto.unidades_vendidas_mes || 0).toFixed(1)} unidades
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rotación Anual:</span>
                  <span className="font-medium">
                    {(producto.unidades_vendidas_anio || 0).toFixed(1)} unidades
                  </span>
                </div>
              </div>
              
              <div className="border-t pt-4 flex justify-center">
                <Link
                  to={`/reportes/productos?id=${id}`}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <Button
                    color="secondary"
                    icon={<FaChartBar />}
                  >
                    Ver Reporte Detallado
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {/* Pestaña de Movimientos */}
      {activeTab === 'movimientos' && (
        <Card>
          {loadingMovimientos ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              {movimientos.length === 0 ? (
                <div className="text-center py-8">
                  <FaHistory className="mx-auto text-4xl text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">
                    No hay movimientos registrados
                  </h3>
                  <p className="text-gray-500">
                    Este producto aún no tiene movimientos de stock registrados.
                  </p>
                </div>
              ) : (
                <Table
                  columns={columnasMovimientos}
                  data={movimientos}
                  pagination={true}
                  itemsPerPage={10}
                />
              )}
            </>
          )}
        </Card>
      )}
      
      {/* Pestaña de Ventas */}
      {activeTab === 'ventas' && (
        <Card>
          {loadingVentas ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              {ventas.length === 0 ? (
                <div className="text-center py-8">
                  <FaShoppingBag className="mx-auto text-4xl text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">
                    No hay ventas registradas
                  </h3>
                  <p className="text-gray-500">
                    Este producto aún no tiene ventas registradas.
                  </p>
                </div>
              ) : (
                <Table
                  columns={columnasVentas}
                  data={ventas}
                  pagination={true}
                  itemsPerPage={10}
                />
              )}
            </>
          )}
        </Card>
      )}
      
      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar el producto "${producto.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmarEliminarProducto}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
};

export default ProductoDetalle;