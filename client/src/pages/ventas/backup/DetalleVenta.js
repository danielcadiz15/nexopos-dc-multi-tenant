/**
 * Pagina de detalle de venta
 * 
 * Muestra toda la informacion de una venta especifica,
 * permite registrar pagos, cambiar estados y gestionar devoluciones.
 * 
 * @module pages/ventas/DetalleVenta
 * @requires react, react-router-dom, ../../services/ventas.service
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import ventasService from '../../services/ventas.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import RegistrarPagoDialog from '../../components/modules/ventas/RegistrarPagoDialog';
import TicketVenta from '../../components/modules/ventas/TicketVenta';

// Iconos
import { 
  FaArrowLeft, FaEdit, FaPrint, FaShoppingCart,
  FaCalendarAlt, FaUser, FaMapMarkerAlt, FaPhone,
  FaEnvelope, FaClock, FaCheckCircle, FaTimesCircle,
  FaUndo, FaExclamationTriangle, FaMoneyBillWave,
  FaFileAlt, FaPlus, FaMoneyBill, FaCreditCard, FaExchangeAlt
} from 'react-icons/fa';

/**
 * Componente de pagina para detalle de venta
 * @returns {JSX.Element} Componente DetalleVenta
 */
const DetalleVenta = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados principales
  const [venta, setVenta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [showTicket, setShowTicket] = useState(false);

  // Estados para dialogos
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [accion, setAccion] = useState('');
  const [showPagoDialog, setShowPagoDialog] = useState(false);
  
  // Estados para notas
  const [editandoNotas, setEditandoNotas] = useState(false);
  const [notasVenta, setNotasVenta] = useState('');
  
  // Estados para historial de pagos
  const [historialPagos, setHistorialPagos] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  
  /**
   * Carga inicial de la venta
   */
  useEffect(() => {
    cargarVenta();
  }, [id]);
  
  /**
   * Carga notas y pagos cuando cambia la venta
   */
  useEffect(() => {
    if (venta) {
      setNotasVenta(venta.notas || '');
      cargarHistorialPagos();
    }
  }, [venta?.id]);
  
  /**
   * Carga los datos de la venta
   */
  const cargarVenta = async () => {
    try {
      setLoading(true);
      const data = await ventasService.obtenerPorId(id);
      setVenta(data);
    } catch (error) {
      console.error('Error al cargar venta:', error);
      toast.error('Error al cargar los datos de la venta');
      navigate('/ventas');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Carga el historial de pagos
   */
  const cargarHistorialPagos = async () => {
    if (!venta?.id) return;
    
    try {
      setCargandoPagos(true);
      const pagos = await ventasService.obtenerHistorialPagos(venta.id);
      setHistorialPagos(pagos);
    } catch (error) {
      console.error('Error al cargar historial de pagos:', error);
    } finally {
      setCargandoPagos(false);
    }
  };
  
  /**
   * Guarda las notas de la venta
   */
  const guardarNotas = async () => {
    try {
      await ventasService.actualizarNotas(venta.id, notasVenta);
      setVenta({ ...venta, notas: notasVenta });
      setEditandoNotas(false);
      toast.success('Notas actualizadas correctamente');
    } catch (error) {
      console.error('Error al guardar notas:', error);
      toast.error('Error al guardar las notas');
    }
  };
  
  /**
   * Formatea un valor como moneda
   * @param {number} valor - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatMoneda = (valor) => {
    return `$${parseFloat(valor || 0).toFixed(2)}`;
  };
  
  /**
   * Prepara el cambio de estado
   * @param {string} nuevoEstado - Nuevo estado a aplicar
   */
  const prepararCambioEstado = (nuevoEstado) => {
    setAccion(nuevoEstado);
    setShowConfirmDialog(true);
  };
  
  /**
   * Confirma el cambio de estado
   */
  const confirmarCambioEstado = async () => {
    try {
      setProcesando(true);
      
      // Solicitar motivo si es cancelacion o devolucion
      let motivo = '';
      if (accion === 'cancelada' || accion === 'devuelta') {
        motivo = prompt(`Por favor, ingresa el motivo de la ${accion === 'cancelada' ? 'cancelacion' : 'devolucion'}:`);
        
        if (motivo === null) { // El usuario cancelo el prompt
          return;
        }
      }
      
      await ventasService.cambiarEstado(venta.id, accion, motivo);
      
      toast.success(`Venta ${accion === 'completada' ? 'completada' : accion === 'cancelada' ? 'cancelada' : 'devuelta'} correctamente`);
      
      // Recargar venta
      await cargarVenta();
      
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error(error.response?.data?.message || 'Error al cambiar el estado de la venta');
    } finally {
      setProcesando(false);
      setShowConfirmDialog(false);
      setAccion('');
    }
  };
  
  /**
   * Cancela el cambio de estado
   */
  const cancelarAccion = () => {
    setShowConfirmDialog(false);
    setAccion('');
  };
  
  /**
   * Registra un nuevo pago
   * @param {Object} pagoData - Datos del pago
   */
  const registrarPago = async (pagoData) => {
    try {
      await ventasService.registrarPago(venta.id, pagoData);
      await cargarVenta(); // Recargar la venta
      await cargarHistorialPagos(); // Recargar historial
      toast.success('Pago registrado correctamente');
    } catch (error) {
      console.error('Error al registrar pago:', error);
      toast.error(error.message || 'Error al registrar el pago');
      throw error;
    }
  };
  
  /**
	 * Imprime la venta
	 */
	const imprimirVenta = () => {
	  setShowTicket(true);
	};
  
  /**
   * Obtiene el icono segun el metodo de pago
   * @param {string} metodo - Metodo de pago
   * @returns {JSX.Element} Icono correspondiente
   */
  const getIconoMetodoPago = (metodo) => {
    switch(metodo) {
      case 'efectivo':
        return <FaMoneyBillWave className="mr-2 text-green-500" />;
      case 'tarjeta':
        return <FaCreditCard className="mr-2 text-blue-500" />;
      case 'transferencia':
        return <FaExchangeAlt className="mr-2 text-purple-500" />;
      case 'credito':
        return <FaCreditCard className="mr-2 text-orange-500" />;
      default:
        return <FaMoneyBillWave className="mr-2 text-gray-500" />;
    }
  };
  
  /**
   * Obtiene el color del estado
   * @param {string} estado - Estado de la venta
   * @returns {string} Clases CSS para el color
   */
  const getColorEstado = (estado) => {
    switch(estado) {
      case 'completada':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      case 'devuelta':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  
	const columnsProductos = [
	  {
		header: 'Codigo',
		accessor: 'producto_info.codigo',
		cell: (row) => row.producto_info?.codigo || 'N/A'
	  },
	  {
		header: 'Producto',
		accessor: 'producto_info.nombre',
		cell: (row) => row.producto_info?.nombre || row.nombre || 'Sin nombre'
	  },
	  {
		header: 'Cantidad',
		accessor: 'cantidad',
		cell: (row) => (
		  <span className="font-medium">{row.cantidad}</span>
		)
	  },
	  {
		header: 'Precio Unit.',
		accessor: 'precio_unitario',
		cell: (row) => formatMoneda(row.precio_unitario)
	  },
	  {
		header: 'Subtotal',
		accessor: 'precio_total',
		cell: (row) => (
		  <span className="font-medium">
			{formatMoneda(row.precio_total || (row.cantidad * row.precio_unitario))}
		  </span>
		)
	  }
	];
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!venta) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Venta no encontrada</p>
        <Link to="/ventas">
          <Button color="primary" className="mt-4">
            Volver a Ventas
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            color="secondary"
            onClick={() => navigate('/ventas')}
            icon={<FaArrowLeft />}
          >
            Volver
          </Button>
          
          <h1 className="text-2xl font-bold text-gray-800">
            Venta {venta.numero}
          </h1>
          
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getColorEstado(venta.estado)}`}>
            {venta.estado?.charAt(0).toUpperCase() + venta.estado?.slice(1)}
          </span>
        </div>
        
        <div className="flex space-x-2">
          <Button
            color="secondary"
            onClick={imprimirVenta}
            icon={<FaPrint />}
          >
            Imprimir
          </Button>
          
          {venta.estado === 'pendiente' && (
            <>
              <Button
                color="success"
                onClick={() => prepararCambioEstado('completada')}
                icon={<FaCheckCircle />}
                loading={procesando}
              >
                Completar
              </Button>
              
              <Button
                color="danger"
                onClick={() => prepararCambioEstado('cancelada')}
                icon={<FaTimesCircle />}
                loading={procesando}
              >
                Cancelar
              </Button>
            </>
          )}
          
          {venta.estado === 'completada' && (
            <Button
              color="warning"
              onClick={() => prepararCambioEstado('devuelta')}
              icon={<FaUndo />}
              loading={procesando}
            >
              Devolver
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel izquierdo - Informacion principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informacion de la venta */}
          <Card title="Informacion General" icon={<FaShoppingCart />}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Fecha</p>
                <p className="font-medium flex items-center">
                  <FaCalendarAlt className="mr-2 text-gray-400" />
                  {new Date(venta.fecha).toLocaleDateString()} {new Date(venta.fecha).toLocaleTimeString()}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Metodo de Pago</p>
                <p className="font-medium flex items-center">
                  {getIconoMetodoPago(venta.metodo_pago)}
                  {venta.metodo_pago?.charAt(0).toUpperCase() + venta.metodo_pago?.slice(1)}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Estado de Pago</p>
                <p className="font-medium">
                  {venta.estado_pago === 'pagado' ? (
                    <span className="text-green-600 flex items-center">
                      <FaCheckCircle className="mr-2" />
                      Pagado Completo
                    </span>
                  ) : venta.estado_pago === 'parcial' ? (
                    <span className="text-yellow-600 flex items-center">
                      <FaClock className="mr-2" />
                      Pago Parcial
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center">
                      <FaExclamationTriangle className="mr-2" />
                      Pendiente de Pago
                    </span>
                  )}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Vendedor</p>
                <p className="font-medium">
                  {venta.usuario_nombre || 'Sistema'}
                </p>
              </div>
            </div>
          </Card>
          
          {/* Productos */}
          <Card title="Productos" icon={<FaShoppingCart />}>
            <Table
              columns={columnsProductos}
              data={venta.detalles || []}
              pagination={false}
            />
          </Card>
          
          {/* Panel de Notas */}
          <Card title="Notas de la Venta" icon={<FaFileAlt />}>
            <div className="space-y-4">
              {editandoNotas ? (
                <>
                  <textarea
                    value={notasVenta}
                    onChange={(e) => setNotasVenta(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Agregar notas sobre esta venta..."
                  />
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      color="primary"
                      onClick={guardarNotas}
                    >
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      color="secondary"
                      onClick={() => {
                        setNotasVenta(venta.notas || '');
                        setEditandoNotas(false);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {venta.notas ? (
                    <p className="text-gray-700 whitespace-pre-wrap">{venta.notas}</p>
                  ) : (
                    <p className="text-gray-500 italic">Sin notas</p>
                  )}
                  <Button
                    size="sm"
                    color="secondary"
                    onClick={() => setEditandoNotas(true)}
                    icon={<FaEdit />}
                  >
                    {venta.notas ? 'Editar Notas' : 'Agregar Notas'}
                  </Button>
                </>
              )}
            </div>
          </Card>
          
          {/* Historial de Pagos */}
          {(venta.estado_pago !== 'pagado' || historialPagos.length > 0) && (
            <Card title="Historial de Pagos" icon={<FaMoneyBill />}>
              <div className="space-y-4">
                {/* Resumen de pagos */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total de la venta:</span>
                      <span className="font-medium ml-2">{formatMoneda(venta.total)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total pagado:</span>
                      <span className="font-medium ml-2 text-green-600">
                        {formatMoneda(venta.total_pagado || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Saldo pendiente:</span>
                      <span className="font-medium ml-2 text-red-600">
                        {formatMoneda(venta.saldo_pendiente || venta.total)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Progreso:</span>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((venta.total_pagado || 0) / venta.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">
                        {((venta.total_pagado || 0) / venta.total * 100).toFixed(0)}% pagado
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lista de pagos */}
                {cargandoPagos ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : historialPagos.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-700">Detalle de pagos realizados:</h4>
                    {historialPagos.map((pago, index) => (
                      <div key={pago.id || index} className="border rounded-lg p-3 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">Pago #{index + 1}</span>
                              <span className="text-sm text-gray-500">
                                {new Date(pago.fecha).toLocaleString()}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              <span>Metodo: {pago.metodo_pago}</span>
                              {pago.referencia && (
                                <span className="ml-3">Ref: {pago.referencia}</span>
                              )}
                            </div>
                            {pago.nota && (
                              <div className="mt-1 text-sm text-gray-500 italic">
                                Nota: {pago.nota}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-green-600">
                              {formatMoneda(pago.monto)}
                            </div>
                            {pago.usuario_nombre && (
                              <div className="text-xs text-gray-500">
                                Por: {pago.usuario_nombre}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No se han registrado pagos para esta venta
                  </p>
                )}

                {/* Boton para agregar pago */}
                {venta.saldo_pendiente > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      color="primary"
                      fullWidth
                      onClick={() => setShowPagoDialog(true)}
                      icon={<FaPlus />}
                    >
                      Registrar Nuevo Pago
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
        
        {/* Panel derecho - Informacion del cliente y resumen */}
        <div className="space-y-6">
          {/* Cliente */}
          <Card title="Cliente" icon={<FaUser />}>
            {venta.cliente_id ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Nombre</p>
                  <p className="font-medium">
                    {venta.cliente_info?.nombre_completo || 'Sin nombre'}
                  </p>
                </div>
                
                {venta.cliente_info?.telefono && (
                  <div>
                    <p className="text-sm text-gray-500">Telefono</p>
                    <p className="font-medium flex items-center">
                      <FaPhone className="mr-2 text-gray-400" />
                      {venta.cliente_info.telefono}
                    </p>
                  </div>
                )}
                
                {venta.cliente_info?.email && (
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium flex items-center">
                      <FaEnvelope className="mr-2 text-gray-400" />
                      {venta.cliente_info.email}
                    </p>
                  </div>
                )}
                
                {venta.cliente_info?.direccion && (
                  <div>
                    <p className="text-sm text-gray-500">Direccion</p>
                    <p className="font-medium flex items-center">
                      <FaMapMarkerAlt className="mr-2 text-gray-400" />
                      {venta.cliente_info.direccion}
                    </p>
                  </div>
                )}
                
                <div className="pt-3 border-t">
                  <Link to={`/clientes/${venta.cliente_id}`}>
                    <Button
                      color="secondary"
                      size="sm"
                      fullWidth
                    >
                      Ver Cliente
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Cliente General (Sin registrar)
              </p>
            )}
          </Card>
          
          {/* Resumen */}
          <Card title="Resumen" icon={<FaMoneyBillWave />}>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatMoneda(venta.subtotal)}</span>
              </div>
              
              {venta.descuento > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Descuento:</span>
                  <span className="font-medium text-red-600">
                    -{formatMoneda(venta.descuento)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Impuestos:</span>
                <span className="font-medium">{formatMoneda(venta.impuestos || 0)}</span>
              </div>
              
              <div className="pt-3 border-t">
                <div className="flex justify-between">
                  <span className="font-medium text-lg">Total:</span>
                  <span className="font-bold text-lg text-indigo-600">
                    {formatMoneda(venta.total)}
                  </span>
                </div>
              </div>
              
              {venta.total_pagado > 0 && venta.total_pagado < venta.total && (
                <>
                  <div className="pt-3 border-t">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pagado:</span>
                      <span className="font-medium text-green-600">
                        {formatMoneda(venta.total_pagado)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between mt-2">
                      <span className="text-gray-600">Saldo Pendiente:</span>
                      <span className="font-medium text-red-600">
                        {formatMoneda(venta.saldo_pendiente)}
                      </span>
                    </div>
                  </div>
                  
                  {venta.saldo_pendiente > 0 && (
                    <div className="pt-3">
                      <Button
                        color="primary"
                        fullWidth
                        onClick={() => setShowPagoDialog(true)}
                        icon={<FaMoneyBillWave />}
                      >
                        Registrar Pago
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
      
      {/* Dialogos */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={
          accion === 'completada' 
            ? 'Completar Venta' 
            : accion === 'cancelada' 
              ? 'Cancelar Venta' 
              : 'Devolver Venta'
        }
        message={
          accion === 'completada'
            ? `?Estas seguro de marcar la venta ${venta.numero} como completada?`
            : accion === 'cancelada'
              ? `?Estas seguro de cancelar la venta ${venta.numero}? Esta accion devolvera los productos al inventario.`
              : `?Estas seguro de marcar la venta ${venta.numero} como devuelta? Esta accion devolvera los productos al inventario.`
        }
        confirmText={
          accion === 'completada' 
            ? 'Completar' 
            : accion === 'cancelada' 
              ? 'Cancelar' 
              : 'Devolver'
        }
        cancelText="Volver"
        onConfirm={confirmarCambioEstado}
        onCancel={cancelarAccion}
        loading={procesando}
      />
      
      <RegistrarPagoDialog
        isOpen={showPagoDialog}
        onClose={() => setShowPagoDialog(false)}
        venta={venta}
        onPagoRegistrado={registrarPago}
      />
	  {showTicket && (
        <TicketVenta
          venta={venta}
          onClose={() => setShowTicket(false)}
        />
      )}
    </div>
  );
};

export default DetalleVenta;