// src/pages/vehiculos/Vehiculos.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import vehiculosService from '../../services/vehiculos.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaCar, FaTruck, FaMotorcycle, FaBus, FaPlus, FaEye, FaEdit, 
  FaTrash, FaGasPump, FaExclamationTriangle, FaChartBar,
  FaTools, FaCalendarAlt, FaDollarSign, FaCheckCircle
} from 'react-icons/fa';

/**
 * Componente principal para la gestión de vehículos
 */
const Vehiculos = () => {
  const navigate = useNavigate();
  
  // Estados
  const [vehiculos, setVehiculos] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vehiculoEliminar, setVehiculoEliminar] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, []);
  
  /**
   * Carga vehiculos y estadísticas
   */
  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const [vehiculosData, statsData] = await Promise.all([
        vehiculosService.obtenerTodos(),
        vehiculosService.obtenerEstadisticas()
      ]);
      
      setVehiculos(vehiculosData);
      setEstadisticas(statsData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar los vehículos');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Prepara la eliminación de un vehículo
   */
  const prepararEliminar = (vehiculo) => {
    setVehiculoEliminar(vehiculo);
    setShowConfirmDialog(true);
  };
  
  /**
   * Confirma la eliminación del vehículo
   */
  const confirmarEliminar = async () => {
    try {
      await vehiculosService.eliminar(vehiculoEliminar.id);
      toast.success('Vehículo desactivado correctamente');
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar vehículo:', error);
      toast.error('Error al desactivar el vehículo');
    } finally {
      setShowConfirmDialog(false);
      setVehiculoEliminar(null);
    }
  };
  
  /**
   * Obtiene el icono según el tipo de vehículo
   */
  const getIconoVehiculo = (tipo) => {
    switch (tipo) {
      case 'auto':
        return <FaCar className="text-blue-500" />;
      case 'camioneta':
      case 'camion':
        return <FaTruck className="text-green-500" />;
      case 'moto':
        return <FaMotorcycle className="text-purple-500" />;
      default:
        return <FaBus className="text-gray-500" />;
    }
  };
  
  /**
   * Formatea una fecha para mostrar
   */
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    
    // Si es un objeto Firestore Timestamp
    if (fecha._seconds) {
      return new Date(fecha._seconds * 1000).toLocaleDateString();
    }
    
    // Si es una fecha string o Date
    return new Date(fecha).toLocaleDateString();
  };
  
  /**
   * Columnas para la tabla
   */
  const columns = [
    {
      header: 'Vehículo',
      accessor: 'patente',
      cell: (row) => (
        <div className="flex items-center space-x-3">
          <div className="text-2xl">
            {getIconoVehiculo(row.tipo)}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{row.patente}</div>
            <div className="text-sm text-gray-500">
              {row.marca} {row.modelo} {row.año}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Km Actual',
      accessor: 'km_actual',
      cell: (row) => (
        <span className="font-medium">
          {row.km_actual?.toLocaleString() || 0} km
        </span>
      )
    },
    {
      header: 'Última Carga',
      accessor: 'ultima_carga',
      cell: (row) => {
        if (!row.ultima_carga) {
          return <span className="text-gray-400">Sin cargas</span>;
        }
        
        return (
          <div className="text-sm">
            <div className="flex items-center">
              <FaGasPump className="mr-1 text-gray-400" />
              <span>{formatearFecha(row.ultima_carga.fecha)}</span>
            </div>
            <div className="text-gray-500">
              {row.ultima_carga.litros} L - ${row.ultima_carga.monto}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Vencimiento Seguro',
      accessor: 'fecha_vencimiento_seguro',
      cell: (row) => {
        if (!row.fecha_vencimiento_seguro) {
          return <span className="text-gray-400">No registrado</span>;
        }
        
        const fecha = row.fecha_vencimiento_seguro._seconds 
          ? new Date(row.fecha_vencimiento_seguro._seconds * 1000)
          : new Date(row.fecha_vencimiento_seguro);
          
        const diasParaVencer = Math.floor((fecha - new Date()) / (1000 * 60 * 60 * 24));
        
        let colorClass = 'text-gray-600';
        let bgClass = 'bg-gray-100';
        
        if (diasParaVencer < 0) {
          colorClass = 'text-red-600';
          bgClass = 'bg-red-100';
        } else if (diasParaVencer <= 7) {
          colorClass = 'text-red-600';
          bgClass = 'bg-red-100';
        } else if (diasParaVencer <= 30) {
          colorClass = 'text-yellow-600';
          bgClass = 'bg-yellow-100';
        } else {
          colorClass = 'text-green-600';
          bgClass = 'bg-green-100';
        }
        
        return (
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgClass} ${colorClass}`}>
            <FaCalendarAlt className="mr-1" />
            {formatearFecha(row.fecha_vencimiento_seguro)}
            {diasParaVencer < 0 && ` (Vencido)`}
            {diasParaVencer >= 0 && diasParaVencer <= 30 && ` (${diasParaVencer}d)`}
          </div>
        );
      }
    },
    {
      header: 'Alertas',
      accessor: 'alertas',
      cell: (row) => {
        if (!row.alertas || row.alertas.length === 0) {
          return (
            <span className="inline-flex items-center text-green-600">
              <FaCheckCircle className="mr-1" />
              Sin alertas
            </span>
          );
        }
        
        const alertaCritica = row.alertas.find(a => a.nivel === 'critico');
        const alerta = alertaCritica || row.alertas[0];
        
        return (
          <div className={`inline-flex items-center ${
            alerta.nivel === 'critico' ? 'text-red-600' : 'text-yellow-600'
          }`}>
            <FaExclamationTriangle className="mr-1" />
            {alerta.mensaje}
          </div>
        );
      }
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/vehiculos/${row.id}`)}
            className="text-blue-600 hover:text-blue-800"
            title="Ver detalles"
          >
            <FaEye />
          </button>
          
          <button
            onClick={() => navigate(`/vehiculos/editar/${row.id}`)}
            className="text-green-600 hover:text-green-800"
            title="Editar"
          >
            <FaEdit />
          </button>
          
          <button
            onClick={() => prepararEliminar(row)}
            className="text-red-600 hover:text-red-800"
            title="Desactivar"
          >
            <FaTrash />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Control de Vehículos</h1>
        
        <div className="flex space-x-2">
          <Link to="/vehiculos/reporte">
            <Button color="secondary" icon={<FaChartBar />}>
              Ver Reportes
            </Button>
          </Link>
          
          <Link to="/vehiculos/nuevo">
            <Button color="primary" icon={<FaPlus />}>
              Nuevo Vehículo
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Tarjetas de estadísticas */}
      {estadisticas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-800 text-sm font-medium">Total Vehículos</p>
                <p className="text-2xl font-bold text-blue-900">
                  {estadisticas.total_vehiculos || 0}
                </p>
                <p className="text-xs text-blue-600 mt-1">Activos en la flota</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaCar className="text-blue-600 text-xl" />
              </div>
            </div>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-800 text-sm font-medium">Km Total Flota</p>
                <p className="text-2xl font-bold text-green-900">
                  {estadisticas.total_km_flota?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-green-600 mt-1">Kilometraje acumulado</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <FaTruck className="text-green-600 text-xl" />
              </div>
            </div>
          </Card>
          
          <Card className="bg-yellow-50 border-yellow-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-yellow-800 text-sm font-medium">Gastos del Mes</p>
                <p className="text-2xl font-bold text-yellow-900">
                  ${estadisticas.gastos_mes_actual?.total?.toFixed(2) || '0.00'}
                </p>
                <div className="text-xs text-yellow-600 mt-1">
                  <div>Combustible: ${estadisticas.gastos_mes_actual?.combustible?.toFixed(2) || '0.00'}</div>
                  <div>Servicios: ${estadisticas.gastos_mes_actual?.servicios?.toFixed(2) || '0.00'}</div>
                </div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FaDollarSign className="text-yellow-600 text-xl" />
              </div>
            </div>
          </Card>
          
          <Card className="bg-red-50 border-red-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-red-800 text-sm font-medium">Alertas Seguro</p>
                <p className="text-2xl font-bold text-red-900">
                  {estadisticas.alertas_seguro?.length || 0}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Próximos a vencer
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <FaExclamationTriangle className="text-red-600 text-xl" />
              </div>
            </div>
          </Card>
        </div>
      )}
      
      {/* Alertas de seguros próximos a vencer */}
      {estadisticas?.alertas_seguro && estadisticas.alertas_seguro.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-3">
            <FaExclamationTriangle className="text-yellow-600 text-xl mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                Seguros Próximos a Vencer
              </h3>
              <div className="space-y-2">
                {estadisticas.alertas_seguro.slice(0, 5).map((alerta, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium">{alerta.patente}</span>
                      <span className="text-gray-600 ml-2">
                        vence el {formatearFecha(alerta.fecha_vencimiento)}
                      </span>
                    </div>
                    <span className={`font-medium ${
                      alerta.dias_para_vencer < 0 ? 'text-red-600' :
                      alerta.dias_para_vencer <= 7 ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {alerta.dias_para_vencer < 0 
                        ? `Vencido hace ${Math.abs(alerta.dias_para_vencer)} días`
                        : `${alerta.dias_para_vencer} días`
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Tabla de vehículos */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {vehiculos.length === 0 ? (
              <div className="text-center py-10">
                <FaCar className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay vehículos registrados
                </h3>
                <p className="text-gray-500 mb-4">
                  Comienza agregando el primer vehículo de tu flota
                </p>
                <Link to="/vehiculos/nuevo">
                  <Button color="primary" icon={<FaPlus />}>
                    Agregar Vehículo
                  </Button>
                </Link>
              </div>
            ) : (
              <Table
                columns={columns}
                data={vehiculos}
                pagination={true}
                itemsPerPage={10}
              />
            )}
          </>
        )}
      </Card>
      
      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Desactivar Vehículo"
        message={
          vehiculoEliminar
            ? `¿Estás seguro de desactivar el vehículo ${vehiculoEliminar.patente}? Podrás reactivarlo más tarde si es necesario.`
            : ''
        }
        confirmText="Desactivar"
        cancelText="Cancelar"
        onConfirm={confirmarEliminar}
        onCancel={() => {
          setShowConfirmDialog(false);
          setVehiculoEliminar(null);
        }}
      />
    </div>
  );
};

export default Vehiculos;