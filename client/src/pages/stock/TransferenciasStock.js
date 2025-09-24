// src/pages/stock/TransferenciasStock.js - CORRECCIÓN DE PERMISOS ADMINISTRADOR

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

// Servicios
import transferenciasService from '../../services/transferencias.service';
import stockSucursalService from '../../services/stock-sucursal.service';
import sucursalesService from '../../services/sucursales.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaExchangeAlt, FaPlus, FaEye, FaCheck, FaTimes,
  FaStore, FaArrowRight, FaClock, FaCheckCircle,
  FaTimesCircle, FaArrowLeft, FaFilter, FaUserShield
} from 'react-icons/fa';

/**
 * Componente para gestión de transferencias entre sucursales
 */
const TransferenciasStock = () => {
  const navigate = useNavigate();
  const { currentUser, sucursalSeleccionada, sucursalesDisponibles } = useAuth();
  
  // Estado
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transferenciaSeleccionada, setTransferenciaSeleccionada] = useState(null);
  const [accion, setAccion] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesando, setProcesando] = useState(false);
  
  // DEPURACIÓN: Verificar datos del usuario
  useEffect(() => {
    console.group('🔍 DEPURACIÓN: Estado del usuario en TransferenciasStock');
    console.log('currentUser:', currentUser);
    console.log('currentUser.rol:', currentUser?.rol);
    console.log('currentUser.rolId:', currentUser?.rolId);
    console.log('currentUser.email:', currentUser?.email);
    console.log('currentUser.customClaims:', currentUser?.customClaims);
    console.log('¿Es administrador?:', esAdministrador());
    console.log('sucursalSeleccionada:', sucursalSeleccionada);
    console.groupEnd();
  }, [currentUser, sucursalSeleccionada]);
  
  // Cargar transferencias al montar
  useEffect(() => {
    cargarTransferencias();
  }, [filtroEstado]);
  
  /**
   * Verifica si el usuario actual es administrador
   */
  const esAdministrador = () => {
    if (!currentUser) {
      console.log('❌ No hay usuario actual');
      return false;
    }
    
    // Verificar múltiples formas de identificar administrador
    const esAdmin = 
      currentUser.rol === 'Administrador' || 
      currentUser.rol === 'Admin' ||
      currentUser.rolId === '1' ||
      currentUser.customClaims?.rol === 'Administrador' ||
      currentUser.customClaims?.rol === 'Admin' ||
      currentUser.email === 'danielcadiz15@gmail.com'; // Usuario específico administrador
    
    console.log(`🔍 Verificación de administrador:`, {
      rol: currentUser.rol,
      rolId: currentUser.rolId,
      customClaimsRol: currentUser.customClaims?.rol,
      email: currentUser.email,
      esAdmin
    });
    
    return esAdmin;
  };
  
  /**
   * Carga las transferencias según el filtro
   */
  const cargarTransferencias = async () => {
    try {
      setLoading(true);
      
      let data;
      if (esAdministrador()) {
        console.log('👑 Cargando transferencias como administrador');
        // Admin ve todas las transferencias
        data = await transferenciasService.obtenerTodas(
          filtroEstado ? { estado: filtroEstado } : {}
        );
      } else if (sucursalSeleccionada) {
        console.log(`🏪 Cargando transferencias de sucursal: ${sucursalSeleccionada.id}`);
        // Usuario normal solo ve las de su sucursal
        data = await transferenciasService.obtenerPorSucursal(sucursalSeleccionada.id);
        
        // Filtrar por estado si aplica
        if (filtroEstado) {
          data = data.filter(t => t.estado === filtroEstado);
        }
      } else {
        console.log('❌ Usuario sin sucursal seleccionada');
        data = [];
      }
      
      console.log(`✅ Transferencias cargadas: ${data?.length || 0}`);
      console.log('📊 Datos de transferencias:', data);
      
      // Verificar si hay transferencias pendientes
      const pendientes = data?.filter(t => t.estado === 'pendiente') || [];
      console.log(`⏳ Transferencias pendientes: ${pendientes.length}`);
      
      setTransferencias(data || []);
    } catch (error) {
      console.error('Error al cargar transferencias:', error);
      toast.error('Error al cargar las transferencias');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Navega a crear nueva transferencia
   */
  const nuevaTransferencia = () => {
    navigate('/stock/transferencias/nueva');
  };
  
  /**
   * Ver detalle de transferencia
   */
  const verDetalle = (transferencia) => {
    navigate(`/stock/transferencias/${transferencia.id}`, {
      state: { transferencia }
    });
  };
  
  /**
   * Prepara aprobación de transferencia
   */
  const prepararAprobacion = (transferencia) => {
    console.log('🔄 Preparando aprobación de transferencia:', transferencia.id);
    setTransferenciaSeleccionada(transferencia);
    setAccion('aprobar');
    setMotivoRechazo('');
    setShowConfirmDialog(true);
  };
  
  /**
   * Prepara rechazo de transferencia
   */
  const prepararRechazo = (transferencia) => {
    console.log('🔄 Preparando rechazo de transferencia:', transferencia.id);
    setTransferenciaSeleccionada(transferencia);
    setAccion('rechazar');
    setMotivoRechazo('');
    setShowConfirmDialog(true);
  };
  
  /**
   * Procesa aprobación o rechazo
   */
  const procesarTransferencia = async () => {
    if (accion === 'rechazar' && !motivoRechazo.trim()) {
      toast.warning('Debe indicar un motivo para rechazar');
      return;
    }
    
    setProcesando(true);
    
    try {
      await transferenciasService.cambiarEstado(
        transferenciaSeleccionada.id,
        accion === 'aprobar' ? 'aprobada' : 'rechazada',
        {
          usuario_aprueba_id: currentUser.id,
          ...(accion === 'rechazar' && { motivo_rechazo: motivoRechazo })
        }
      );
      
      toast.success(
        accion === 'aprobar' 
          ? 'Transferencia aprobada y ejecutada correctamente'
          : 'Transferencia rechazada'
      );
      
      setShowConfirmDialog(false);
      cargarTransferencias();
    } catch (error) {
      console.error('Error al procesar transferencia:', error);
      toast.error('Error al procesar la transferencia');
    } finally {
      setProcesando(false);
    }
  };
  
  /**
   * Obtiene icono según estado
   */
  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'pendiente':
        return <FaClock className="text-yellow-500" />;
      case 'aprobada':
        return <FaCheckCircle className="text-green-500" />;
      case 'rechazada':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return null;
    }
  };
  
  /**
   * Obtiene color según estado
   */
  const getEstadoClass = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'aprobada':
        return 'bg-green-100 text-green-800';
      case 'rechazada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        <div className="text-sm">
          <div>{new Date(row.fecha_solicitud).toLocaleDateString()}</div>
          <div className="text-gray-500">
            {new Date(row.fecha_solicitud).toLocaleTimeString()}
          </div>
        </div>
      )
    },
    {
      header: 'Origen → Destino',
      accessor: 'sucursales',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <div className="text-sm">
            <div className="font-medium">{row.sucursal_origen?.nombre || 'N/A'}</div>
          </div>
          <FaArrowRight className="text-gray-400" />
          <div className="text-sm">
            <div className="font-medium">{row.sucursal_destino?.nombre || 'N/A'}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Productos',
      accessor: 'productos',
      cell: (row) => (
        <div className="text-sm">
          <span className="font-medium">{row.productos?.length || 0}</span> productos
        </div>
      )
    },
    {
      header: 'Solicitado por',
      accessor: 'usuario_solicita_id',
      cell: (row) => (
        <div className="text-sm text-gray-600">
          {row.usuario_solicita_nombre || row.usuario_solicita_id}
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: 'estado',
      cell: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoClass(row.estado)}`}>
          {getEstadoIcon(row.estado)}
          <span className="ml-1">
            {row.estado.charAt(0).toUpperCase() + row.estado.slice(1)}
          </span>
        </span>
      )
    },
    {
      header: 'Acciones',
      cell: (row) => {
        const mostrarBotonesAdmin = esAdministrador() && row.estado === 'pendiente';
        
        console.log(`🔍 Botones para transferencia ${row.id}:`, {
          esAdmin: esAdministrador(),
          estado: row.estado,
          mostrarBotones: mostrarBotonesAdmin
        });
        
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => verDetalle(row)}
              className="text-blue-600 hover:text-blue-800"
              title="Ver detalle"
            >
              <FaEye />
            </button>
            
            {mostrarBotonesAdmin && (
              <>
                <button
                  onClick={() => prepararAprobacion(row)}
                  className="text-green-600 hover:text-green-800"
                  title="Aprobar transferencia"
                >
                  <FaCheck />
                </button>
                
                <button
                  onClick={() => prepararRechazo(row)}
                  className="text-red-600 hover:text-red-800"
                  title="Rechazar transferencia"
                >
                  <FaTimes />
                </button>
              </>
            )}
          </div>
        );
      }
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Transferencias entre Sucursales
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Gestiona el movimiento de productos entre sucursales
          </p>
          
          {/* DEPURACIÓN: Mostrar información del usuario */}
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
            <strong>🔍 DEBUG TRANSFERENCIAS:</strong><br/>
            Usuario: {currentUser?.email}<br/>
            Rol: {currentUser?.rol}<br/>
            Rol ID: {currentUser?.rolId}<br/>
            Custom Claims Rol: {currentUser?.customClaims?.rol}<br/>
            ¿Es Admin?: {esAdministrador() ? '✅ SÍ' : '❌ NO'}<br/>
            ¿Tiene Sucursal?: {sucursalSeleccionada ? '✅ SÍ' : '❌ NO'}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            color="secondary"
            onClick={() => navigate('/stock')}
            icon={<FaArrowLeft />}
          >
            Volver
          </Button>
          
          {sucursalesDisponibles.length > 1 && (
            <Button
              color="primary"
              onClick={nuevaTransferencia}
              icon={<FaPlus />}
            >
              Nueva Transferencia
            </Button>
          )}
        </div>
      </div>
      
      {/* Indicador de permisos */}
      {esAdministrador() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center">
            <FaUserShield className="text-blue-600 mr-2" />
            <span className="text-blue-800 font-medium">
              Modo Administrador - Puede aprobar/rechazar transferencias
            </span>
          </div>
        </div>
      )}
      
      {/* Filtros */}
      <Card>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            color={filtroEstado === '' ? 'primary' : 'secondary'}
            onClick={() => setFiltroEstado('')}
          >
            Todas
          </Button>
          
          <Button
            size="sm"
            color={filtroEstado === 'pendiente' ? 'warning' : 'secondary'}
            onClick={() => setFiltroEstado('pendiente')}
            icon={<FaClock />}
          >
            Pendientes
          </Button>
          
          <Button
            size="sm"
            color={filtroEstado === 'aprobada' ? 'success' : 'secondary'}
            onClick={() => setFiltroEstado('aprobada')}
            icon={<FaCheckCircle />}
          >
            Aprobadas
          </Button>
          
          <Button
            size="sm"
            color={filtroEstado === 'rechazada' ? 'danger' : 'secondary'}
            onClick={() => setFiltroEstado('rechazada')}
            icon={<FaTimesCircle />}
          >
            Rechazadas
          </Button>
        </div>
      </Card>
      
      {/* Tabla de transferencias */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {transferencias.length === 0 ? (
              <div className="text-center py-10">
                <FaExchangeAlt className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay transferencias
                </h3>
                <p className="text-gray-500">
                  {filtroEstado 
                    ? `No hay transferencias ${filtroEstado}s`
                    : 'Comienza creando una nueva transferencia'}
                </p>
                
                {!filtroEstado && sucursalesDisponibles.length > 1 && (
                  <div className="mt-4">
                    <Button
                      color="primary"
                      onClick={nuevaTransferencia}
                      icon={<FaPlus />}
                    >
                      Nueva Transferencia
                    </Button>
                  </div>
                )}
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
      
      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={accion === 'aprobar' ? 'Aprobar Transferencia' : 'Rechazar Transferencia'}
        message={
          accion === 'aprobar' ? (
            <div>
              <p>¿Estás seguro de aprobar esta transferencia?</p>
              <p className="text-sm text-gray-600 mt-2">
                Se moverán {transferenciaSeleccionada?.productos?.length || 0} productos
                de {transferenciaSeleccionada?.sucursal_origen?.nombre} a {transferenciaSeleccionada?.sucursal_destino?.nombre}
              </p>
            </div>
          ) : (
            <div>
              <p>¿Estás seguro de rechazar esta transferencia?</p>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo del rechazo:
                </label>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  rows={3}
                  placeholder="Ingrese el motivo..."
                  required
                />
              </div>
            </div>
          )
        }
        confirmText={accion === 'aprobar' ? 'Aprobar' : 'Rechazar'}
        cancelText="Cancelar"
        onConfirm={procesarTransferencia}
        onCancel={() => setShowConfirmDialog(false)}
        confirmColor={accion === 'aprobar' ? 'success' : 'danger'}
        loading={procesando}
      />
    </div>
  );
};

export default TransferenciasStock;