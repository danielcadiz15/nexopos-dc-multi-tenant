/**
 * Página de detalle de transferencia
 * 
 * Muestra toda la información de una transferencia específica,
 * su historial y permite aprobar/rechazar si está pendiente.
 * 
 * @module pages/stock/DetalleTransferencia
 * @requires react, react-router-dom, ../../services/transferencias.service
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Servicios
import transferenciasService from '../../services/transferencias.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

// Iconos
import { 
  FaArrowLeft, FaCheck, FaTimes, FaExchangeAlt,
  FaStore, FaUser, FaCalendarAlt, FaBoxOpen,
  FaClock, FaCheckCircle, FaTimesCircle, FaHistory,
  FaFileAlt, FaPrint
} from 'react-icons/fa';

const DetalleTransferencia = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, permisos } = useAuth();
  
  // Estados
  const [transferencia, setTransferencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [showRechazoForm, setShowRechazoForm] = useState(false);
  
  // Verificar permisos
  const puedeAprobar = permisos?.includes('aprobar_transferencias') || 
                       permisos?.includes('admin') ||
                       currentUser?.rol === 'administrador';
  
  useEffect(() => {
    cargarTransferencia();
  }, [id]);
  
  /**
   * Carga los datos de la transferencia
   */
  const cargarTransferencia = async () => {
    try {
      setLoading(true);
      const data = await transferenciasService.obtenerPorId(id);
      setTransferencia(data);
    } catch (error) {
      console.error('Error al cargar transferencia:', error);
      toast.error('Error al cargar los datos de la transferencia');
      navigate('/stock/transferencias');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Aprobar transferencia
   */
  const handleAprobar = async () => {
    if (!window.confirm('¿Estás seguro de aprobar esta transferencia? Se ejecutará inmediatamente.')) {
      return;
    }
    
    setProcesando(true);
    try {
      await transferenciasService.cambiarEstado(id, 'aprobada', {
        usuario_aprueba_id: currentUser?.id
      });
      
      toast.success('Transferencia aprobada y ejecutada correctamente');
      await cargarTransferencia();
    } catch (error) {
      console.error('Error al aprobar transferencia:', error);
      toast.error('Error al aprobar la transferencia');
    } finally {
      setProcesando(false);
    }
  };
  
  /**
   * Rechazar transferencia
   */
  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) {
      toast.error('Debes especificar un motivo para rechazar');
      return;
    }
    
    setProcesando(true);
    try {
      await transferenciasService.cambiarEstado(id, 'rechazada', {
        motivo_rechazo: motivoRechazo,
        usuario_aprueba_id: currentUser?.id
      });
      
      toast.success('Transferencia rechazada');
      await cargarTransferencia();
      setShowRechazoForm(false);
      setMotivoRechazo('');
    } catch (error) {
      console.error('Error al rechazar transferencia:', error);
      toast.error('Error al rechazar la transferencia');
    } finally {
      setProcesando(false);
    }
  };
  
  /**
   * Obtiene el ícono del estado
   */
  const getIconoEstado = (estado) => {
    switch(estado) {
      case 'pendiente': return <FaClock className="text-yellow-500 text-2xl" />;
      case 'aprobada': return <FaCheckCircle className="text-green-500 text-2xl" />;
      case 'rechazada': return <FaTimesCircle className="text-red-500 text-2xl" />;
      default: return <FaExchangeAlt className="text-gray-500 text-2xl" />;
    }
  };
  
  /**
   * Obtiene el color del estado
   */
  const getColorEstado = (estado) => {
    switch(estado) {
      case 'pendiente': return 'bg-yellow-50 border-yellow-200';
      case 'aprobada': return 'bg-green-50 border-green-200';
      case 'rechazada': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!transferencia) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Transferencia no encontrada</p>
        <Button
          color="primary"
          onClick={() => navigate('/stock/transferencias')}
          className="mt-4"
        >
          Volver a Transferencias
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
            onClick={() => navigate('/stock/transferencias')}
            icon={<FaArrowLeft />}
          >
            Volver
          </Button>
          
          <h1 className="text-2xl font-bold text-gray-800">
            Detalle de Transferencia
          </h1>
        </div>
        
        <div className="flex space-x-2">
          <Button
            color="secondary"
            icon={<FaPrint />}
            onClick={() => toast.info('Impresión en desarrollo')}
          >
            Imprimir
          </Button>
          
          <Button
            color="primary"
            icon={<FaHistory />}
            onClick={() => navigate('/stock/movimientos')}
          >
            Ver Historial
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel principal - 2 columnas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Estado y acciones */}
          <Card className={`border-2 ${getColorEstado(transferencia.estado)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getIconoEstado(transferencia.estado)}
                <div>
                  <h3 className="text-lg font-medium">
                    Estado: {transferencia.estado.charAt(0).toUpperCase() + transferencia.estado.slice(1)}
                  </h3>
                  {transferencia.fecha_aprobacion && (
                    <p className="text-sm text-gray-600">
                      {transferencia.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'} el{' '}
                      {new Date(transferencia.fecha_aprobacion).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Botones de acción para transferencias pendientes */}
              {transferencia.estado === 'pendiente' && puedeAprobar && (
                <div className="flex space-x-2">
                  {!showRechazoForm ? (
                    <>
                      <Button
                        color="danger"
                        size="sm"
                        onClick={() => setShowRechazoForm(true)}
                        icon={<FaTimes />}
                      >
                        Rechazar
                      </Button>
                      
                      <Button
                        color="success"
                        size="sm"
                        onClick={handleAprobar}
                        loading={procesando}
                        icon={<FaCheck />}
                      >
                        Aprobar
                      </Button>
                    </>
                  ) : (
                    <Button
                      color="secondary"
                      size="sm"
                      onClick={() => {
                        setShowRechazoForm(false);
                        setMotivoRechazo('');
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {/* Formulario de rechazo */}
            {showRechazoForm && (
              <div className="mt-4 pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo del rechazo *
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows={3}
                  className="w-full border-gray-300 rounded-md mb-3"
                  placeholder="Explica por qué rechazas esta transferencia..."
                />
                <Button
                  color="danger"
                  fullWidth
                  onClick={handleRechazar}
                  loading={procesando}
                  disabled={!motivoRechazo.trim()}
                  icon={<FaTimes />}
                >
                  Confirmar Rechazo
                </Button>
              </div>
            )}
            
            {/* Motivo de rechazo si existe */}
            {transferencia.estado === 'rechazada' && transferencia.motivo_rechazo && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">Motivo del rechazo:</p>
                <p className="text-red-600">{transferencia.motivo_rechazo}</p>
              </div>
            )}
          </Card>
          
          {/* Productos */}
          <Card title="Productos Transferidos" icon={<FaBoxOpen />}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Producto
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Cantidad
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Stock Origen
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Stock Destino
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transferencia.productos?.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{item.producto?.nombre}</div>
                          <div className="text-sm text-gray-500">{item.producto?.codigo}</div>
                        </div>
                      </td>
                      <td className="text-center px-4 py-3">
                        <span className="font-medium text-lg">{item.cantidad}</span>
                      </td>
                      <td className="text-center px-4 py-3 text-sm text-gray-600">
                        {item.stock_origen || 0}
                      </td>
                      <td className="text-center px-4 py-3 text-sm text-gray-600">
                        {item.stock_destino || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-3 font-medium">Total</td>
                    <td className="text-center px-4 py-3 font-bold text-lg">
                      {transferencia.productos?.reduce((sum, p) => sum + p.cantidad, 0) || 0}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
        
        {/* Panel lateral - 1 columna */}
        <div className="space-y-6">
          {/* Información general */}
          <Card title="Información General" icon={<FaFileAlt />}>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Sucursal Origen</p>
                <p className="font-medium flex items-center">
                  <FaStore className="mr-2 text-gray-400" />
                  {transferencia.sucursal_origen?.nombre}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Sucursal Destino</p>
                <p className="font-medium flex items-center">
                  <FaStore className="mr-2 text-gray-400" />
                  {transferencia.sucursal_destino?.nombre}
                </p>
              </div>
              
              <div className="pt-3 border-t">
                <p className="text-sm text-gray-500">Fecha de Solicitud</p>
                <p className="font-medium flex items-center">
                  <FaCalendarAlt className="mr-2 text-gray-400" />
                  {new Date(transferencia.fecha_solicitud).toLocaleString()}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Solicitado por</p>
                <p className="font-medium flex items-center">
                  <FaUser className="mr-2 text-gray-400" />
                  {transferencia.usuario_solicita_nombre || 'Usuario'}
                </p>
              </div>
              
              {transferencia.usuario_aprueba_nombre && transferencia.estado !== 'pendiente' && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-500">
                    {transferencia.estado === 'aprobada' ? 'Aprobado' : 'Rechazado'} por
                  </p>
                  <p className="font-medium flex items-center">
                    <FaUser className="mr-2 text-gray-400" />
                    {transferencia.usuario_aprueba_nombre}
                  </p>
                </div>
              )}
            </div>
          </Card>
          
          {/* Motivo */}
          <Card title="Motivo de la Transferencia">
            <p className="text-gray-700">
              {transferencia.motivo || 'No se especificó un motivo'}
            </p>
          </Card>
          
          {/* Resumen */}
          <Card title="Resumen">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total de productos:</span>
                <span className="font-medium">{transferencia.productos?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total de unidades:</span>
                <span className="font-medium">
                  {transferencia.productos?.reduce((sum, p) => sum + p.cantidad, 0) || 0}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DetalleTransferencia;