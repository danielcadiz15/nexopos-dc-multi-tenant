/**
 * Página de gestión de transferencias entre sucursales
 * 
 * Muestra el listado de transferencias, permite crear nuevas,
 * aprobar/rechazar pendientes y ver el historial completo.
 * 
 * @module pages/stock/Transferencias
 * @requires react, react-router-dom, ../../services/transferencias.service
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Servicios
import transferenciasService from '../../services/transferencias.service';
import stockSucursalService from '../../services/stock-sucursal.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaExchangeAlt, FaPlus, FaCheck, FaTimes, FaEye,
  FaStore, FaUser, FaCalendarAlt, FaBoxOpen,
  FaClock, FaCheckCircle, FaTimesCircle, FaExclamationTriangle,
  FaSyncAlt, FaFilter, FaHistory
} from 'react-icons/fa';

/**
 * Modal para aprobar/rechazar transferencias
 */
const AprobacionModal = ({ isOpen, onClose, transferencia, onAprobar, onRechazar }) => {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const { currentUser } = useAuth();

  const handleAprobar = async () => {
    setProcesando(true);
    try {
      await onAprobar(transferencia.id, currentUser?.id);
      onClose();
    } catch (error) {
      console.error('Error al aprobar:', error);
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) {
      toast.error('Debes especificar un motivo para rechazar');
      return;
    }
    
    setProcesando(true);
    try {
      await onRechazar(transferencia.id, motivoRechazo, currentUser?.id);
      onClose();
    } catch (error) {
      console.error('Error al rechazar:', error);
    } finally {
      setProcesando(false);
    }
  };

  if (!isOpen || !transferencia) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium mb-4">Revisar Transferencia</h3>
        
        {/* Información de la transferencia */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Origen:</span>
              <span className="font-medium ml-2">{transferencia.sucursal_origen?.nombre}</span>
            </div>
            <div>
              <span className="text-gray-600">Destino:</span>
              <span className="font-medium ml-2">{transferencia.sucursal_destino?.nombre}</span>
            </div>
            <div>
              <span className="text-gray-600">Solicitado por:</span>
              <span className="font-medium ml-2">{transferencia.usuario_solicita_nombre}</span>
            </div>
            <div>
              <span className="text-gray-600">Fecha:</span>
              <span className="font-medium ml-2">
                {new Date(transferencia.fecha_solicitud).toLocaleString(                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FaStore className="mx-auto text-3xl mb-2" />
                  <p>Selecciona una sucursal de origen para ver los productos disponibles</p>
                </div>
              )}
            </Card>
          </div>
        </div>
        
        {/* Botones de acción */}
        <div className="flex justify-end space-x-2 mt-6">
          <Button
            type="button"
            color="secondary"
            onClick={() => navigate('/stock/transferencias')}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            color="primary"
            loading={guardando}
            disabled={guardando || formData.productos.length === 0}
            icon={<FaSave />}
          >
            Crear Transferencia
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TransferenciaForm;
              </span>
            </div>
          </div>
          
          {transferencia.motivo && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-gray-600">Motivo:</span>
              <p className="text-sm mt-1">{transferencia.motivo}</p>
            </div>
          )}
        </div>

        {/* Productos */}
        <div className="mb-4">
          <h4 className="font-medium mb-2">Productos a transferir:</h4>
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">Producto</th>
                  <th className="text-center px-4 py-2">Cantidad</th>
                  <th className="text-center px-4 py-2">Stock Origen</th>
                  <th className="text-center px-4 py-2">Stock Destino</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transferencia.productos?.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2">
                      <div>
                        <div className="font-medium">{item.producto?.nombre}</div>
                        <div className="text-xs text-gray-500">{item.producto?.codigo}</div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-2 font-medium">{item.cantidad}</td>
                    <td className="text-center px-4 py-2">{item.stock_origen || 0}</td>
                    <td className="text-center px-4 py-2">{item.stock_destino || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Campo para motivo de rechazo */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo de rechazo (opcional si apruebas)
          </label>
          <textarea
            value={motivoRechazo}
            onChange={(e) => setMotivoRechazo(e.target.value)}
            rows={3}
            className="w-full border-gray-300 rounded-md"
            placeholder="Especifica el motivo si rechazas la transferencia..."
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-2">
          <Button
            color="secondary"
            onClick={onClose}
            disabled={procesando}
          >
            Cancelar
          </Button>
          
          <Button
            color="danger"
            onClick={handleRechazar}
            disabled={procesando || !motivoRechazo.trim()}
            loading={procesando}
            icon={<FaTimes />}
          >
            Rechazar
          </Button>
          
          <Button
            color="success"
            onClick={handleAprobar}
            disabled={procesando}
            loading={procesando}
            icon={<FaCheck />}
          >
            Aprobar
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente principal de Transferencias
 */
const Transferencias = () => {
  const navigate = useNavigate();
  const { currentUser, sucursalSeleccionada, sucursalesDisponibles, permisos } = useAuth();
  
  // Estados
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState(''); // '', 'pendiente', 'aprobada', 'rechazada'
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [transferenciaSeleccionada, setTransferenciaSeleccionada] = useState(null);
  const [showAprobacionModal, setShowAprobacionModal] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0
  });

  // Verificar si el usuario puede aprobar transferencias
  const puedeAprobar = permisos?.includes('aprobar_transferencias') || 
                       permisos?.includes('admin') ||
                       currentUser?.rol === 'administrador';

  useEffect(() => {
    cargarTransferencias();
  }, [filtroEstado, filtroSucursal]);

  /**
   * Carga las transferencias
   */
  const cargarTransferencias = async () => {
    try {
      setLoading(true);
      
      const filtros = {};
      if (filtroEstado) filtros.estado = filtroEstado;
      if (filtroSucursal) filtros.sucursal_id = filtroSucursal;
      
      const data = await transferenciasService.obtenerTodas(filtros);
      setTransferencias(data);
      
      // Calcular estadísticas
      const stats = {
        total: data.length,
        pendientes: data.filter(t => t.estado === 'pendiente').length,
        aprobadas: data.filter(t => t.estado === 'aprobada').length,
        rechazadas: data.filter(t => t.estado === 'rechazada').length
      };
      setEstadisticas(stats);
      
    } catch (error) {
      console.error('Error al cargar transferencias:', error);
      toast.error('Error al cargar las transferencias');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Aprobar transferencia
   */
  const aprobarTransferencia = async (transferenciaId, usuarioId) => {
    try {
      await transferenciasService.cambiarEstado(transferenciaId, 'aprobada', {
        usuario_aprueba_id: usuarioId
      });
      
      toast.success('Transferencia aprobada correctamente');
      cargarTransferencias();
      setShowAprobacionModal(false);
      
    } catch (error) {
      console.error('Error al aprobar transferencia:', error);
      toast.error('Error al aprobar la transferencia');
      throw error;
    }
  };

  /**
   * Rechazar transferencia
   */
  const rechazarTransferencia = async (transferenciaId, motivo, usuarioId) => {
    try {
      await transferenciasService.cambiarEstado(transferenciaId, 'rechazada', {
        motivo_rechazo: motivo,
        usuario_aprueba_id: usuarioId
      });
      
      toast.success('Transferencia rechazada');
      cargarTransferencias();
      setShowAprobacionModal(false);
      
    } catch (error) {
      console.error('Error al rechazar transferencia:', error);
      toast.error('Error al rechazar la transferencia');
      throw error;
    }
  };

  /**
   * Ver detalle de transferencia
   */
  const verDetalle = (transferencia) => {
    navigate(`/stock/transferencias/${transferencia.id}`);
  };

  /**
   * Obtiene el ícono del estado
   */
  const getIconoEstado = (estado) => {
    switch(estado) {
      case 'pendiente': return <FaClock className="text-yellow-500" />;
      case 'aprobada': return <FaCheckCircle className="text-green-500" />;
      case 'rechazada': return <FaTimesCircle className="text-red-500" />;
      default: return <FaExclamationTriangle className="text-gray-500" />;
    }
  };

  /**
   * Obtiene el color del estado
   */
  const getColorEstado = (estado) => {
    switch(estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'aprobada': return 'bg-green-100 text-green-800';
      case 'rechazada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Columnas de la tabla
   */
  const columns = [
    {
      header: 'Fecha',
      accessor: 'fecha_solicitud',
      cell: (row) => (
        <div className="flex items-center text-sm">
          <FaCalendarAlt className="mr-2 text-gray-400" />
          <div>
            <div>{new Date(row.fecha_solicitud).toLocaleDateString()}</div>
            <div className="text-xs text-gray-500">
              {new Date(row.fecha_solicitud).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: 'estado',
      cell: (row) => (
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getColorEstado(row.estado)}`}>
          {getIconoEstado(row.estado)}
          <span className="ml-2">{row.estado.charAt(0).toUpperCase() + row.estado.slice(1)}</span>
        </div>
      )
    },
    {
      header: 'Origen → Destino',
      accessor: 'sucursales',
      cell: (row) => (
        <div className="flex items-center">
          <div>
            <div className="text-sm font-medium">{row.sucursal_origen?.nombre}</div>
            <div className="text-xs text-gray-500">→ {row.sucursal_destino?.nombre}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Productos',
      accessor: 'productos',
      cell: (row) => (
        <div className="text-center">
          <div className="flex items-center justify-center">
            <FaBoxOpen className="mr-2 text-gray-400" />
            <span className="font-medium">{row.productos?.length || 0}</span>
          </div>
          <div className="text-xs text-gray-500">
            {row.productos?.reduce((sum, p) => sum + p.cantidad, 0) || 0} unidades
          </div>
        </div>
      )
    },
    {
      header: 'Solicitado por',
      accessor: 'usuario_solicita_nombre',
      cell: (row) => (
        <div className="flex items-center text-sm">
          <FaUser className="mr-2 text-gray-400" />
          <div>
            <div>{row.usuario_solicita_nombre || 'Usuario'}</div>
            {row.usuario_aprueba_nombre && row.estado !== 'pendiente' && (
              <div className="text-xs text-gray-500">
                {row.estado === 'aprobada' ? 'Aprobado' : 'Rechazado'} por: {row.usuario_aprueba_nombre}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Motivo',
      accessor: 'motivo',
      cell: (row) => (
        <div className="text-sm">
          {row.motivo && (
            <div className="text-gray-700">{row.motivo}</div>
          )}
          {row.motivo_rechazo && row.estado === 'rechazada' && (
            <div className="text-red-600 text-xs mt-1">
              Rechazo: {row.motivo_rechazo}
            </div>
          )}
          {!row.motivo && !row.motivo_rechazo && (
            <span className="text-gray-400">-</span>
          )}
        </div>
      )
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => verDetalle(row)}
            className="text-blue-600 hover:text-blue-800"
            title="Ver detalles"
          >
            <FaEye />
          </button>
          
          {row.estado === 'pendiente' && puedeAprobar && (
            <button
              onClick={() => {
                setTransferenciaSeleccionada(row);
                setShowAprobacionModal(true);
              }}
              className="text-green-600 hover:text-green-800"
              title="Aprobar/Rechazar"
            >
              <FaCheck />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Transferencias entre Sucursales
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona las transferencias de productos entre sucursales
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            color="secondary"
            onClick={() => navigate('/stock/movimientos')}
            icon={<FaHistory />}
          >
            Ver Historial
          </Button>
          
          <Button
            color="primary"
            onClick={() => navigate('/stock/transferencias/nueva')}
            icon={<FaPlus />}
          >
            Nueva Transferencia
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-50">
          <div className="text-center">
            <h3 className="text-gray-600 text-sm">Total</h3>
            <p className="text-2xl font-bold text-gray-800">{estadisticas.total}</p>
          </div>
        </Card>
        
        <Card className="bg-yellow-50">
          <div className="text-center">
            <h3 className="text-yellow-600 text-sm">Pendientes</h3>
            <p className="text-2xl font-bold text-yellow-700">{estadisticas.pendientes}</p>
          </div>
        </Card>
        
        <Card className="bg-green-50">
          <div className="text-center">
            <h3 className="text-green-600 text-sm">Aprobadas</h3>
            <p className="text-2xl font-bold text-green-700">{estadisticas.aprobadas}</p>
          </div>
        </Card>
        
        <Card className="bg-red-50">
          <div className="text-center">
            <h3 className="text-red-600 text-sm">Rechazadas</h3>
            <p className="text-2xl font-bold text-red-700">{estadisticas.rechazadas}</p>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaFilter className="text-gray-500" />
            <span className="font-medium">Filtros:</span>
          </div>
          
          <div className="flex space-x-4">
            {/* Filtro por estado */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Estado:</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="border-gray-300 rounded-md text-sm"
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendientes</option>
                <option value="aprobada">Aprobadas</option>
                <option value="rechazada">Rechazadas</option>
              </select>
            </div>
            
            {/* Filtro por sucursal */}
            {sucursalesDisponibles.length > 1 && (
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Sucursal:</label>
                <select
                  value={filtroSucursal}
                  onChange={(e) => setFiltroSucursal(e.target.value)}
                  className="border-gray-300 rounded-md text-sm"
                >
                  <option value="">Todas</option>
                  {sucursalesDisponibles.map(suc => (
                    <option key={suc.id} value={suc.id}>{suc.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            
            <Button
              size="sm"
              color="secondary"
              onClick={cargarTransferencias}
              icon={<FaSyncAlt />}
            >
              Actualizar
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {transferencias.length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FaExchangeAlt className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay transferencias
                </h3>
                <p className="text-gray-500 mb-4">
                  {filtroEstado || filtroSucursal
                    ? 'No se encontraron transferencias con los filtros seleccionados'
                    : 'Comienza creando una nueva transferencia entre sucursales'}
                </p>
                
                <Button
                  color="primary"
                  onClick={() => navigate('/stock/transferencias/nueva')}
                  icon={<FaPlus />}
                >
                  Nueva Transferencia
                </Button>
              </div>
            ) : (
              <Table
                columns={columns}
                data={transferencias}
                pagination={true}
                itemsPerPage={10}
              />
            )}
          </>
        )}
      </Card>

      {/* Modal de aprobación */}
      <AprobacionModal
        isOpen={showAprobacionModal}
        onClose={() => {
          setShowAprobacionModal(false);
          setTransferenciaSeleccionada(null);
        }}
        transferencia={transferenciaSeleccionada}
        onAprobar={aprobarTransferencia}
        onRechazar={rechazarTransferencia}
      />
    </div>
  );
};

export default Transferencias;