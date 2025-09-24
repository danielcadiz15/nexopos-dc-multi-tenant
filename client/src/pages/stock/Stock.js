/**
 * Página de gestión de stock por sucursal
 * 
 * Muestra el listado de productos con su inventario en la sucursal seleccionada
 * y permite realizar ajustes, transferencias y consultar movimientos.
 * 
 * @module pages/stock/Stock
 * @requires react, react-router-dom, ../../services/stock-sucursal.service
 * @related_files ./AjusteStock.js, ./TransferenciaStock.js
 */
import { useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';


// Servicios
import stockSucursalService from '../../services/stock-sucursal.service';
// import productosService from '../../services/productos.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';

// Iconos
import { 
  FaBoxOpen, FaSearch, FaEdit, FaHistory, 
  FaExclamationTriangle, FaFilter, FaStore,
  FaExchangeAlt, FaPlus, FaSyncAlt, FaMoneyBillWave,
  FaClipboardCheck
} from 'react-icons/fa';

// Eliminado componente de impresión basado en ref; ahora se imprime con ventana HTML directa

/**
 * Componente de página para gestión de stock por sucursal
 * @returns {JSX.Element} Componente Stock
 */
const Stock = () => {
  const navigate = useNavigate();
  const { sucursalSeleccionada, sucursalesDisponibles, esAdmin } = useAuth();
  const location = useLocation();

  // Mover hooks aquí, al inicio del componente
  const handlePrint = async () => {
    if (!sucursalSeleccionada) {
      toast.warning('Selecciona una sucursal antes de imprimir.');
      return;
    }

    // Si la tabla actual está vacía, intentamos obtener el listado completo para imprimir
    let listaParaImprimir = productos;
    if (!listaParaImprimir || listaParaImprimir.length === 0) {
      try {
        listaParaImprimir = await stockSucursalService.obtenerStockPorSucursal(sucursalSeleccionada.id);
      } catch (error) {
        console.error('Error obteniendo stock para imprimir:', error);
        toast.error('No fue posible obtener datos para imprimir');
        return;
      }

      if (!listaParaImprimir || listaParaImprimir.length === 0) {
        toast.warning('No hay datos para imprimir en esta sucursal.');
        return;
      }
    }

    const ventanaImpresion = window.open('', '_blank');
    
    const estilos = `
      @page { 
        size: A4; 
        margin: 15mm;
      }
      @media print {
        .no-print { display: none !important; }
        body { margin: 0; padding: 0; }
      }
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        margin: 0;
        padding: 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
      .encabezado {
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #333;
        padding-bottom: 10px;
      }
      .titulo {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
      }
      .subtitulo {
        font-size: 16px;
        color: #666;
        margin-bottom: 5px;
      }
      .fecha {
        font-size: 14px;
        color: #888;
      }
    `;
    
    const html = `
      <html>
        <head>
          <title>Stock - ${sucursalSeleccionada?.nombre || 'Sucursal'}</title>
          <meta charset="utf-8">
          <style>${estilos}</style>
        </head>
        <body>
          <div class="encabezado">
            <div class="titulo">Listado de Stock</div>
            <div class="subtitulo">${sucursalSeleccionada?.nombre || 'Sucursal'}</div>
            <div class="fecha">Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
               ${listaParaImprimir.map(item => `
                <tr>
                  <td>${item.producto?.codigo || item.codigo || 'N/A'}</td>
                  <td>${item.producto?.nombre || item.nombre || 'N/A'}</td>
                  <td style="text-align: center;">${item.cantidad ?? item.stock ?? '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
            <p>Total de productos: ${listaParaImprimir.length}</p>
            <p>Generado el: ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</p>
          </div>
        </body>
      </html>
    `;
    
    ventanaImpresion.document.write(html);
    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    
    setTimeout(() => {
      ventanaImpresion.print();
      ventanaImpresion.close();
      toast.success('Reporte enviado a la impresora');
    }, 500);
  };
  const onImprimirClick = () => {
    handlePrint();
  };

  // Estado
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockBajoFiltro, setStockBajoFiltro] = useState(false);
  const [resumenStock, setResumenStock] = useState(null);
  
  /**
   * Carga inicial de datos cuando cambia la sucursal
   */
  useEffect(() => {
  if (sucursalSeleccionada) {
    cargarStock();
    cargarResumenStock();
  }
}, [sucursalSeleccionada]);
	useEffect(() => {
	  if (productos.length > 0) {
		cargarResumenStock();
	  }
	}, [productos, sucursalSeleccionada]);

// Agregar este nuevo useEffect para detectar actualizaciones
	useEffect(() => {
	  if (location.state?.updated) {
		cargarStock();
		cargarResumenStock();
		// Limpiar el state para evitar recargas innecesarias
		window.history.replaceState({}, document.title);
	  }
	}, [location.state]);
  
  /**
   * Carga el stock de la sucursal actual
   */
  const cargarStock = async () => {
    try {
      setLoading(true);
      const data = await stockSucursalService.obtenerStockPorSucursal(sucursalSeleccionada.id);
      setProductos(data);
      setStockBajoFiltro(false);
    } catch (error) {
      console.error('Error al cargar stock:', error);
      toast.error('Error al cargar el inventario de la sucursal');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Carga resumen de stock de la sucursal
   */
  const cargarResumenStock = async () => {
    try {
      // Obtener stock bajo
      const stockBajo = await stockSucursalService.obtenerStockBajo(sucursalSeleccionada.id);
      
      setResumenStock({
        totalProductos: productos.length,
        stockBajo: stockBajo.length,
        valorTotal: productos.reduce((total, p) => total + (p.cantidad * p.producto?.precio_costo || 0), 0)
      });
    } catch (error) {
      console.error('Error al cargar resumen:', error);
    }
  };
  
  /**
   * Carga solo productos con stock bajo
   */
  const cargarStockBajo = async () => {
    try {
      setLoading(true);
      const data = await stockSucursalService.obtenerStockBajo(sucursalSeleccionada.id);
      setProductos(data);
      setStockBajoFiltro(true);
    } catch (error) {
      console.error('Error al cargar productos con stock bajo:', error);
      toast.error('Error al cargar los productos con stock bajo');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Busca productos por término en la sucursal actual
   */
  const buscarProductos = async () => {
    try {
      setLoading(true);
      
      if (!searchTerm.trim()) {
        await cargarStock();
        return;
      }
      
      // Primero obtener todos los productos del stock
      const stockCompleto = await stockSucursalService.obtenerStockPorSucursal(sucursalSeleccionada.id);
      
      // Filtrar localmente por término de búsqueda
      const terminoLower = searchTerm.toLowerCase();
      const productosFiltrados = stockCompleto.filter(item => 
        item.producto?.nombre?.toLowerCase().includes(terminoLower) ||
        item.producto?.codigo?.toLowerCase().includes(terminoLower)
      );
      
      setProductos(productosFiltrados);
      setStockBajoFiltro(false);
    } catch (error) {
      console.error('Error al buscar productos:', error);
      toast.error('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Alterna el filtro de stock bajo
   */
  const toggleStockBajoFilter = () => {
    if (stockBajoFiltro) {
      cargarStock();
    } else {
      cargarStockBajo();
    }
  };
  
  /**
   * Navega a la página de ajuste de stock
   * @param {Object} stockItem - Item de stock con producto
   */
  const irAjustarStock = (stockItem) => {
    navigate(`/stock/ajuste/${stockItem.producto_id}`, {
      state: { 
        stockItem,
        sucursalId: sucursalSeleccionada.id 
      }
    });
  };
  
  /**
   * Navega a la página de transferencia entre sucursales
   */
  const irATransferencias = () => {
    navigate('/stock/transferencias');
  };
  
  /**
   * Ver historial de movimientos de un producto
   * @param {string} productoId - ID del producto
   */
  const verHistorialMovimientos = (productoId) => {
    navigate(`/stock/movimientos/${productoId}`, {
      state: { sucursalId: sucursalSeleccionada.id }
    });
  };
  
  /**
   * Inicializa stock para productos nuevos
   */
  const inicializarStock = () => {
    navigate('/stock/inicializar');
  };
  
  /**
   * Navega al control de inventario
   */
  const irAControlStock = () => {
    navigate('/stock/control');
  };
  
  /**
   * Columnas para la tabla de stock
   */
  const columns = [
    {
      header: 'Código',
      accessor: 'producto.codigo',
      cell: (row) => (
        <span className="font-medium">{row.producto?.codigo || 'N/A'}</span>
      )
    },
    {
      header: 'Producto',
      accessor: 'producto.nombre',
      cell: (row) => (
        <div>
          <div className="font-medium">{row.producto?.nombre || 'Producto no encontrado'}</div>
          <div className="text-sm text-gray-500">
            {row.producto?.descripcion || ''}
          </div>
        </div>
      )
    },
    {
      header: 'Stock Actual',
      accessor: 'cantidad',
      cell: (row) => {
        // Determinar color según nivel de stock
        let stockClass = 'text-green-600 bg-green-100';
        
        if (row.cantidad <= row.stock_minimo) {
          stockClass = 'text-red-600 bg-red-100';
        } else if (row.cantidad <= row.stock_minimo * 1.5) {
          stockClass = 'text-yellow-600 bg-yellow-100';
        }
        
        return (
          <div className="text-center">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${stockClass}`}>
              {row.cantidad}
            </span>
          </div>
        );
      }
    },
    {
      header: 'Stock Mínimo',
      accessor: 'stock_minimo',
      cell: (row) => (
        <div className="text-center">
          <span className="text-gray-600">
            {row.stock_minimo}
          </span>
        </div>
      )
    },
    {
      header: 'Valor',
      accessor: 'valor',
      cell: (row) => (
        <div className="text-right">
          <span className="text-gray-600">
            ${((row.cantidad || 0) * (row.producto?.precio_costo || 0)).toFixed(2)}
          </span>
        </div>
      )
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => irAjustarStock(row)}
            className="text-blue-600 hover:text-blue-800"
            title="Ajustar stock"
          >
            <FaEdit />
          </button>
          
          <button
            onClick={() => verHistorialMovimientos(row.producto_id)}
            className="text-purple-600 hover:text-purple-800"
            title="Ver historial de movimientos"
          >
            <FaHistory />
          </button>
        </div>
      )
    }
  ];

  // Si no hay sucursal seleccionada
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
            Gestión de Inventario
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            <FaStore className="inline mr-1" />
            {sucursalSeleccionada.nombre}
          </p>
        </div>
        
        <div className="flex space-x-2">
          
        </div>
      </div>
      
      {/* Tarjetas de resumen */}
      {resumenStock && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-blue-800 font-medium">Total Productos</h3>
                <p className="text-2xl font-bold text-blue-900">
                  {resumenStock.totalProductos}
                </p>
              </div>
              <FaBoxOpen className="text-4xl text-blue-300" />
            </div>
          </Card>
          
          <Card className="bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-red-800 font-medium">Stock Bajo</h3>
                <p className="text-2xl font-bold text-red-900">
                  {resumenStock.stockBajo}
                </p>
              </div>
              <FaExclamationTriangle className="text-4xl text-red-300" />
            </div>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-green-800 font-medium">Valor Total</h3>
                <p className="text-2xl font-bold text-green-900">
                  ${resumenStock.valorTotal.toFixed(2)}
                </p>
              </div>
              <FaMoneyBillWave className="text-4xl text-green-300" />
            </div>
          </Card>
        </div>
      )}
      
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <SearchBar
              placeholder="Buscar productos en esta sucursal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={buscarProductos}
              onClear={() => {
                setSearchTerm('');
                cargarStock();
              }}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              color="secondary"
              onClick={cargarStock}
              icon={<FaSyncAlt />}
            >
              Actualizar
            </Button>
            
            <Button
              color={stockBajoFiltro ? "primary" : "secondary"}
              onClick={toggleStockBajoFilter}
              icon={<FaExclamationTriangle />}
            >
              {stockBajoFiltro ? "Ver todos" : "Stock bajo"}
            </Button>
            <Button color="primary" onClick={onImprimirClick} className="mb-4">
              Imprimir listado
            </Button>
            <Button 
              color="secondary" 
              onClick={irAControlStock} 
              icon={<FaClipboardCheck />}
            >
              Control de Stock
            </Button>
            {esAdmin && (
              <Button 
                color="warning" 
                onClick={() => navigate('/stock/solicitudes-ajuste')} 
                icon={<FaClipboardCheck />}
              >
                Solicitudes de Ajuste
              </Button>
            )}
          </div>
        </div>
      </Card>
      
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {productos.length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FaBoxOpen className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  {searchTerm 
                    ? 'No se encontraron productos'
                    : stockBajoFiltro
                      ? 'No hay productos con stock bajo'
                      : 'No hay productos en esta sucursal'}
                </h3>
                <p className="text-gray-500">
                  {searchTerm
                    ? 'Intenta con otros términos de búsqueda'
                    : stockBajoFiltro
                      ? 'Todos los productos tienen stock suficiente'
                      : 'Inicializa el stock de productos para esta sucursal'}
                </p>
                
                {!searchTerm && !stockBajoFiltro && (
                  <div className="mt-4">
                    <Button
                      color="primary"
                      icon={<FaPlus />}
                      onClick={inicializarStock}
                    >
                      Inicializar Stock
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Table
                columns={columns}
                data={productos}
                pagination={true}
                itemsPerPage={15}
              />
            )}
          </>
        )}
      </Card>

    </div>
  );
};

export default Stock;