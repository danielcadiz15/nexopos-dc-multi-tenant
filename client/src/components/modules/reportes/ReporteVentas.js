/**
 * Reporte de Ventas
 * 
 * Muestra estadísticas, gráficos y tablas con información detallada
 * sobre las ventas realizadas en distintos períodos.
 * 
 * @module pages/reportes/ReporteVentas
 * @requires react, ../../services/reportes.service
 * @related_files ./ReporteCompras.js, ../../components/modules/reportes/
 */

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

// Servicios
import reportesService from '../../services/reportes.service';
import ventasService from '../../services/ventas.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';

// Componentes de gráficos
import GraficoVentasPorPeriodo from '../../components/modules/reportes/GraficoVentasPorPeriodo';
import GraficoVentasPorMetodoPago from '../../components/modules/reportes/GraficoVentasPorMetodoPago';
import GraficoProductosMasVendidos from '../../components/modules/reportes/GraficoProductosMasVendidos';

// Iconos
import { 
  FaChartBar, FaCalendarAlt, FaDownload, FaFilter,
  FaMoneyBillWave, FaShoppingCart, FaCalculator, FaChartPie,
  FaChartLine, FaBoxes, FaCheck, FaTimes, FaExchangeAlt
} from 'react-icons/fa';

/**
 * Componente de Reporte de Ventas
 * @returns {JSX.Element} Componente ReporteVentas
 */
const ReporteVentas = () => {
  // Estado para filtros
  const [filtros, setFiltros] = useState({
    fechaInicio: obtenerFechaHace(30), // Último mes por defecto
    fechaFin: obtenerFechaActual(),
    estado: '', // '', 'completada', 'pendiente', 'cancelada', 'devuelta'
    metodoPago: '' // '', 'efectivo', 'tarjeta', 'transferencia', 'credito'
  });
  
  // Estado para datos de reportes
  const [reporteGeneral, setReporteGeneral] = useState(null);
  const [ventasPorDia, setVentasPorDia] = useState([]);
  const [ventasPorMetodoPago, setVentasPorMetodoPago] = useState([]);
  const [productosMasVendidos, setProductosMasVendidos] = useState([]);
  const [ventas, setVentas] = useState([]);
  
  // Estado para estados de carga
  const [loadingGeneral, setLoadingGeneral] = useState(true);
  const [loadingVentasPorDia, setLoadingVentasPorDia] = useState(true);
  const [loadingVentasPorMetodo, setLoadingVentasPorMetodo] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingVentas, setLoadingVentas] = useState(true);
  
  /**
   * Carga inicial de datos al montar el componente
   */
  useEffect(() => {
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
    cargarVentasPorDia();
    cargarVentasPorMetodoPago();
    cargarProductosMasVendidos();
    cargarVentas();
  };
  
  /**
   * Obtiene resumen general de ventas
   */
  const cargarReporteGeneral = async () => {
    try {
      setLoadingGeneral(true);
      const data = await reportesService.obtenerResumenVentas(filtros);
      setReporteGeneral(data);
    } catch (error) {
      console.error('Error al cargar reporte general:', error);
      toast.error('Error al cargar datos generales del reporte');
    } finally {
      setLoadingGeneral(false);
    }
  };
  
  /**
   * Obtiene ventas agrupadas por día para el gráfico
   */
  const cargarVentasPorDia = async () => {
    try {
      setLoadingVentasPorDia(true);
      const data = await reportesService.obtenerVentasPorDia(filtros);
      setVentasPorDia(data);
    } catch (error) {
      console.error('Error al cargar ventas por día:', error);
      toast.error('Error al cargar datos para el gráfico de ventas');
    } finally {
      setLoadingVentasPorDia(false);
    }
  };
  
  /**
   * Obtiene ventas agrupadas por método de pago
   */
  const cargarVentasPorMetodoPago = async () => {
    try {
      setLoadingVentasPorMetodo(true);
      const data = await reportesService.obtenerVentasPorMetodoPago(filtros);
      setVentasPorMetodoPago(data);
    } catch (error) {
      console.error('Error al cargar ventas por método de pago:', error);
      toast.error('Error al cargar datos para el gráfico de métodos de pago');
    } finally {
      setLoadingVentasPorMetodo(false);
    }
  };
  
  /**
   * Obtiene los productos más vendidos
   */
  const cargarProductosMasVendidos = async () => {
    try {
      setLoadingProductos(true);
      const data = await reportesService.obtenerProductosMasVendidos(filtros);
      setProductosMasVendidos(data);
    } catch (error) {
      console.error('Error al cargar productos más vendidos:', error);
      toast.error('Error al cargar datos de productos más vendidos');
    } finally {
      setLoadingProductos(false);
    }
  };
  
  /**
   * Obtiene la lista de ventas para el período
   */
  const cargarVentas = async () => {
    try {
      setLoadingVentas(true);
      
      // Convertir los filtros para el formato de la API de ventas
      const queryParams = {
        fecha_inicio: filtros.fechaInicio,
        fecha_fin: filtros.fechaFin,
        estado: filtros.estado,
        metodo_pago: filtros.metodoPago
      };
      
      const data = await ventasService.obtenerPorFiltros(queryParams);
      setVentas(data);
    } catch (error) {
      console.error('Error al cargar lista de ventas:', error);
      toast.error('Error al cargar lista de ventas');
    } finally {
      setLoadingVentas(false);
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
   * Actualiza el filtro de método de pago
   * @param {string} metodo - Nuevo método seleccionado
   */
  const handleMetodoChange = (metodo) => {
    setFiltros({
      ...filtros,
      metodoPago: filtros.metodoPago === metodo ? '' : metodo
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
      csvContent += 'Fecha,Número,Cliente,Estado,Método de Pago,Subtotal,Descuento,Total\n';
      
      // Datos
      ventas.forEach(venta => {
        const fecha = new Date(venta.fecha).toLocaleDateString();
        const cliente = venta.cliente || 'Cliente General';
        csvContent += `${fecha},${venta.numero},"${cliente}",${venta.estado},${venta.metodo_pago},${venta.subtotal},${venta.descuento},${venta.total}\n`;
      });
      
      // Iniciar descarga
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `reporte_ventas_${filtros.fechaInicio}_${filtros.fechaFin}.csv`);
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
   * Columnas para la tabla de ventas
   */
  const columnasVentas = [
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
      header: 'Cliente',
      accessor: 'cliente',
      cell: (row) => (
        <span>{row.cliente || 'Cliente General'}</span>
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
        } else if (row.estado === 'devuelta') {
          color = 'bg-orange-100 text-orange-600';
          icon = <FaExchangeAlt className="mr-1" />;
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
      header: 'Método',
      accessor: 'metodo_pago',
      cell: (row) => (
        <span className="capitalize">{row.metodo_pago}</span>
      )
    },
    {
      header: 'Subtotal',
      accessor: 'subtotal',
      cell: (row) => (
        <span>{formatearMoneda(row.subtotal)}</span>
      )
    },
    {
      header: 'Descuento',
      accessor: 'descuento',
      cell: (row) => (
        <span className="text-red-600">{formatearMoneda(row.descuento)}</span>
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
        <h1 className="text-2xl font-bold text-gray-800">Reporte de Ventas</h1>
        
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
                  color={filtros.estado === 'completada' ? 'success' : 'secondary'}
                  onClick={() => handleEstadoChange('completada')}
                  icon={<FaCheck />}
                  small={true}
                >
                  Completadas
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
                
                <Button
                  color={filtros.estado === 'devuelta' ? 'primary' : 'secondary'}
                  onClick={() => handleEstadoChange('devuelta')}
                  icon={<FaExchangeAlt />}
                  small={true}
                >
                  Devueltas
                </Button>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-1">Método de Pago</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  color={filtros.metodoPago === 'efectivo' ? 'success' : 'secondary'}
                  onClick={() => handleMetodoChange('efectivo')}
                  icon={<FaMoneyBillWave />}
                  small={true}
                >
                  Efectivo
                </Button>
                
                <Button
                  color={filtros.metodoPago === 'tarjeta' ? 'info' : 'secondary'}
                  onClick={() => handleMetodoChange('tarjeta')}
                  icon={<FaCreditCard />}
                  small={true}
                >
                  Tarjeta
                </Button>
                
                <Button
                  color={filtros.metodoPago === 'transferencia' ? 'primary' : 'secondary'}
                  onClick={() => handleMetodoChange('transferencia')}
                  icon={<FaExchangeAlt />}
                  small={true}
                >
                  Transferencia
                </Button>
                
                <Button
                  color={filtros.metodoPago === 'credito' ? 'warning' : 'secondary'}
                  onClick={() => handleMetodoChange('credito')}
                  icon={<FaCalculator />}
                  small={true}
                >
                  Crédito
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-indigo-50 border-indigo-200 overflow-hidden">
          <div className="relative">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 opacity-50 text-indigo-300">
              <FaShoppingCart size={60} />
            </div>
            <div className="z-10 relative">
              <h3 className="text-indigo-800 font-medium text-sm">Total Ventas</h3>
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
                {reporteGeneral?.cantidad_ventas || 0} ventas en el período
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-green-50 border-green-200 overflow-hidden">
          <div className="relative">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 opacity-50 text-green-300">
              <FaMoneyBillWave size={60} />
            </div>
            <div className="z-10 relative">
              <h3 className="text-green-800 font-medium text-sm">Ganancias</h3>
              {loadingGeneral ? (
                <div className="h-8 flex items-center">
                  <Spinner size="sm" />
                </div>
              ) : (
                <p className="text-2xl font-bold text-green-900">
                  {formatearMoneda(reporteGeneral?.ganancia || 0)}
                </p>
              )}
              <p className="text-xs text-green-700 mt-1">
                Margen: {((reporteGeneral?.ganancia / reporteGeneral?.total) * 100 || 0).toFixed(2)}%
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-blue-50 border-blue-200 overflow-hidden">
          <div className="relative">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 opacity-50 text-blue-300">
              <FaBoxes size={60} />
            </div>
            <div className="z-10 relative">
              <h3 className="text-blue-800 font-medium text-sm">Productos Vendidos</h3>
              {loadingGeneral ? (
                <div className="h-8 flex items-center">
                  <Spinner size="sm" />
                </div>
              ) : (
                <p className="text-2xl font-bold text-blue-900">
                  {reporteGeneral?.unidades_vendidas || 0}
                </p>
              )}
              <p className="text-xs text-blue-700 mt-1">
                {reporteGeneral?.productos_unicos || 0} productos diferentes
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-red-50 border-red-200 overflow-hidden">
          <div className="relative">
            <div className="absolute right-0 top-0 -mt-4 -mr-4 opacity-50 text-red-300">
              <FaPercent size={60} />
            </div>
            <div className="z-10 relative">
              <h3 className="text-red-800 font-medium text-sm">Descuentos</h3>
              {loadingGeneral ? (
                <div className="h-8 flex items-center">
                  <Spinner size="sm" />
                </div>
              ) : (
                <p className="text-2xl font-bold text-red-900">
                  {formatearMoneda(reporteGeneral?.descuentos || 0)}
                </p>
              )}
              <p className="text-xs text-red-700 mt-1">
                {((reporteGeneral?.descuentos / (reporteGeneral?.subtotal || 1)) * 100).toFixed(2)}% del subtotal
              </p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Ventas por Día"
          icon={<FaChartLine />}
        >
          {loadingVentasPorDia ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              {ventasPorDia.length === 0 ? (
                <div className="text-center py-8">
                  <FaChartLine className="mx-auto text-4xl text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">
                    No hay datos disponibles
                  </h3>
                  <p className="text-gray-500">
                    No se encontraron ventas en el período seleccionado.
                  </p>
                </div>
              ) : (
                <div className="h-80">
                  <GraficoVentasPorPeriodo datos={ventasPorDia} />
                </div>
              )}
            </>
          )}
        </Card>
        
        <Card
          title="Ventas por Método de Pago"
          icon={<FaChartPie />}
        >
          {loadingVentasPorMetodo ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              {ventasPorMetodoPago.length === 0 ? (
                <div className="text-center py-8">
                  <FaChartPie className="mx-auto text-4xl text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">
                    No hay datos disponibles
                  </h3>
                  <p className="text-gray-500">
                    No se encontraron ventas en el período seleccionado.
                  </p>
                </div>
              ) : (
                <div className="h-80">
                  <GraficoVentasPorMetodoPago datos={ventasPorMetodoPago} />
                </div>
              )}
            </>
          )}
        </Card>
      </div>
      
      {/* Productos más vendidos */}
      <Card
        title="Productos Más Vendidos"
        icon={<FaBoxes />}
      >
        {loadingProductos ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <>
            {productosMasVendidos.length === 0 ? (
              <div className="text-center py-8">
                <FaBoxes className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay datos disponibles
                </h3>
                <p className="text-gray-500">
                  No se encontraron ventas de productos en el período seleccionado.
                </p>
              </div>
            ) : (
              <div className="h-96">
                <GraficoProductosMasVendidos datos={productosMasVendidos} />
              </div>
            )}
          </>
        )}
      </Card>
      
      {/* Tabla de ventas */}
      <Card
        title="Detalle de Ventas"
        icon={<FaShoppingCart />}
      >
        {loadingVentas ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          <>
            {ventas.length === 0 ? (
              <div className="text-center py-8">
                <FaShoppingCart className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay ventas en el período seleccionado
                </h3>
                <p className="text-gray-500">
                  Prueba a cambiar los filtros para ver resultados.
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
    </div>
  );
};

export default ReporteVentas;