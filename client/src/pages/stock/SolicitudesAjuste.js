/**
 * Página de gestión de solicitudes de ajuste de inventario
 * 
 * Permite a los administradores ver, autorizar o rechazar solicitudes
 * de ajuste de stock realizadas por usuarios no administradores.
 * 
 * @module pages/stock/SolicitudesAjuste
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Servicios
import controlStockService from '../../services/control-stock.service';
import usuariosService from '../../services/usuarios.service';
import productosService from '../../services/productos.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaCheck, FaTimes, FaEye, FaHistory, FaArrowLeft, 
  FaExclamationTriangle, FaClock, FaUser, FaStore, FaBox
} from 'react-icons/fa';

const SolicitudesAjuste = () => {
  const navigate = useNavigate();
  const { currentUser, sucursalSeleccionada, hasPermission } = useAuth();
  
  // Estados
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState({});
  const [productos, setProductos] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [accion, setAccion] = useState(''); // 'autorizar' o 'rechazar'
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesando, setProcesando] = useState(false);

  // Verificar permisos
  const puedeGestionarSolicitudes = hasPermission('stock', 'editar') || 
                                   hasPermission('stock', 'crear') ||
                                   currentUser?.rol === 'Administrador' ||
                                   currentUser?.rol === 'admin';

  useEffect(() => {
    if (puedeGestionarSolicitudes) {
      cargarSolicitudes();
    }
  }, [puedeGestionarSolicitudes]);

  /**
   * Carga todas las solicitudes de ajuste
   */
  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando solicitudes de ajuste...');
      
      // Obtener solicitudes pendientes
      const solicitudesPendientes = await controlStockService.obtenerSolicitudesPendientes();
      console.log('📋 Solicitudes encontradas:', solicitudesPendientes);
      
      setSolicitudes(solicitudesPendientes);
      
      // Cargar información de usuarios y productos
      await cargarInformacionAdicional(solicitudesPendientes);
      
    } catch (error) {
      console.error('❌ Error al cargar solicitudes:', error);
      toast.error('Error al cargar las solicitudes de ajuste');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carga información adicional de usuarios y productos
   */
  const cargarInformacionAdicional = async (solicitudesData) => {
    try {
      const usuariosIds = [...new Set(solicitudesData.map(s => s.usuario_id))];
      const productosIds = [...new Set(solicitudesData.flatMap(s => s.ajustes?.map(a => a.producto_id) || []))];
      
      // Cargar usuarios
      const usuariosData = {};
      for (const userId of usuariosIds) {
        try {
          const usuario = await usuariosService.obtenerPorId(userId);
          usuariosData[userId] = usuario;
        } catch (error) {
          console.warn(`No se pudo cargar usuario ${userId}:`, error);
          usuariosData[userId] = { nombre: 'Usuario desconocido', email: 'N/A' };
        }
      }
      setUsuarios(usuariosData);
      
      // Cargar productos
      const productosData = {};
      for (const productoId of productosIds) {
        try {
          const producto = await productosService.obtenerPorId(productoId);
          productosData[productoId] = producto;
        } catch (error) {
          console.warn(`No se pudo cargar producto ${productoId}:`, error);
          productosData[productoId] = { nombre: 'Producto desconocido', codigo: 'N/A' };
        }
      }
      setProductos(productosData);
      
    } catch (error) {
      console.error('❌ Error al cargar información adicional:', error);
    }
  };

  /**
   * Prepara la autorización de una solicitud
   */
  const prepararAutorizacion = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setAccion('autorizar');
    setShowConfirmDialog(true);
  };

  /**
   * Prepara el rechazo de una solicitud
   */
  const prepararRechazo = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setAccion('rechazar');
    setMotivoRechazo('');
    setShowConfirmDialog(true);
  };

  /**
   * Procesa la acción (autorizar o rechazar)
   */
  const procesarAccion = async () => {
    if (!solicitudSeleccionada) return;
    
    try {
      setProcesando(true);
      
      if (accion === 'autorizar') {
        await controlStockService.autorizarSolicitud(solicitudSeleccionada.id, currentUser.id);
        toast.success('✅ Solicitud autorizada correctamente');
      } else if (accion === 'rechazar') {
        if (!motivoRechazo.trim()) {
          toast.error('Debe especificar un motivo para el rechazo');
          return;
        }
        await controlStockService.rechazarSolicitud(solicitudSeleccionada.id, currentUser.id, motivoRechazo);
        toast.success('❌ Solicitud rechazada correctamente');
      }
      
      // Recargar solicitudes
      await cargarSolicitudes();
      setShowConfirmDialog(false);
      
    } catch (error) {
      console.error(`❌ Error al ${accion} solicitud:`, error);
      toast.error(`Error al ${accion} la solicitud`);
    } finally {
      setProcesando(false);
    }
  };

  /**
   * Obtiene el estado visual de una solicitud
   */
  const getEstadoVisual = (estado) => {
    switch (estado) {
      case 'pendiente_autorizacion':
        return {
          icon: <FaClock className="text-yellow-500" />,
          text: 'Pendiente de Autorización',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200'
        };
      case 'autorizada':
        return {
          icon: <FaCheck className="text-green-500" />,
          text: 'Autorizada',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200'
        };
      case 'rechazada':
        return {
          icon: <FaTimes className="text-red-500" />,
          text: 'Rechazada',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: <FaExclamationTriangle className="text-gray-500" />,
          text: estado || 'Desconocido',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200'
        };
    }
  };

  /**
   * Formatea la fecha
   */
  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Si no tiene permisos, mostrar mensaje
  if (!puedeGestionarSolicitudes) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaExclamationTriangle className="text-6xl text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600 mb-4">
            No tienes permisos para gestionar solicitudes de ajuste de stock
          </p>
          <Button
            color="secondary"
            onClick={() => navigate('/stock')}
            icon={<FaArrowLeft />}
          >
            Volver al Stock
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <FaHistory className="mr-3 text-blue-600" />
            Solicitudes de Ajuste de Inventario
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {sucursalSeleccionada?.nombre ? `Sucursal: ${sucursalSeleccionada.nombre}` : 'Todas las sucursales'}
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            color="secondary"
            onClick={() => navigate('/stock')}
            icon={<FaArrowLeft />}
          >
            Volver al Stock
          </Button>
          
          <Button
            color="primary"
            onClick={cargarSolicitudes}
            disabled={loading}
            icon={<FaEye />}
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-blue-800 font-medium">Total Solicitudes</h3>
              <p className="text-2xl font-bold text-blue-900">
                {solicitudes.length}
              </p>
            </div>
            <FaHistory className="text-4xl text-blue-300" />
          </div>
        </Card>
        
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-yellow-800 font-medium">Pendientes</h3>
              <p className="text-2xl font-bold text-yellow-900">
                {solicitudes.filter(s => s.estado === 'pendiente_autorizacion').length}
              </p>
            </div>
            <FaClock className="text-4xl text-yellow-300" />
          </div>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-green-800 font-medium">Autorizadas</h3>
              <p className="text-2xl font-bold text-green-900">
                {solicitudes.filter(s => s.estado === 'autorizada').length}
              </p>
            </div>
            <FaCheck className="text-4xl text-green-300" />
          </div>
        </Card>
        
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-800 font-medium">Rechazadas</h3>
              <p className="text-2xl font-bold text-red-900">
                {solicitudes.filter(s => s.estado === 'rechazada').length}
              </p>
            </div>
            <FaTimes className="text-4xl text-red-300" />
          </div>
        </Card>
      </div>

      {/* Lista de Solicitudes */}
      <Card>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
            <span className="ml-3 text-gray-600">Cargando solicitudes...</span>
          </div>
        ) : solicitudes.length === 0 ? (
          <div className="text-center py-12">
            <FaCheck className="text-6xl text-green-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No hay solicitudes pendientes
            </h3>
            <p className="text-gray-500">
              Todas las solicitudes de ajuste han sido procesadas
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {solicitudes.map((solicitud) => {
              const estadoVisual = getEstadoVisual(solicitud.estado);
              const usuario = usuarios[solicitud.usuario_id] || {};
              const totalAjustes = solicitud.ajustes?.length || 0;
              const valorTotal = solicitud.ajustes?.reduce((total, ajuste) => {
                const producto = productos[ajuste.producto_id];
                const precio = producto?.precio_costo || 0;
                return total + (Math.abs(ajuste.cantidad_ajuste) * precio);
              }, 0) || 0;
              
              return (
                <div 
                  key={solicitud.id} 
                  className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${estadoVisual.borderColor}`}
                >
                  {/* Header de la solicitud */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${estadoVisual.bgColor} ${estadoVisual.textColor}`}>
                          {estadoVisual.icon}
                          <span className="ml-2">{estadoVisual.text}</span>
                        </span>
                        
                        <span className="text-sm text-gray-500">
                          ID: {solicitud.id}
                        </span>
                        
                        {solicitud.control_id && (
                          <span className="text-sm text-blue-600">
                            Control: {solicitud.control_id}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <FaUser className="text-gray-400" />
                          <span className="text-gray-600">
                            {usuario.nombre || 'Usuario desconocido'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <FaStore className="text-gray-400" />
                          <span className="text-gray-600">
                            Sucursal: {solicitud.sucursal_id}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <FaClock className="text-gray-400" />
                          <span className="text-gray-600">
                            {formatearFecha(solicitud.fecha_solicitud)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Botones de acción */}
                    {solicitud.estado === 'pendiente_autorizacion' && (
                      <div className="flex space-x-2">
                        <Button
                          color="primary"
                          size="sm"
                          onClick={() => prepararAutorizacion(solicitud)}
                          icon={<FaCheck />}
                        >
                          Autorizar
                        </Button>
                        
                        <Button
                          color="danger"
                          size="sm"
                          onClick={() => prepararRechazo(solicitud)}
                          icon={<FaTimes />}
                        >
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Detalles de los ajustes */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-900 flex items-center">
                        <FaBox className="mr-2 text-gray-400" />
                        Ajustes Solicitados ({totalAjustes})
                      </h4>
                      
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Valor Total Estimado</p>
                        <p className="text-lg font-bold text-gray-900">
                          ${valorTotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {solicitud.ajustes?.map((ajuste, index) => {
                        const producto = productos[ajuste.producto_id] || {};
                        const precio = producto.precio_costo || 0;
                        const valorAjuste = Math.abs(ajuste.cantidad_ajuste) * precio;
                        
                        return (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {producto.nombre || 'Producto desconocido'}
                              </p>
                              <p className="text-sm text-gray-600">
                                Código: {producto.codigo || 'N/A'}
                              </p>
                            </div>
                            
                            <div className="text-right">
                              <p className={`font-bold ${
                                ajuste.cantidad_ajuste > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {ajuste.cantidad_ajuste > 0 ? '+' : ''}{ajuste.cantidad_ajuste}
                              </p>
                              <p className="text-sm text-gray-600">
                                ${valorAjuste.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Observaciones */}
                    {solicitud.observaciones && (
                      <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>Observaciones:</strong> {solicitud.observaciones}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal de Confirmación */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={accion === 'autorizar' ? 'Autorizar Solicitud' : 'Rechazar Solicitud'}
        message={
          <div className="space-y-4">
            {accion === 'autorizar' ? (
              <>
                <p>¿Estás seguro de autorizar esta solicitud de ajuste?</p>
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    <strong>Usuario:</strong> {usuarios[solicitudSeleccionada?.usuario_id]?.nombre || 'N/A'}<br/>
                    <strong>Total de ajustes:</strong> {solicitudSeleccionada?.ajustes?.length || 0}<br/>
                    <strong>Fecha:</strong> {formatearFecha(solicitudSeleccionada?.fecha_solicitud)}
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  Al autorizar, los ajustes se aplicarán automáticamente al inventario.
                </p>
              </>
            ) : (
              <>
                <p>¿Estás seguro de rechazar esta solicitud de ajuste?</p>
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800">
                    <strong>Usuario:</strong> {usuarios[solicitudSeleccionada?.usuario_id]?.nombre || 'N/A'}<br/>
                    <strong>Total de ajustes:</strong> {solicitudSeleccionada?.ajustes?.length || 0}<br/>
                    <strong>Fecha:</strong> {formatearFecha(solicitudSeleccionada?.fecha_solicitud)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo del rechazo *
                  </label>
                  <textarea
                    value={motivoRechazo}
                    onChange={(e) => setMotivoRechazo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows="3"
                    placeholder="Especifique el motivo del rechazo..."
                    required
                  />
                </div>
              </>
            )}
          </div>
        }
        confirmText={accion === 'autorizar' ? 'Autorizar' : 'Rechazar'}
        cancelText="Cancelar"
        onConfirm={procesarAccion}
        onCancel={() => setShowConfirmDialog(false)}
        confirmColor={accion === 'autorizar' ? 'primary' : 'danger'}
        loading={procesando}
      />
    </div>
  );
};

export default SolicitudesAjuste; 