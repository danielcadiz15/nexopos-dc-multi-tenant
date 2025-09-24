// src/pages/vehiculos/ReporteVehiculos.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import vehiculosService from '../../services/vehiculos.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaCar, FaChartBar, FaGasPump, FaTools, FaDollarSign,
  FaArrowLeft, FaCalendarAlt, FaExclamationTriangle,
  FaTachometerAlt, FaChartLine, FaMoneyBillWave
} from 'react-icons/fa';

/**
 * Dashboard de reportes para vehículos
 */
const ReporteVehiculos = () => {
  const navigate = useNavigate();
  
  // Estados
  const [vehiculos, setVehiculos] = useState([]);
  const [cargas, setCargas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mes'); // mes, trimestre, año
  
  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, [periodo]);
  
  /**
   * Carga todos los datos necesarios
   */
  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Calcular fechas según el período
      const fechaHasta = new Date();
      const fechaDesde = new Date();
      
      switch (periodo) {
        case 'mes':
          fechaDesde.setMonth(fechaDesde.getMonth() - 1);
          break;
        case 'trimestre':
          fechaDesde.setMonth(fechaDesde.getMonth() - 3);
          break;
        case 'año':
          fechaDesde.setFullYear(fechaDesde.getFullYear() - 1);
          break;
      }
      
      const filtros = {
        fecha_desde: fechaDesde.toISOString().split('T')[0],
        fecha_hasta: fechaHasta.toISOString().split('T')[0]
      };
      
      const [vehiculosData, cargasData, serviciosData, gastosData, statsData] = await Promise.all([
        vehiculosService.obtenerTodos(),
        vehiculosService.obtenerCombustible(filtros),
        vehiculosService.obtenerServicios(filtros),
        vehiculosService.obtenerGastos(filtros),
        vehiculosService.obtenerEstadisticas()
      ]);
      
      setVehiculos(vehiculosData);
      setCargas(cargasData);
      setServicios(serviciosData);
      setGastos(gastosData);
      setEstadisticas(statsData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Calcula estadísticas por vehículo
   */
  const calcularEstadisticasPorVehiculo = () => {
    const estadisticasPorVehiculo = {};
    
    // Inicializar con todos los vehículos
    vehiculos.forEach(vehiculo => {
      estadisticasPorVehiculo[vehiculo.id] = {
        vehiculo,
        totalCombustible: 0,
        totalServicios: 0,
        totalGastos: 0,
        totalGeneral: 0,
        cantidadCargas: 0,
        litrosCargados: 0,
        kmRecorridos: 0
      };
    });
    
    // Sumar combustible
    cargas.forEach(carga => {
      if (estadisticasPorVehiculo[carga.vehiculo_id]) {
        estadisticasPorVehiculo[carga.vehiculo_id].totalCombustible += carga.monto || 0;
        estadisticasPorVehiculo[carga.vehiculo_id].cantidadCargas += 1;
        estadisticasPorVehiculo[carga.vehiculo_id].litrosCargados += carga.litros || 0;
      }
    });
    
    // Sumar servicios
    servicios.forEach(servicio => {
      if (estadisticasPorVehiculo[servicio.vehiculo_id]) {
        estadisticasPorVehiculo[servicio.vehiculo_id].totalServicios += servicio.monto || 0;
      }
    });
    
    // Sumar gastos
    gastos.forEach(gasto => {
      if (estadisticasPorVehiculo[gasto.vehiculo_id]) {
        estadisticasPorVehiculo[gasto.vehiculo_id].totalGastos += gasto.monto || 0;
      }
    });
    
    // Calcular totales y km recorridos
    Object.values(estadisticasPorVehiculo).forEach(stats => {
      stats.totalGeneral = stats.totalCombustible + stats.totalServicios + stats.totalGastos;
      
      // Calcular km recorridos en el período
      const cargasVehiculo = cargas
        .filter(c => c.vehiculo_id === stats.vehiculo.id)
        .sort((a, b) => a.km_carga - b.km_carga);
        
      if (cargasVehiculo.length > 1) {
        const primeraKm = cargasVehiculo[0].km_carga;
        const ultimaKm = cargasVehiculo[cargasVehiculo.length - 1].km_carga;
        stats.kmRecorridos = ultimaKm - primeraKm;
      }
    });
    
    return Object.values(estadisticasPorVehiculo);
  };
  
  /**
   * Calcula gastos por categoría
   */
  const calcularGastosPorCategoria = () => {
    const gastosPorCategoria = {
      combustible: cargas.reduce((sum, c) => sum + (c.monto || 0), 0),
      servicios: servicios.reduce((sum, s) => sum + (s.monto || 0), 0),
      seguro: 0,
      patente: 0,
      multas: 0,
      lavado: 0,
      otros: 0
    };
    
    gastos.forEach(gasto => {
      if (gastosPorCategoria.hasOwnProperty(gasto.categoria)) {
        gastosPorCategoria[gasto.categoria] += gasto.monto || 0;
      }
    });
    
    return gastosPorCategoria;
  };
  
  /**
   * Identifica vehículos con mayor gasto
   */
  const getTopVehiculosPorGasto = () => {
    const stats = calcularEstadisticasPorVehiculo();
    return stats
      .sort((a, b) => b.totalGeneral - a.totalGeneral)
      .slice(0, 5);
  };
  
  /**
   * Formatea moneda
   */
  const formatearMoneda = (valor) => {
    return `$${parseFloat(valor || 0).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const estadisticasPorVehiculo = calcularEstadisticasPorVehiculo();
  const gastosPorCategoria = calcularGastosPorCategoria();
  const topVehiculos = getTopVehiculosPorGasto();
  const totalGastosPeriodo = Object.values(gastosPorCategoria).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            color="secondary"
            size="sm"
            onClick={() => navigate('/vehiculos')}
            icon={<FaArrowLeft />}
          >
            Volver
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Reportes de Vehículos
            </h1>
            <p className="text-gray-600">
              Análisis de gastos y rendimiento de la flota
            </p>
          </div>
        </div>
        
        {/* Selector de período */}
        <div className="flex space-x-2">
          {[
            { value: 'mes', label: 'Último Mes' },
            { value: 'trimestre', label: 'Último Trimestre' },
            { value: 'año', label: 'Último Año' }
          ].map(p => (
            <Button
              key={p.value}
              color={periodo === p.value ? 'primary' : 'white'}
              size="sm"
              onClick={() => setPeriodo(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Resumen general */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-800 text-sm font-medium">Total Gastos</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatearMoneda(totalGastosPeriodo)}
              </p>
              <p className="text-xs text-blue-600 mt-1">En el período</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FaDollarSign className="text-blue-600 text-xl" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-green-800 text-sm font-medium">Cargas Combustible</p>
              <p className="text-2xl font-bold text-green-900">
                {cargas.length}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {cargas.reduce((sum, c) => sum + (c.litros || 0), 0).toFixed(2)} litros
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <FaGasPump className="text-green-600 text-xl" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-yellow-800 text-sm font-medium">Servicios</p>
              <p className="text-2xl font-bold text-yellow-900">
                {servicios.length}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                {formatearMoneda(gastosPorCategoria.servicios)}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FaTools className="text-yellow-600 text-xl" />
            </div>
          </div>
        </Card>
        
        <Card className="bg-red-50 border-red-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-red-800 text-sm font-medium">Alertas Activas</p>
              <p className="text-2xl font-bold text-red-900">
                {estadisticas?.alertas_seguro?.length || 0}
              </p>
              <p className="text-xs text-red-600 mt-1">Seguros por vencer</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <FaExclamationTriangle className="text-red-600 text-xl" />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Distribución de gastos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FaChartBar className="mr-2" />
            Distribución de Gastos
          </h3>
          
          <div className="space-y-3">
            {Object.entries(gastosPorCategoria).map(([categoria, monto]) => {
              const porcentaje = totalGastosPeriodo > 0 
                ? (monto / totalGastosPeriodo * 100).toFixed(1)
                : 0;
                
              return (
                <div key={categoria}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium capitalize">
                      {categoria.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatearMoneda(monto)} ({porcentaje}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        
        <Card>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FaChartLine className="mr-2" />
            Top 5 Vehículos por Gasto
          </h3>
          
          {topVehiculos.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No hay datos suficientes
            </p>
          ) : (
            <div className="space-y-3">
              {topVehiculos.map((stats, index) => (
                <div 
                  key={stats.vehiculo.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => navigate(`/vehiculos/${stats.vehiculo.id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-gray-400">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{stats.vehiculo.patente}</p>
                      <p className="text-sm text-gray-600">
                        {stats.vehiculo.marca} {stats.vehiculo.modelo}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatearMoneda(stats.totalGeneral)}</p>
                    <p className="text-xs text-gray-500">
                      {stats.kmRecorridos > 0 ? `${stats.kmRecorridos.toLocaleString()} km` : 'Sin datos km'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      
      {/* Tabla detallada por vehículo */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FaTachometerAlt className="mr-2" />
          Detalle por Vehículo
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Combustible
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicios
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Otros Gastos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rendimiento
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {estadisticasPorVehiculo.map((stats) => {
                const rendimiento = stats.litrosCargados > 0 
                  ? (stats.kmRecorridos / stats.litrosCargados).toFixed(2)
                  : '-';
                  
                return (
                  <tr 
                    key={stats.vehiculo.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/vehiculos/${stats.vehiculo.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {stats.vehiculo.patente}
                        </div>
                        <div className="text-sm text-gray-500">
                          {stats.vehiculo.marca} {stats.vehiculo.modelo}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {formatearMoneda(stats.totalCombustible)}
                        <div className="text-xs text-gray-500">
                          {stats.cantidadCargas} cargas
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatearMoneda(stats.totalServicios)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatearMoneda(stats.totalGastos)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {formatearMoneda(stats.totalGeneral)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rendimiento !== '-' ? `${rendimiento} km/L` : rendimiento}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-3 font-medium text-gray-900">
                  TOTALES
                </td>
                <td className="px-6 py-3 font-medium text-gray-900">
                  {formatearMoneda(gastosPorCategoria.combustible)}
                </td>
                <td className="px-6 py-3 font-medium text-gray-900">
                  {formatearMoneda(gastosPorCategoria.servicios)}
                </td>
                <td className="px-6 py-3 font-medium text-gray-900">
                  {formatearMoneda(
                    gastosPorCategoria.seguro + 
                    gastosPorCategoria.patente + 
                    gastosPorCategoria.multas + 
                    gastosPorCategoria.lavado + 
                    gastosPorCategoria.otros
                  )}
                </td>
                <td className="px-6 py-3 font-bold text-gray-900">
                  {formatearMoneda(totalGastosPeriodo)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ReporteVehiculos;