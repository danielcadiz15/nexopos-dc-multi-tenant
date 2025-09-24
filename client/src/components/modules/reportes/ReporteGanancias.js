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
  FaDownload, FaCalendarAlt
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
  const [fechaInicio, setFechaInicio] = useState(getFechaInicioMes());
  const [fechaFin, setFechaFin] = useState(getFechaFinMes());
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
        setReporte(data);
      } catch (error) {
        console.error('Error al cargar reporte:', error);
        toast.error('Error al cargar el reporte de ganancias');
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
            <DateRangePicker
              startDate={new Date(fechaInicio)}
              endDate={new Date(fechaFin)}
              onChange={actualizarRango}
              className="w-full"
            />
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
          
          <div className="mt-4 md:mt-6">
            <Button
              color="primary"
              onClick={() => {
                // Recargar con los mismos filtros (útil si hay errores)
                setLoading(true);
                reportesService.obtenerReporteGanancias(fechaInicio, fechaFin, agrupacion)
                  .then(data => {
                    setReporte(data);
                    setLoading(false);
                  })
                  .catch(error => {
                    console.error('Error al cargar reporte:', error);
                    toast.error('Error al cargar el reporte de ganancias');
                    setLoading(false);
                  });
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
                    {formatCurrency(reporte.resumen.ventas_total || 0)}
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
                    {formatCurrency(reporte.resumen.costo_total || 0)}
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
                    {formatCurrency(reporte.resumen.ganancia_bruta || 0)}
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
                    {reporte.resumen.ventas_total ? 
                      `${((reporte.resumen.ganancia_bruta / reporte.resumen.ventas_total) * 100).toFixed(2)}%` :
                      '0.00%'
                    }
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
              {reporte.evolucionGanancias && (
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
                    <Tooltip formatter={(value) => formatCurrency(value)} />
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
                {reporte.gananciasPorCategoria && (
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
                        label={({ categoria, ganancia, percent }) => 
                          `${categoria}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {reporte.gananciasPorCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              <div className="mt-4">
                <Table
                  columns={[
                    { header: 'Categoría', accessor: 'categoria' },
                    { 
                      header: 'Ventas',
                      accessor: 'ventas_total',
                      cell: (row) => formatCurrency(row.ventas_total)
                    },
                    { 
                      header: 'Ganancia',
                      accessor: 'ganancia',
                      cell: (row) => formatCurrency(row.ganancia)
                    },
                    { 
                      header: 'Margen',
                      accessor: 'margen',
                      cell: (row) => `${row.margen.toFixed(2)}%`
                    }
                  ]}
                  data={reporte.gananciasPorCategoria || []}
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
                {reporte.topProductosPorGanancia && (
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
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar 
                        dataKey="ganancia" 
                        name="Ganancia" 
                        fill="#10B981" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              <div className="mt-4">
                <Table
                  columns={[
                    { header: 'Producto', accessor: 'nombre' },
                    { 
                      header: 'Unidades',
                      accessor: 'unidades_vendidas',
                      cell: (row) => row.unidades_vendidas
                    },
                    { 
                      header: 'Ganancia',
                      accessor: 'ganancia',
                      cell: (row) => formatCurrency(row.ganancia)
                    },
                    { 
                      header: 'Margen',
                      accessor: 'margen',
                      cell: (row) => `${row.margen.toFixed(2)}%`
                    }
                  ]}
                  data={reporte.topProductosPorGanancia || []}
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
                {reporte.productosMasVendidos && (
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
                )}
              </div>
              
              <div className="mt-4">
                <Table
                  columns={[
                    { header: 'Producto', accessor: 'nombre' },
                    { 
                      header: 'Unidades',
                      accessor: 'unidades_vendidas',
                      cell: (row) => row.unidades_vendidas
                    },
                    { 
                      header: 'Ventas',
                      accessor: 'ventas_total',
                      cell: (row) => formatCurrency(row.ventas_total)
                    }
                  ]}
                  data={reporte.productosMasVendidos || []}
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
                {reporte.mejoresClientes && (
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
                        name === 'monto_total' ? formatCurrency(value) : value
                      } />
                      <Legend />
                      <Bar 
                        dataKey="monto_total" 
                        name="Total Comprado" 
                        fill="#8B5CF6" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              <div className="mt-4">
                <Table
                  columns={[
                    { header: 'Cliente', accessor: 'cliente' },
                    { 
                      header: 'Compras',
                      accessor: 'total_compras',
                      cell: (row) => row.total_compras
                    },
                    { 
                      header: 'Total',
                      accessor: 'monto_total',
                      cell: (row) => formatCurrency(row.monto_total)
                    }
                  ]}
                  data={reporte.mejoresClientes || []}
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
                  cell: (row) => row.unidades_vendidas
                },
                { 
                  header: 'Ventas',
                  accessor: 'ventas_total',
                  cell: (row) => formatCurrency(row.ventas_total)
                }
              ]}
              data={reporte.productosMenosVendidos || []}
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