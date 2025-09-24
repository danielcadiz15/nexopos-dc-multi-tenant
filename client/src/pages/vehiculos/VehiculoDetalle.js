// src/pages/vehiculos/VehiculoDetalle.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import vehiculosService from '../../services/vehiculos.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import CargaCombustible from './CargaCombustible';
import ServicioForm from './ServicioForm';
import GastoForm from './GastoForm';

// Iconos
import { 
  FaCar, FaGasPump, FaTools, FaDollarSign, FaArrowLeft,
  FaEdit, FaChartBar, FaCalendarAlt, FaRoad, FaExclamationTriangle,
  FaPlus, FaHistory, FaMoneyBillWave, FaCheckCircle
} from 'react-icons/fa';

/**
 * Vista detallada del vehículo con tabs
 */
const VehiculoDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados
  const [vehiculo, setVehiculo] = useState(null);
  const [estadisticasCombustible, setEstadisticasCombustible] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabActiva, setTabActiva] = useState('general');
  
  // Estados para modales
  const [showCargaCombustible, setShowCargaCombustible] = useState(false);
  const [showServicioForm, setShowServicioForm] = useState(false);
  const [showGastoForm, setShowGastoForm] = useState(false);
  
  // Cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, [id]);
  
  /**
   * Carga todos los datos del vehículo
   */
  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const [vehiculoData, statsData] = await Promise.all([
        vehiculosService.obtenerPorId(id),
        vehiculosService.obtenerEstadisticasCombustible(id)
      ]);
      
      setVehiculo(vehiculoData);
      setEstadisticasCombustible(statsData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar los datos del vehículo');
      navigate('/vehiculos');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Formatea una fecha para mostrar
   */
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    
    if (fecha._seconds) {
      return new Date(fecha._seconds * 1000).toLocaleDateString();
    }
    
    return new Date(fecha).toLocaleDateString();
  };
  
  /**
   * Formatea moneda
   */
  const formatearMoneda = (valor) => {
    return `$${parseFloat(valor || 0).toFixed(2)}`;
  };
  
  /**
   * Calcula el estado del seguro
   */
  const getEstadoSeguro = () => {
    if (!vehiculo?.fecha_vencimiento_seguro) {
      return { texto: 'No registrado', color: 'gray', icono: null };
    }
    
    const fecha = vehiculo.fecha_vencimiento_seguro._seconds 
      ? new Date(vehiculo.fecha_vencimiento_seguro._seconds * 1000)
      : new Date(vehiculo.fecha_vencimiento_seguro);
      
    const diasParaVencer = Math.floor((fecha - new Date()) / (1000 * 60 * 60 * 24));
    
    if (diasParaVencer < 0) {
      return { 
        texto: `Vencido hace ${Math.abs(diasParaVencer)} días`, 
        color: 'red',
        icono: <FaExclamationTriangle />
      };
    } else if (diasParaVencer <= 7) {
      return { 
        texto: `Vence en ${diasParaVencer} días`, 
        color: 'red',
        icono: <FaExclamationTriangle />
      };
    } else if (diasParaVencer <= 30) {
      return { 
        texto: `Vence en ${diasParaVencer} días`, 
        color: 'yellow',
        icono: <FaExclamationTriangle />
      };
    } else {
      return { 
        texto: `Vigente (vence en ${diasParaVencer} días)`, 
        color: 'green',
        icono: <FaCheckCircle />
      };
    }
  };
  
  /**
   * Renderiza el contenido según la tab activa
   */
  const renderTabContent = () => {
    switch (tabActiva) {
      case 'general':
        return renderInformacionGeneral();
      case 'combustible':
        return renderHistorialCombustible();
      case 'servicios':
        return renderHistorialServicios();
      case 'gastos':
        return renderHistorialGastos();
      default:
        return null;
    }
  };
  
  /**
   * Renderiza la información general
   */
  const renderInformacionGeneral = () => {
    const estadoSeguro = getEstadoSeguro();
    
    return (
      <div className="space-y-6">
        {/* Datos básicos */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Información del Vehículo</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Patente</p>
              <p className="font-semibold text-lg">{vehiculo.patente}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Marca y Modelo</p>
              <p className="font-semibold">{vehiculo.marca} {vehiculo.modelo}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Año</p>
              <p className="font-semibold">{vehiculo.año}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Tipo</p>
              <p className="font-semibold capitalize">{vehiculo.tipo}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Kilometraje Actual</p>
              <p className="font-semibold text-lg">
                {vehiculo.km_actual?.toLocaleString() || 0} km
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Fecha de Alta</p>
              <p className="font-semibold">{formatearFecha(vehiculo.fecha_alta)}</p>
            </div>
          </div>
        </Card>
        
        {/* Estado del seguro */}
        <Card className={`border-l-4 ${
          estadoSeguro.color === 'red' ? 'border-red-500 bg-red-50' :
          estadoSeguro.color === 'yellow' ? 'border-yellow-500 bg-yellow-50' :
          estadoSeguro.color === 'green' ? 'border-green-500 bg-green-50' :
          'border-gray-500 bg-gray-50'
        }`}>
          <div className="flex items-start space-x-3">
            <div className={`text-2xl ${
              estadoSeguro.color === 'red' ? 'text-red-600' :
              estadoSeguro.color === 'yellow' ? 'text-yellow-600' :
              estadoSeguro.color === 'green' ? 'text-green-600' :
              'text-gray-600'
            }`}>
              {estadoSeguro.icono || <FaCalendarAlt />}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold">Estado del Seguro</h4>
              <p className={`text-sm ${
                estadoSeguro.color === 'red' ? 'text-red-700' :
                estadoSeguro.color === 'yellow' ? 'text-yellow-700' :
                estadoSeguro.color === 'green' ? 'text-green-700' :
                'text-gray-700'
              }`}>
                {estadoSeguro.texto}
              </p>
              {vehiculo.fecha_vencimiento_seguro && (
                <p className="text-sm text-gray-600 mt-1">
                  Fecha de vencimiento: {formatearFecha(vehiculo.fecha_vencimiento_seguro)}
                </p>
              )}
            </div>
          </div>
        </Card>
        
        {/* Estadísticas de combustible */}
        {estadisticasCombustible && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Estadísticas de Combustible</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <FaGasPump className="mx-auto text-3xl text-blue-500 mb-2" />
                <p className="text-sm text-gray-600">Total Cargas</p>
                <p className="font-bold text-xl">{estadisticasCombustible.total_cargas}</p>
              </div>
              
              <div className="text-center">
                <FaChartBar className="mx-auto text-3xl text-green-500 mb-2" />
                <p className="text-sm text-gray-600">Consumo Promedio</p>
                <p className="font-bold text-xl">
                  {estadisticasCombustible.consumo_promedio?.toFixed(2) || 0} km/L
                </p>
              </div>
              
              <div className="text-center">
                <FaMoneyBillWave className="mx-auto text-3xl text-yellow-500 mb-2" />
                <p className="text-sm text-gray-600">Gasto Total</p>
                <p className="font-bold text-xl">
                  {formatearMoneda(estadisticasCombustible.total_gastado)}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  };
  
  /**
   * Renderiza el historial de combustible
   */
  const renderHistorialCombustible = () => {
    const cargas = vehiculo.historial_combustible || [];
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Historial de Combustible</h3>
          <Button
            color="primary"
            size="sm"
            onClick={() => setShowCargaCombustible(true)}
            icon={<FaPlus />}
          >
            Nueva Carga
          </Button>
        </div>
        
        {cargas.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <FaGasPump className="mx-auto text-4xl text-gray-400 mb-2" />
              <p className="text-gray-500">No hay cargas de combustible registradas</p>
              <Button
                color="primary"
                size="sm"
                className="mt-4"
                onClick={() => setShowCargaCombustible(true)}
              >
                Registrar Primera Carga
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {cargas.map((carga) => (
              <Card key={carga.id} className="hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="font-semibold">
                        {formatearFecha(carga.fecha)}
                      </span>
                      <span className="text-gray-600">
                        {carga.km_carga?.toLocaleString()} km
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Litros:</span>
                        <span className="font-medium ml-1">{carga.litros} L</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total:</span>
                        <span className="font-medium ml-1">{formatearMoneda(carga.monto)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Precio/L:</span>
                        <span className="font-medium ml-1">
                          {formatearMoneda(carga.precio_litro)}
                        </span>
                      </div>
                      {carga.rendimiento && (
                        <div>
                          <span className="text-gray-600">Rendimiento:</span>
                          <span className="font-medium ml-1">
                            {carga.rendimiento.toFixed(2)} km/L
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {carga.estacion && (
                      <p className="text-sm text-gray-600 mt-1">
                        Estación: {carga.estacion}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  /**
   * Renderiza el historial de servicios
   */
  const renderHistorialServicios = () => {
    const servicios = vehiculo.historial_servicios || [];
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Historial de Servicios</h3>
          <Button
            color="primary"
            size="sm"
            onClick={() => setShowServicioForm(true)}
            icon={<FaPlus />}
          >
            Nuevo Servicio
          </Button>
        </div>
        
        {servicios.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <FaTools className="mx-auto text-4xl text-gray-400 mb-2" />
              <p className="text-gray-500">No hay servicios registrados</p>
              <Button
                color="primary"
                size="sm"
                className="mt-4"
                onClick={() => setShowServicioForm(true)}
              >
                Registrar Primer Servicio
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {servicios.map((servicio) => (
              <Card key={servicio.id} className="hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="font-semibold capitalize">
                        {servicio.tipo.replace('_', ' ')}
                      </span>
                      <span className="text-gray-600">
                        {formatearFecha(servicio.fecha)}
                      </span>
                      <span className="text-gray-600">
                        {servicio.km_servicio?.toLocaleString()} km
                      </span>
                    </div>
                    
                    {servicio.descripcion && (
                      <p className="text-sm text-gray-700 mb-2">{servicio.descripcion}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm">
                      {servicio.monto > 0 && (
                        <span>
                          <span className="text-gray-600">Costo:</span>
                          <span className="font-medium ml-1">{formatearMoneda(servicio.monto)}</span>
                        </span>
                      )}
                      {servicio.taller && (
                        <span>
                          <span className="text-gray-600">Taller:</span>
                          <span className="ml-1">{servicio.taller}</span>
                        </span>
                      )}
                    </div>
                    
                    {(servicio.proximo_km || servicio.proximo_fecha) && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                        <span className="font-medium text-yellow-800">Próximo servicio:</span>
                        {servicio.proximo_km && (
                          <span className="ml-2">
                            {servicio.proximo_km.toLocaleString()} km
                          </span>
                        )}
                        {servicio.proximo_fecha && (
                          <span className="ml-2">
                            o el {formatearFecha(servicio.proximo_fecha)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  /**
   * Renderiza el historial de gastos
   */
  const renderHistorialGastos = () => {
    const gastos = vehiculo.historial_gastos || [];
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Otros Gastos</h3>
          <Button
            color="primary"
            size="sm"
            onClick={() => setShowGastoForm(true)}
            icon={<FaPlus />}
          >
            Nuevo Gasto
          </Button>
        </div>
        
        {gastos.length === 0 ? (
          <Card>
            <div className="text-center py-8">
              <FaDollarSign className="mx-auto text-4xl text-gray-400 mb-2" />
              <p className="text-gray-500">No hay gastos adicionales registrados</p>
              <Button
                color="primary"
                size="sm"
                className="mt-4"
                onClick={() => setShowGastoForm(true)}
              >
                Registrar Primer Gasto
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {gastos.map((gasto) => (
              <Card key={gasto.id} className="hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center space-x-4 mb-1">
                      <span className="font-semibold capitalize">
                        {gasto.categoria.replace('_', ' ')}
                      </span>
                      <span className="text-gray-600">
                        {formatearFecha(gasto.fecha)}
                      </span>
                    </div>
                    {gasto.concepto && (
                      <p className="text-sm text-gray-700">{gasto.concepto}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatearMoneda(gasto.monto)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!vehiculo) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Vehículo no encontrado</p>
        <Button
          color="primary"
          className="mt-4"
          onClick={() => navigate('/vehiculos')}
        >
          Volver a Vehículos
        </Button>
      </div>
    );
  }

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
              {vehiculo.patente}
            </h1>
            <p className="text-gray-600">
              {vehiculo.marca} {vehiculo.modelo} {vehiculo.año}
            </p>
          </div>
        </div>
        
        <Button
          color="primary"
          onClick={() => navigate(`/vehiculos/editar/${id}`)}
          icon={<FaEdit />}
        >
          Editar
        </Button>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'general', label: 'Información General', icon: <FaCar /> },
            { id: 'combustible', label: 'Combustible', icon: <FaGasPump /> },
            { id: 'servicios', label: 'Servicios', icon: <FaTools /> },
            { id: 'gastos', label: 'Otros Gastos', icon: <FaDollarSign /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                ${tabActiva === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      
      {/* Contenido de la tab */}
      <div>{renderTabContent()}</div>
      
      {/* Modales */}
      {showCargaCombustible && (
        <CargaCombustible
          vehiculoId={id}
          kmActual={vehiculo.km_actual}
          onClose={() => setShowCargaCombustible(false)}
          onSuccess={() => {
            setShowCargaCombustible(false);
            cargarDatos();
          }}
        />
      )}
      
      {showServicioForm && (
        <ServicioForm
          vehiculoId={id}
          kmActual={vehiculo.km_actual}
          onClose={() => setShowServicioForm(false)}
          onSuccess={() => {
            setShowServicioForm(false);
            cargarDatos();
          }}
        />
      )}
      
      {showGastoForm && (
        <GastoForm
          vehiculoId={id}
          onClose={() => setShowGastoForm(false)}
          onSuccess={() => {
            setShowGastoForm(false);
            cargarDatos();
          }}
        />
      )}
    </div>
  );
};

export default VehiculoDetalle;