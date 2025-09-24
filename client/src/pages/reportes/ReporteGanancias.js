/**
 * Página de Reporte de Ganancias
 * 
 * Muestra un análisis detallado de las ganancias en un período,
 * con gráficos y tablas para mejor comprensión.
 * 
 * @module pages/reportes/ReporteGanancias
 * @requires react, react-icons/fa, recharts, ../../services/reportes.service
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaChartLine, FaChartPie, FaBoxOpen, FaUsers,
  FaDownload, FaCalendarAlt, FaPercent
} from 'react-icons/fa';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';

// Servicios
import reportesService from '../../services/reportes.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import DateRangePicker from '../../components/common/DateRangePicker';

// Utilidades para fechas
import { 
  formatDate, 
  getFechaInicioMes, 
  getFechaFinMes,
  formatCurrency
} from '../../utils/format';

/**
 * Componente de página para reporte de ganancias
 * @returns {JSX.Element} Componente ReporteGanancias
 */
const ReporteGanancias = () => {
  const navigate = useNavigate();
  
  // Estado para fechas
  const [fechaInicio, setFechaInicio] = useState('2025-05-01');
  const [fechaFin, setFechaFin] = useState('2025-05-31');
  const [agrupacion, setAgrupacion] = useState('dia');
  
  // Estado para datos
  const [loading, setLoading] = useState(true);
  const [reporte, setReporte] = useState(null);
  
  /**
   * Carga los datos del reporte
   */
  useEffect(() => {
    const cargarReporte = async () => {
      try {
        setLoading(true);
        const data = await reportesService.obtenerReporteGanancias(
          fechaInicio,
          fechaFin,
          agrupacion
        );
        
        // Validar y normalizar los datos
        const reporteNormalizado = {
          resumen: {
            ventas_total: data?.resumen?.ventas_total || 0,
            costo_total: data?.resumen?.costo_total || 0,
            ganancia_bruta: data?.resumen?.ganancia_bruta || 0
          },
          evolucionGanancias: Array.isArray(data?.evolucionGanancias) ? data.evolucionGanancias : [],
          gananciasPorCategoria: Array.isArray(data?.gananciasPorCategoria) ? data.gananciasPorCategoria : [],
          topProductosPorGanancia: Array.isArray(data?.topProductosPorGanancia) ? data.topProductosPorGanancia : [],
          productosMasVendidos: Array.isArray(data?.productosMasVendidos) ? data.productosMasVendidos : [],
          mejoresClientes: Array.isArray(data?.mejoresClientes) ? data.mejoresClientes : [],
          productosMenosVendidos: Array.isArray(data?.productosMenosVendidos) ? data.productosMenosVendidos : []
        };
        
        setReporte(reporteNormalizado);
      } catch (error) {
        console.error('Error al cargar reporte:', error);
        toast.error('Error al cargar el reporte de ganancias');
        
        // Establecer un reporte vacío pero válido
        setReporte({
          resumen: {
            ventas_total: 0,
            costo_total: 0,
            ganancia_bruta: 0
          },
          evolucionGanancias: [],
          gananciasPorCategoria: [],
          topProductosPorGanancia: [],
          productosMasVendidos: [],
          mejoresClientes: [],
          productosMenosVendidos: []
        });
      } finally {
        setLoading(false);
      }
    };
    
    cargarReporte();
  }, [fechaInicio, fechaFin, agrupacion]);
  
  /**
   * Actualiza el rango de fechas
   * @param {Date} inicio - Fecha de inicio
   * @param {Date} fin - Fecha de fin
   */
  const actualizarRango = (inicio, fin) => {
    setFechaInicio(formatDate(inicio));
    setFechaFin(formatDate(fin));
  };
  
  /**
   * Cambia el tipo de agrupación
   * @param {Event} e - Evento de cambio
   */
  const cambiarAgrupacion = (e) => {
    setAgrupacion(e.target.value);
  };
  
  /**
   * Exporta el reporte a Excel
   * TODO: Implementar exportación real
   */
  const exportarExcel = () => {
    toast.info('Exportando reporte a Excel...');
    // Aquí iría la lógica para exportar a Excel
  };
  
  /**
   * Colores para los gráficos
   */
  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];
  
  /**
   * Formatea valores seguros
   */
  const safeFormatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '$0.00';
    }
    return formatCurrency(value);
  };
  
  /**
   * Calcula porcentaje seguro
   */
  const safePercentage = (numerator, denominator) => {
    if (!numerator || !denominator || denominator === 0) {
      return '0.00';
    }
    return ((numerator / denominator) * 100).toFixed(2);
  };
  
  /**
   * Custom Tooltip para gráficos con validación
   */
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }
    
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {safeFormatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };
  
  // Si está cargando, mostrar spinner
  if (loading && !reporte) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Reporte de Ganancias</h1>
        
        <div className="flex space-x-2">
          <Button
            color="primary"
            onClick={exportarExcel}
            icon={<FaDownload />}
          >
            Exportar Excel
          </Button>
        </div>
      </div>
      
      {/* Filtros */}
		<Card>
		  <div className="flex flex-col md:flex-row md:items-center gap-4">
			<div className="flex-grow">
			  <label className="block text-sm font-medium text-gray-700 mb-1">
				Período
			  </label>
			  <div className="flex gap-2">
				<div>
				  <label className="block text-xs text-gray-500 mb-1">Fecha Inicio</label>
				  <input
					type="date"
					value={fechaInicio}
					onChange={(e) => setFechaInicio(e.target.value)}
					className="border border-gray-300 rounded-md shadow-sm p-2"
				  />
				</div>
				<div>
				  <label className="block text-xs text-gray-500 mb-1">Fecha Fin</label>
				  <input
					type="date"
					value={fechaFin}
					onChange={(e) => setFechaFin(e.target.value)}
					className="border border-gray-300 rounded-md shadow-sm p-2"
				  />
				</div>
			  </div>
			</div>
			
			<div className="w-full md:w-48">
			  <label className="block text-sm font-medium text-gray-700 mb-1">
				Agrupar por
			  </label>
			  <select
				value={agrupacion}
				onChange={cambiarAgrupacion}
				className="w-full border border-gray-300 rounded-md shadow-sm p-2"
			  >
				<option value="dia">Día</option>
				<option value="semana">Semana</option>
				<option value="mes">Mes</option>
			  </select>
			</div>
			
			{/* Botones de período rápido */}
			<div className="flex flex-wrap gap-2">
			  <button
				onClick={() => {
				  const hoy = new Date();
				  setFechaInicio(hoy.toISOString().split('T')[0]);
				  setFechaFin(hoy.toISOString().split('T')[0]);
				}}
				className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
			  >
				Hoy
			  </button>
			  <button
				onClick={() => {
				  const hoy = new Date();
				  const hace7Dias = new Date(hoy);
				  hace7Dias.setDate(hace7Dias.getDate() - 7);
				  setFechaInicio(hace7Dias.toISOString().split('T')[0]);
				  setFechaFin(hoy.toISOString().split('T')[0]);
				}}
				className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
			  >
				Última Semana
			  </button>
			  <button
				onClick={() => {
				  const hoy = new Date();
				  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
				  setFechaInicio(primerDiaMes.toISOString().split('T')[0]);
				  setFechaFin(hoy.toISOString().split('T')[0]);
				}}
				className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
			  >
				Este Mes
			  </button>
			  <button
				onClick={() => {
				  // Mayo 2025 - donde están tus ventas
				  setFechaInicio('2025-05-01');
				  setFechaFin('2025-05-31');
				}}
				className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
			  >
				Mayo 2025
			  </button>
			</div>
			
			<div className="mt-4 md:mt-6">
			  <Button
				color="primary"
				onClick={() => {
				  // Recargar con los mismos filtros
				  const cargarDatos = async () => {
					try {
					  setLoading(true);
					  const data = await reportesService.obtenerReporteGanancias(fechaInicio, fechaFin, agrupacion);
					  
					  const reporteNormalizado = {
						resumen: {
						  ventas_total: data?.resumen?.ventas_total || 0,
						  costo_total: data?.resumen?.costo_total || 0,
						  ganancia_bruta: data?.resumen?.ganancia_bruta || 0
						},
						evolucionGanancias: Array.isArray(data?.evolucionGanancias) ? data.evolucionGanancias : [],
						gananciasPorCategoria: Array.isArray(data?.gananciasPorCategoria) ? data.gananciasPorCategoria : [],
						topProductosPorGanancia: Array.isArray(data?.topProductosPorGanancia) ? data.topProductosPorGanancia : [],
						productosMasVendidos: Array.isArray(data?.productosMasVendidos) ? data.productosMasVendidos : [],
						mejoresClientes: Array.isArray(data?.mejoresClientes) ? data.mejoresClientes : [],
						productosMenosVendidos: Array.isArray(data?.productosMenosVendidos) ? data.productosMenosVendidos : []
					  };
					  
					  setReporte(reporteNormalizado);
					} catch (error) {
					  console.error('Error al cargar reporte:', error);
					  toast.error('Error al cargar el reporte de ganancias');
					} finally {
					  setLoading(false);
					}
				  };
				  cargarDatos();
				}}
				loading={loading}
				icon={<FaCalendarAlt />}
			  >
				Actualizar
			  </Button>
			</div>
		  </div>
		</Card>
      
      {reporte && (
        <>
          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <FaChartLine size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Ventas Totales</p>
                  <p className="text-xl font-semibold">
                    {safeFormatCurrency(reporte?.resumen?.ventas_total)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100 text-red-600">
                  <FaChartLine size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Costo Total</p>
                  <p className="text-xl font-semibold">
                    {safeFormatCurrency(reporte?.resumen?.costo_total)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <FaChartLine size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Ganancia Bruta</p>
                  <p className="text-xl font-semibold">
                    {safeFormatCurrency(reporte?.resumen?.ganancia_bruta)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <FaChartPie size={24} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Margen Promedio</p>
                  <p className="text-xl font-semibold">
                    {safePercentage(reporte?.resumen?.ganancia_bruta, reporte?.resumen?.ventas_total)}%
                  </p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* Evolución de ganancias (gráfico de línea) */}
          <Card 
            title="Evolución de Ganancias" 
            icon={<FaChartLine />}
          >
            <div className="h-80">
              {reporte?.evolucionGanancias && reporte.evolucionGanancias.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={reporte.evolucionGanancias}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="periodo" 
                      label={{ 
                        value: agrupacion === 'dia' ? 'Día' : 
                               agrupacion === 'semana' ? 'Semana' : 'Mes',
                        position: 'insideBottom',
                        offset: -5
                      }}
                    />
                    <YAxis 
                      label={{ 
                        value: 'Valor ($)', 
                        angle: -90, 
                        position: 'insideLeft',
                        offset: -5
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ventas_total"
                      name="Ventas"
                      stroke="#3B82F6"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="costo_total"
                      name="Costos"
                      stroke="#EF4444"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ganancia"
                      name="Ganancia"
                      stroke="#10B981"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No hay datos disponibles para mostrar
                </div>
              )}
            </div>
          </Card>
          
          {/* Gráficos y tablas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ganancias por categoría */}
            <Card 
              title="Ganancias por Categoría" 
              icon={<FaChartPie />}
            >
              <div className="h-80">
                {reporte?.gananciasPorCategoria && reporte.gananciasPorCategoria.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reporte.gananciasPorCategoria}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="ganancia"
                        nameKey="categoria"
                        label={({ categoria, percent }) => 
                          `${categoria}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                        }
                      >
                        {reporte.gananciasPorCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => safeFormatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No hay datos disponibles para mostrar
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <Table
                  columns={[
                    { header: 'Categoría', accessor: 'categoria' },
                    { 
                      header: 'Ventas',
                      accessor: 'ventas_total',
                      cell: (row) => safeFormatCurrency(row?.ventas_total)
                    },
                    { 
                      header: 'Ganancia',
                      accessor: 'ganancia',
                      cell: (row) => safeFormatCurrency(row?.ganancia)
                    },
                    { 
                      header: 'Margen',
                      accessor: 'margen',
                      cell: (row) => `${(row?.margen || 0).toFixed(2)}%`
                    }
                  ]}
                  data={Array.isArray(reporte?.gananciasPorCategoria) ? reporte.gananciasPorCategoria : []}
                  striped={true}
                />
              </div>
            </Card>
            
            {/* Productos más rentables */}
            <Card 
              title="Productos Más Rentables" 
              icon={<FaBoxOpen />}
            >
              <div className="h-80">
                {reporte?.topProductosPorGanancia && reporte.topProductosPorGanancia.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reporte.topProductosPorGanancia.slice(0, 5)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="nombre" 
                        width={150}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip formatter={(value) => safeFormatCurrency(value)} />
                      <Legend />
                      <Bar 
                        dataKey="ganancia" 
                        name="Ganancia" 
                        fill="#10B981" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No hay datos disponibles para mostrar
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <Table
                  columns={[
                    { header: 'Producto', accessor: 'nombre' },
                    { 
                      header: 'Unidades',
                      accessor: 'unidades_vendidas',
                      cell: (row) => row?.unidades_vendidas || 0
                    },
                    { 
                      header: 'Ganancia',
                      accessor: 'ganancia',
                      cell: (row) => safeFormatCurrency(row?.ganancia)
                    },
                    { 
                      header: 'Margen',
                      accessor: 'margen',
                      cell: (row) => `${(row?.margen || 0).toFixed(2)}%`
                    }
                  ]}
                  data={Array.isArray(reporte?.topProductosPorGanancia) ? reporte.topProductosPorGanancia : []}
                  striped={true}
                />
              </div>
            </Card>
            
            {/* Productos más vendidos */}
            <Card 
              title="Productos Más Vendidos" 
              icon={<FaBoxOpen />}
            >
              <div className="h-80">
                {reporte?.productosMasVendidos && reporte.productosMasVendidos.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reporte.productosMasVendidos.slice(0, 5)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="nombre" 
                        width={150}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey="unidades_vendidas" 
                        name="Unidades" 
                        fill="#3B82F6" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No hay datos disponibles para mostrar
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <Table
                  columns={[
                    { header: 'Producto', accessor: 'nombre' },
                    { 
                      header: 'Unidades',
                      accessor: 'unidades_vendidas',
                      cell: (row) => row?.unidades_vendidas || 0
                    },
                    { 
                      header: 'Ventas',
                      accessor: 'ventas_total',
                      cell: (row) => safeFormatCurrency(row?.ventas_total)
                    }
                  ]}
                  data={Array.isArray(reporte?.productosMasVendidos) ? reporte.productosMasVendidos : []}
                  striped={true}
                />
              </div>
            </Card>
            
            {/* Mejores clientes */}
            <Card 
              title="Mejores Clientes" 
              icon={<FaUsers />}
            >
              <div className="h-80">
                {reporte?.mejoresClientes && reporte.mejoresClientes.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reporte.mejoresClientes.slice(0, 5)}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="cliente" 
                        width={150}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip formatter={(value, name) => 
                        name === 'monto_total' ? safeFormatCurrency(value) : value
                      } />
                      <Legend />
                      <Bar 
                        dataKey="monto_total" 
                        name="Total Comprado" 
                        fill="#8B5CF6" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No hay datos disponibles para mostrar
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <Table
                  columns={[
                    { header: 'Cliente', accessor: 'cliente' },
                    { 
                      header: 'Compras',
                      accessor: 'total_compras',
                      cell: (row) => row?.total_compras || 0
                    },
                    { 
                      header: 'Total',
                      accessor: 'monto_total',
                      cell: (row) => safeFormatCurrency(row?.monto_total)
                    }
                  ]}
                  data={Array.isArray(reporte?.mejoresClientes) ? reporte.mejoresClientes : []}
                  striped={true}
                />
              </div>
            </Card>
          </div>
          
          {/* Productos menos vendidos */}
          <Card 
            title="Productos Menos Vendidos o Sin Ventas" 
            icon={<FaBoxOpen />}
          >
            <Table
              columns={[
                { header: 'Código', accessor: 'codigo' },
                { header: 'Producto', accessor: 'nombre' },
                { 
                  header: 'Unidades',
                  accessor: 'unidades_vendidas',
                  cell: (row) => row?.unidades_vendidas || 0
                },
                { 
                  header: 'Ventas',
                  accessor: 'ventas_total',
                  cell: (row) => safeFormatCurrency(row?.ventas_total)
                }
              ]}
              data={Array.isArray(reporte?.productosMenosVendidos) ? reporte.productosMenosVendidos : []}
              striped={true}
              pagination={true}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default ReporteGanancias;