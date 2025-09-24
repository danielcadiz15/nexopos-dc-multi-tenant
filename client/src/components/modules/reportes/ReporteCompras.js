/**
 * Reporte de Compras
 * 
 * Muestra estadísticas, gráficos y tablas con información detallada
 * sobre las compras realizadas a proveedores en distintos períodos.
 * 
 * @module pages/reportes/ReporteCompras
 * @requires react, ../../services/reportes.service
 * @related_files ./ReporteVentas.js, ../../components/modules/reportes/
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// Servicios
import reportesService from '../../services/reportes.service';
import comprasService from '../../services/compras.service';
import proveedoresService from '../../services/proveedores.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';

// Componentes de gráficos
import GraficoComprasPorPeriodo from '../../components/modules/reportes/GraficoComprasPorPeriodo';
import GraficoComprasPorProveedor from '../../components/modules/reportes/GraficoComprasPorProveedor';
import GraficoProductosMasComprados from '../../components/modules/reportes/GraficoProductosMasComprados';

// Iconos
import { 
  FaChartBar, FaCalendarAlt, FaDownload, FaFilter,
  FaMoneyBillWave, FaShoppingBag, FaCalculator, FaChartPie,
  FaChartLine, FaBoxes, FaCheck, FaTimes, FaExchangeAlt,
  FaTruck, FaBuilding
} from 'react-icons/fa';

/**
 * Componente de Reporte de Compras
 * @returns {JSX.Element} Componente ReporteCompras
 */
const ReporteCompras = () => {
  // Estado para filtros
  const [filtros, setFiltros] = useState({
    fechaInicio: obtenerFechaHace(30), // Último mes por defecto
    fechaFin: obtenerFechaActual(),
    estado: '', // '', 'recibida', 'pendiente', 'cancelada'
    proveedor_id: ''
  });
  
  // Estado para datos de reportes
  const [reporteGeneral, setReporteGeneral] = useState(null);
  const [comprasPorDia, setComprasPorDia] = useState([]);
  const [comprasPorProveedor, setComprasPorProveedor] = useState([]);
  const [productosMasComprados, setProductosMasComprados] = useState([]);
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  
  // Estado para estados de carga
  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [loadingComprasPorDia, setLoadingComprasPorDia] = useState(true);
  const [loadingComprasPorProveedor, setLoadingComprasPorProveedor] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingCompras, setLoadingCompras] = useState(true);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  
  /**
   * Carga inicial de datos al montar el componente
   */
  useEffect(() => {
    cargarProveedores();
    cargarDatos();
  }, []);
  
  /**
   * Carga los datos cuando cambian los filtros
   */
  useEffect(() => {
    cargarDatos();
  }, [filtros]);
  
  /**
   * Carga todos los datos de reportes
   */
  const cargarDatos = async () => {
    cargarReporteGeneral();
    cargarComprasPorDia();
    cargarComprasPorProveedor();
    cargarProductosMasComprados();
    cargarCompras();
  };
  
  /**
   * Carga la lista de proveedores para filtros
   */
  const cargarProveedores = async () => {
    try {
      setLoadingProveedores(true);
      const data = await proveedoresService.obtenerTodos();
      setProveedores(data);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      toast.error('Error al cargar la lista de proveedores');
    } finally {
      setLoadingProveedores(false);
    }
  };
  
  /**
   * Obtiene resumen general de compras
   */
  const cargarReporteGeneral = async () => {
    try {
      setLoadingGeneral(true);
      const data = await comprasService.obtenerResumenReporte(filtros);
      setReporteGeneral(data);
    } catch (error) {
      console.error('Error al cargar reporte general:', error);
      toast.error('Error al cargar datos generales del reporte');
    } finally {
      setLoadingGeneral(false);
    }
  };
  
  /**
   * Obtiene compras agrupadas por día para el gráfico
   */
  const cargarComprasPorDia = async () => {
    try {
      setLoadingComprasPorDia(true);
      const data = await comprasService.obtenerComprasPorDia(filtros);
      setComprasPorDia(data);
    } catch (error) {
      console.error('Error al cargar compras por día:', error);
      toast.error('Error al cargar datos para el gráfico de compras');
    } finally {
      setLoadingComprasPorDia(false);
    }
  };
  
  /**
   * Obtiene compras agrupadas por proveedor
   */
  const cargarComprasPorProveedor = async () => {
    try {
      setLoadingComprasPorProveedor(true);
      const data = await comprasService.obtenerComprasPorProveedor(filtros);
      setComprasPorProveedor(data);
    } catch (error) {
      console.error('Error al cargar compras por proveedor:', error);
      toast.error('Error al cargar datos para el gráfico de proveedores');
    } finally {
      setLoadingComprasPorProveedor(false);
    }
  };
  
  /**
   * Obtiene los productos más comprados
   */
  const cargarProductosMasComprados = async () => {
    try {
      setLoadingProductos(true);
      const data = await comprasService.obtenerProductosMasComprados(filtros);
      setProductosMasComprados(data);
    } catch (error) {
      console.error('Error al cargar productos más comprados:', error);
      toast.error('Error al cargar datos de productos más comprados');
    } finally {
      setLoadingProductos(false);
    }
  };
  
  /**
   * Obtiene la lista de compras para el período
   */
  const cargarCompras = async () => {
    try {
      setLoadingCompras(true);
      
      // Convertir los filtros para el formato de la API de compras
      const queryParams = {
        fecha_inicio: filtros.fechaInicio,
        fecha_fin: filtros.fechaFin,
        estado: filtros.estado,
        proveedor_id: filtros.proveedor_id
      };
      
      const data = await comprasService.obtenerPorFiltros(queryParams);
      setCompras(data);
    } catch (error) {
      console.error('Error al cargar lista de compras:', error);
      toast.error('Error al cargar lista de compras');
    } finally {
      setLoadingCompras(false);
    }
  };
  
  /**
   * Actualiza los filtros de fecha
   * @param {string} tipo - 'fechaInicio' o 'fechaFin' 
   * @param {Event} e - Evento de cambio de input
   */
  const handleFechaChange = (tipo, e) => {
    setFiltros({
      ...filtros,
      [tipo]: e.target.value
    });
  };
  
  /**
   * Actualiza el filtro de estado
   * @param {string} estado - Nuevo estado seleccionado
   */
  const handleEstadoChange = (estado) => {
    setFiltros({
      ...filtros,
      estado: filtros.estado === estado ? '' : estado
    });
  };
  
  /**
   * Actualiza el filtro de proveedor
   * @param {string} proveedorId - ID del proveedor seleccionado
   */
  const handleProveedorChange = (e) => {
    setFiltros({
      ...filtros,
      proveedor_id: e.target.value
    });
  };
  
  /**
   * Aplica filtros predefienidos para períodos comunes
   * @param {string} periodo - Período a aplicar ('hoy', 'semana', 'mes', 'anio')
   */
  const aplicarPeriodo = (periodo) => {
    let fechaInicio = '';
    const fechaFin = obtenerFechaActual();
    
    switch (periodo) {
      case 'hoy':
        fechaInicio = obtenerFechaActual();
        break;
      case 'semana':
        fechaInicio = obtenerFechaHace(7);
        break;
      case 'mes':
        fechaInicio = obtenerFechaHace(30);
        break;
      case 'anio':
        fechaInicio = obtenerFechaHace(365);
        break;
      default:
        return;
    }
    
    setFiltros({
      ...filtros,
      fechaInicio,
      fechaFin
    });
  };
  
  /**
   * Genera e iniciar descarga de un reporte en CSV
   */
  const descargarReporte = () => {
    try {
      // Crear CSV con los datos
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Encabezados
      csvContent += 'Fecha,Número,Proveedor,Estado,Subtotal,Impuestos,Total\n';
      
      // Datos
      compras.forEach(compra => {
        const fecha = new Date(compra.fecha).toLocaleDateString();
        csvContent += `${fecha},${compra.numero},"${compra.proveedor}",${compra.estado},${compra.subtotal},${compra.impuestos},${compra.total}\n`;
      });
      
      // Iniciar descarga
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `reporte_compras_${filtros.fechaInicio}_${filtros.fechaFin}.csv`);
      document.body.appendChild(link);
      link.click();
      
      toast.success('Reporte descargado correctamente');
    } catch (error) {
      console.error('Error al descargar reporte:', error);
      toast.error('Error al generar la descarga del reporte');
    }
  };
  
  /**
   * Obtiene la fecha actual en formato YYYY-MM-DD
   * @returns {string} Fecha actual formateada
   */
  function obtenerFechaActual() {
    const fecha = new Date();
    return fecha.toISOString().split('T')[0];
  }
  
  /**
   * Obtiene la fecha de hace X días en formato YYYY-MM-DD
   * @param {number} dias - Número de días a restar
   * @returns {string} Fecha formateada
   */
  function obtenerFechaHace(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fecha.toISOString().split('T')[0];
  }
  
  /**
   * Formatea un número con 2 decimales y símbolo de moneda
   * @param {number} valor - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatearMoneda = (valor) => {
    return `$${parseFloat(valor || 0).toFixed(2)}`;
  };
  
  /**
   * Columnas para la tabla de compras
   */
  const columnasCompras = [
    {
      header: 'Fecha',
      accessor: 'fecha',
      cell: (row) => (
        <div className="flex items-center">
          <FaCalendarAlt className="mr-2 text-gray-500" />
          <span>{new Date(row.fecha).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      header: 'Número',
      accessor: 'numero',
      cell: (row) => (
        <span className="font-medium">{row.numero}</span>
      )
    },
    {
      header: 'Proveedor',
      accessor: 'proveedor',
      cell: (row) => (
        <div className="flex items-center">
          <FaTruck className="mr-2 text-gray-500" />
          <span>{row.proveedor}</span>
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: 'estado',
      cell: (row) => {
        let color = 'bg-green-100 text-green-600';
        let icon = <FaCheck className="mr-1" />;
        
        if (row.estado === 'pendiente') {
          color = 'bg-yellow-100 text-yellow-600';
          icon = <FaExchangeAlt className="mr-1" />;
        } else if (row.estado === 'cancelada') {
          color = 'bg-red-100 text-red-600';
          icon = <FaTimes className="mr-1" />;
        }
        
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center ${color}`}>
            {icon}
            {row.estado.charAt(0).toUpperCase() + row.estado.slice(1)}
          </span>
        );
      }
    },
    {
      header: 'Subtotal',
      accessor: 'subtotal',
      cell: (row) => (
        <span>{formatearMoneda(row.subtotal)}</span>
      )
    },
    {
      header: 'Impuestos',
      accessor: 'impuestos',
      cell: (row) => (
        <span>{formatearMoneda(row.impuestos)}</span>
      )
    },
    {
      header: 'Total',
      accessor: 'total',
      cell: (row) => (
        <span className="font-bold">{formatearMoneda(row.total)}</span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Reporte de Compras</h1>
        
        <Button
          color="success"
          onClick={descargarReporte}
          icon={<FaDownload />}
        >
          Descargar CSV
        </Button>
      </div>
      
      {/* Filtros de fecha y estado */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Desde
            </label>
            <div className="relative">
              <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => handleFechaChange('fechaInicio', e)}
                className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Hasta
            </label>
            <div className="relative">
              <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => handleFechaChange('fechaFin', e)}
                className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Períodos Comunes
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                color={filtros.fechaInicio === obtenerFechaActual() ? 'primary' : 'secondary'}
                onClick={() => aplicarPeriodo('hoy')}
                small={true}
              >
                Hoy
              </Button>
              
              <Button
                color={filtros.fechaInicio === obtenerFechaHace(7) ? 'primary' : 'secondary'}
                onClick={() => aplicarPeriodo('semana')}
                small={true}
              >
                Última Semana
              </Button>
              
              <Button
                color={filtros.fechaInicio === obtenerFechaHace(30) ? 'primary' : 'secondary'}
                onClick={() => aplicarPeriodo('mes')}
                small={true}
              >
                Último Mes
              </Button>
              
              <Button
                color={filtros.fechaInicio === obtenerFechaHace(365) ? 'primary' : 'secondary'}
                onClick={() => aplicarPeriodo('anio')}
                small={true}
              >
                Último Año
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filtros Adicionales
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500 mb-1">Estado</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  color={filtros.estado === 'recibida' ? 'success' : 'secondary'}
                  onClick={() => handleEstadoChange('recibida')}
                  icon={<FaCheck />}
                  small={true}
                >
                  Recibidas
                </Button>
                
                <Button
                  color={filtros.estado === 'pendiente' ? 'warning' : 'secondary'}
                  onClick={() => handleEstadoChange('pendiente')}
                  icon={<FaExchangeAlt />}
                  small={true}
                >
                  Pendientes
                </Button>
                
                <Button
                  color={filtros.estado === 'cancelada' ? 'danger' : 'secondary'}
                  onClick={() => handleEstadoChange('cancelada')}
                  icon={<FaTimes />}
                  small={true}
                >
                  Canceladas
                </Button>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-1">Proveedor</div>
              {loadingProveedores ? (
                <div className="h-9 flex items-center">
                  <Spinner size="sm" />
                </div>
              ) : (
                <div className="relative">
                  <FaTruck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filtros.proveedor_id}
                    onChange={handleProveedorChange}
                    className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Todos los proveedores</option>
                    {proveedores.map(proveedor => (
                      <option key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-indigo-50 border-indigo-200 overflow-hidden">
          <div className="relative">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 opacity-50 text-indigo-300">
              <FaShoppingBag size={60} />
            </div>
            <div className="z-10 relative">
              <h3 className="text-indigo-800 font-medium text-sm">Total Compras</h3>
              {loadingGeneral ? (
                <div className="h-8 flex items-center">
                  <Spinner size="sm" />
                </div>
              ) : (
                <p className="text-2xl font-bold text-indigo-900">
                  {formatearMoneda(reporteGeneral?.total || 0)}
                </p>
              )}
              <p className="text-xs text-indigo-700 mt-1">
                {reporteGeneral?.cantidad_compras || 0} compras en el período
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-blue-50 border-blue-200 overflow-hidden">
          <div className="relative">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 opacity-50 text-blue-300">
              <FaBuilding size={60} />
            </div>
            <div className="z-10 relative">
              <h3 className="text-blue-800 font-medium text-sm">Proveedores</h3>
              {loadingGeneral ? (
                <div className="h-8 flex items-center">
                  <Spinner size="sm" />
                </div>
              ) : (
                <p className="text-2xl font-bold text-blue-900">
                  {reporteGeneral?.proveedores_unicos || 0}
                </p>
              )}
              <p className="text-xs text-blue-700 mt-1">
                Proveedores activos en el período
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-green-50 border-green-200 overflow-hidden">
          <div className="relative">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 opacity-50 text-green-300">
              <FaBoxes size={60} />
            </div>
            <div className="z-10 relative">
              <h3 className="text-green-800 font-medium text-sm">Productos Comprados</h3>
              {loadingGeneral ? (
                <div className="h-8 flex items-center">
                  <Spinner size="sm" />
                </div>
              ) : (
                <p className="text-2xl font-bold text-green-900">
                  {reporteGeneral?.unidades_compradas || 0}
                </p>
              )}
              <p className="text-xs text-green-700 mt-1">
                {reporteGeneral?.productos_unicos || 0} productos diferentes
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-yellow-50 border-yellow-200 overflow-hidden">
          <div className="relative">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 opacity-50 text-yellow-300">
              <FaMoneyBillWave size={60} />
            </div>
            <div className="z-10 relative">
              <h3 className="text-yellow-800 font-medium text-sm">Pendientes de Pago</h3>
              {loadingGeneral ? (
                <div className="h-8 flex items-center">
                  <Spinner size="sm" />
                </div>
              ) : (
                <p className="text-2xl font-bold text-yellow-900">
                  {formatearMoneda(reporteGeneral?.pendiente_pago || 0)}
                </p>
              )}
              <p className="text-xs text-yellow-700 mt-1">
                {reporteGeneral?.compras_pendientes || 0} compras pendientes
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Compras por Día"
          icon={<FaChartLine />}
        >
          {loadingComprasPorDia ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              {comprasPorDia.length === 0 ? (
                <div className="text-center py-8">
                  <FaChartLine className="mx-auto text-4xl text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">
                    No hay datos disponibles
                  </h3>
                  <p className="text-gray-500">
                    No se encontraron compras en el período seleccionado.
                  </p>
                </div>
              ) : (
                <div className="h-80">
                  <GraficoComprasPorPeriodo datos={comprasPorDia} />
                </div>
              )}
            </>
          )}
        </Card>
        
        <Card
          title="Compras por Proveedor"
          icon={<FaChartPie />}
        >
          {loadingComprasPorProveedor ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              {comprasPorProveedor.length === 0 ? (
                <div className="text-center py-8">
                  <FaChartPie className="mx-auto text-4xl text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">
                    No hay datos disponibles
                  </h3>
                  <p className="text-gray-500">
                    No se encontraron compras en el período seleccionado.
                  </p>
                </div>
              ) : (
                <div className="h-80">
                  <GraficoComprasPorProveedor datos={comprasPorProveedor} />
                </div>
              )}
            </>
          )}
        </Card>
      </div>
      
      {/* Productos más comprados */}
      <Card
        title="Productos Más Comprados"
        icon={<FaBoxes />}
      >
        {loadingProductos ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <>
            {productosMasComprados.length === 0 ? (
              <div className="text-center py-8">
                <FaBoxes className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay datos disponibles
                </h3>
                <p className="text-gray-500">
                  No se encontraron compras de productos en el período seleccionado.
                </p>
              </div>
            ) : (
              <div className="h-96">
                <GraficoProductosMasComprados datos={productosMasComprados} />
              </div>
            )}
          </>
        )}
      </Card>
      
      {/* Tabla de compras */}
      <Card
        title="Detalle de Compras"
        icon={<FaShoppingBag />}
      >
        {loadingCompras ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <>
            {compras.length === 0 ? (
              <div className="text-center py-8">
                <FaShoppingBag className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay compras en el período seleccionado
                </h3>
                <p className="text-gray-500">
                  Prueba a cambiar los filtros para ver resultados.
                </p>
              </div>
            ) : (
              <Table
                columns={columnasCompras}
                data={compras}
                pagination={true}
                itemsPerPage={10}
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default ReporteCompras;