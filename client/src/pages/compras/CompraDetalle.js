/**
 * Página de detalle de compra
 * 
 * Muestra información detallada de una compra y permite
 * cambiar su estado.
 * 
 * @module pages/compras/DetalleCompra
 * @requires react, react-router-dom, ../../services/compras.service
 * @related_files ./Compras.js
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import comprasService from '../../services/compras.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaShoppingCart, FaArrowLeft, FaCheck, FaTimes,
  FaUserTie, FaCalendarAlt, FaInfoCircle, FaBoxOpen,
  FaFileAlt, FaPhone, FaEnvelope, FaClock, FaIdCard,
  FaMapMarkerAlt, FaBuilding, FaTag, FaBarcode, FaUndo
} from 'react-icons/fa';

/**
 * Componente de página para detalle de compra
 * @returns {JSX.Element} Componente DetalleCompra
 */
const DetalleCompra = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estado
  const [compra, setCompra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accion, setAccion] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  /**
   * Carga los datos de la compra
   */
  useEffect(() => {
    const cargarCompra = async () => {
      try {
        const data = await comprasService.obtenerPorId(id);
        setCompra(data);
      } catch (error) {
        console.error('Error al cargar compra:', error);
        toast.error('Error al cargar los datos de la compra');
        navigate('/compras');
      } finally {
        setLoading(false);
      }
    };
    
    cargarCompra();
  }, [id, navigate]);
  
  /**
   * Prepara la recepción de la compra
   */
  const prepararRecibirCompra = () => {
    setAccion('recibir');
    setShowConfirmDialog(true);
  };
  
  /**
   * Prepara la cancelación de la compra
   */
  const prepararCancelarCompra = () => {
    setAccion('cancelar');
    setShowConfirmDialog(true);
  };

  /**
   * Prepara la devolución de la compra
   */
  const prepararDevolverCompra = () => {
    setAccion('devolver');
    setShowConfirmDialog(true);
  };
  
  /**
   * Confirma la acción sobre la compra
   */
  const confirmarAccion = async () => {
    try {
      if (accion === 'recibir') {
        await comprasService.recibirCompra(id, {
          actualizar_precios: true
        });
        toast.success('Compra recibida correctamente');
      } else if (accion === 'cancelar') {
        await comprasService.cancelarCompra(id);
        toast.success('Compra cancelada correctamente');
      } else if (accion === 'devolver') {
        await comprasService.devolverCompra(id);
        toast.success('Compra devuelta correctamente');
      }
      
      // Recargar datos
      const compraActualizada = await comprasService.obtenerPorId(id);
      setCompra(compraActualizada);
    } catch (error) {
      console.error(`Error al ${accion} compra:`, error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(`Error al ${accion} la compra`);
      }
    } finally {
      setShowConfirmDialog(false);
      setAccion('');
    }
  };
  
  /**
   * Cancela la acción sobre la compra
   */
  const cancelarAccion = () => {
    setShowConfirmDialog(false);
    setAccion('');
  };
  
  /**
   * Formatea un valor numérico a 2 decimales
   * @param {number} valor - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatearNumero = (valor) => {
    if (valor === null || valor === undefined || valor === '') {
      return '0.00';
    }
    const numero = parseFloat(valor);
    if (isNaN(numero)) {
      return '0.00';
    }
    return numero.toFixed(2);
  };

  /**
   * Calcula el subtotal de la compra
   * @returns {number} Subtotal calculado
   */
  const calcularSubtotal = () => {
    if (!compra || !compra.detalles) return 0;
    return compra.detalles.reduce((sum, detalle) => {
      const cantidad = parseFloat(detalle.cantidad) || 0;
      const precio = parseFloat(detalle.precio_unitario) || 0;
      return sum + (cantidad * precio);
    }, 0);
  };

  /**
   * Calcula el total de la compra
   * @returns {number} Total calculado
   */
  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const impuestos = parseFloat(compra?.impuestos) || 0;
    return subtotal + impuestos;
  };
  
  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  // Si no se encontró la compra
  if (!compra) {
    return (
      <Card>
        <div className="text-center py-8">
          <FaShoppingCart className="mx-auto text-4xl text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">
            Compra no encontrada
          </h3>
          <p className="text-gray-500 mb-4">
            La compra que intentas ver no existe o ha sido eliminada.
          </p>
          <Button
            color="primary"
            onClick={() => navigate('/compras')}
            icon={<FaArrowLeft />}
          >
            Volver a Compras
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header con información principal */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-100 p-3 rounded-full">
              <FaShoppingCart className="text-2xl text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Compra #{compra.numero}
              </h1>
              <p className="text-gray-600 mt-1">
                {new Date(compra.fecha).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} - {new Date(compra.fecha).toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              color="secondary"
              onClick={() => navigate('/compras')}
              icon={<FaArrowLeft />}
            >
              Volver
            </Button>
            
            {compra.estado === 'pendiente' && (
              <>
                <Button
                  color="success"
                  onClick={prepararRecibirCompra}
                  icon={<FaCheck />}
                >
                  Recibir
                </Button>
                
                <Button
                  color="danger"
                  onClick={prepararCancelarCompra}
                  icon={<FaTimes />}
                >
                  Cancelar
                </Button>
              </>
            )}
            
            {compra.estado === 'recibida' && (
              <Button
                color="warning"
                onClick={prepararDevolverCompra}
                icon={<FaUndo />}
              >
                Devolver
              </Button>
            )}
          </div>
        </div>
        
        {/* Estado de la compra */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Estado:</span>
              {compra.estado === 'pendiente' && (
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 inline-flex items-center">
                  <FaInfoCircle className="mr-2" />
                  Pendiente
                </span>
              )}
              {compra.estado === 'recibida' && (
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800 inline-flex items-center">
                  <FaCheck className="mr-2" />
                  Recibida
                </span>
              )}
              {compra.estado === 'cancelada' && (
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800 inline-flex items-center">
                  <FaTimes className="mr-2" />
                  Cancelada
                </span>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500">Total de la Compra</div>
              <div className="text-2xl font-bold text-indigo-600">
                ${formatearNumero(calcularTotal())}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Panel izquierdo: Datos generales */}
        <div className="xl:col-span-1 space-y-6">
          <Card
            title="Información General"
            icon={<FaInfoCircle />}
          >
            <div className="space-y-4">
              <div className="flex items-center">
                <FaIdCard className="text-gray-500 mr-2" />
                <div>
                  <div className="text-sm text-gray-500">Número de Compra</div>
                  <div className="font-semibold text-lg">#{compra.numero}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <FaCalendarAlt className="text-gray-500 mr-2" />
                <div>
                  <div className="text-sm text-gray-500">Fecha de Creación</div>
                  <div>{new Date(compra.fecha).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <FaClock className="text-gray-500 mr-2" />
                <div>
                  <div className="text-sm text-gray-500">Hora de Creación</div>
                  <div>{new Date(compra.fecha).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <FaUserTie className="text-gray-500 mr-2" />
                <div>
                  <div className="text-sm text-gray-500">Creado por</div>
                  <div className="font-medium">{compra.usuario_nombre} {compra.usuario_apellido}</div>
                  {compra.usuario_email && (
                    <div className="text-xs text-gray-500">{compra.usuario_email}</div>
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500 mb-1">Estado</div>
                {compra.estado === 'pendiente' && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 inline-flex items-center">
                    <FaInfoCircle className="mr-1" />
                    Pendiente
                  </span>
                )}
                {compra.estado === 'recibida' && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-600 inline-flex items-center">
                    <FaCheck className="mr-1" />
                    Recibida
                  </span>
                )}
                {compra.estado === 'cancelada' && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-600 inline-flex items-center">
                    <FaTimes className="mr-1" />
                    Cancelada
                  </span>
                )}
              </div>
              
              {compra.fecha_recepcion && (
                <>
                  <div className="flex items-center">
                    <FaCalendarAlt className="text-gray-500 mr-2" />
                    <div>
                      <div className="text-sm text-gray-500">Fecha de Recepción</div>
                      <div>{new Date(compra.fecha_recepcion).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <FaClock className="text-gray-500 mr-2" />
                    <div>
                      <div className="text-sm text-gray-500">Hora de Recepción</div>
                      <div>{new Date(compra.fecha_recepcion).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</div>
                    </div>
                  </div>
                  
                  {compra.usuario_recepcion && (
                    <div className="flex items-center">
                      <FaUserTie className="text-gray-500 mr-2" />
                      <div>
                        <div className="text-sm text-gray-500">Recibido por</div>
                        <div className="font-medium">{compra.usuario_recepcion}</div>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {compra.notas && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Notas</div>
                  <div className="bg-gray-50 p-2 rounded border border-gray-200 text-sm">
                    {compra.notas}
                  </div>
                </div>
              )}
              
              {compra.fecha_cancelacion && (
                <>
                  <div className="flex items-center">
                    <FaCalendarAlt className="text-red-500 mr-2" />
                    <div>
                      <div className="text-sm text-gray-500">Fecha de Cancelación</div>
                      <div className="text-red-600 font-medium">
                        {new Date(compra.fecha_cancelacion).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <FaClock className="text-red-500 mr-2" />
                    <div>
                      <div className="text-sm text-gray-500">Hora de Cancelación</div>
                      <div className="text-red-600 font-medium">
                        {new Date(compra.fecha_cancelacion).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {compra.usuario_cancelacion && (
                    <div className="flex items-center">
                      <FaUserTie className="text-red-500 mr-2" />
                      <div>
                        <div className="text-sm text-gray-500">Cancelado por</div>
                        <div className="font-medium text-red-600">{compra.usuario_cancelacion}</div>
                      </div>
                    </div>
                  )}
                  
                  {compra.motivo_cancelacion && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Motivo de Cancelación</div>
                      <div className="bg-red-50 p-2 rounded border border-red-200 text-sm text-red-700">
                        {compra.motivo_cancelacion}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
          
          <Card
            title="Información del Proveedor"
            icon={<FaBuilding />}
          >
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Nombre del Proveedor</div>
                <div className="font-semibold text-lg text-gray-800">
                  {compra.proveedor_info?.nombre || compra.proveedor || 'Sin especificar'}
                </div>
              </div>
              
              {compra.proveedor_info?.contacto && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Persona de Contacto</div>
                  <div className="flex items-center text-sm">
                    <FaUserTie className="text-gray-500 mr-2" />
                    {compra.proveedor_info.contacto}
                  </div>
                </div>
              )}
              
              {compra.proveedor_info?.telefono && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Teléfono</div>
                  <div className="flex items-center text-sm">
                    <FaPhone className="text-gray-500 mr-2" />
                    {compra.proveedor_info.telefono}
                  </div>
                </div>
              )}
              
              {compra.proveedor_info?.email && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Email</div>
                  <div className="flex items-center text-sm">
                    <FaEnvelope className="text-gray-500 mr-2" />
                    {compra.proveedor_info.email}
                  </div>
                </div>
              )}
              
              {compra.proveedor_info?.direccion && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Dirección</div>
                  <div className="flex items-center text-sm">
                    <FaMapMarkerAlt className="text-gray-500 mr-2" />
                    {compra.proveedor_info.direccion}
                  </div>
                </div>
              )}
            </div>
          </Card>
          
          <Card
            title="Resumen"
            icon={<FaFileAlt />}
          >
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span>${formatearNumero(compra.subtotal)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Impuestos:</span>
                <span>${formatearNumero(compra.impuestos)}</span>
              </div>
              
              <div className="flex justify-between font-medium text-lg border-t pt-2">
                <span>Total:</span>
                <span className="text-indigo-600">${formatearNumero(compra.total)}</span>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Panel derecho: Detalles */}
        <Card
          title="Detalle de Productos"
          icon={<FaBoxOpen />}
          className="xl:col-span-4"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio Unit.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {compra.detalles.map((detalle, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {detalle.producto_nombre}
                      </div>
                      {detalle.producto_descripcion && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {detalle.producto_descripcion}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaBarcode className="text-gray-400 mr-1" />
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {detalle.producto_codigo || 'Sin código'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center">
                        <FaTag className="text-blue-500 mr-1" />
                        <span className="font-bold text-lg text-blue-600">
                          {detalle.cantidad}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="text-xs text-gray-500">Precio unitario</div>
                      <div className="font-semibold text-green-600">
                        ${formatearNumero(detalle.precio_unitario)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="font-bold text-lg text-indigo-600">
                        ${formatearNumero(detalle.precio_total)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-500">Categoría</div>
                      <div className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                        {detalle.producto_categoria || 'Sin categoría'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Resumen de productos */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Total de Productos</div>
                <div className="font-semibold text-lg">{compra.detalles.length}</div>
              </div>
              <div>
                <div className="text-gray-500">Total de Unidades</div>
                <div className="font-semibold text-lg">
                  {compra.detalles.reduce((sum, detalle) => sum + detalle.cantidad, 0)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Subtotal</div>
                <div className="font-semibold text-lg">${formatearNumero(calcularSubtotal())}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Final</div>
                <div className="font-bold text-lg text-indigo-600">${formatearNumero(calcularTotal())}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={
          accion === 'recibir' ? 'Recibir Compra' : 
          accion === 'cancelar' ? 'Cancelar Compra' : 
          accion === 'devolver' ? 'Devolver Compra' : 'Confirmar Acción'
        }
        message={
          accion === 'recibir'
            ? `¿Estás seguro de marcar la compra ${compra.numero} como recibida? Esta acción actualizará el inventario.`
            : accion === 'cancelar'
            ? `¿Estás seguro de cancelar la compra ${compra.numero}? Esta acción no se puede deshacer.`
            : accion === 'devolver'
            ? `¿Estás seguro de devolver la compra ${compra.numero}? Esta acción restará el inventario.`
            : '¿Estás seguro de realizar esta acción?'
        }
        confirmText={
          accion === 'recibir' ? 'Recibir' : 
          accion === 'cancelar' ? 'Cancelar' : 
          accion === 'devolver' ? 'Devolver' : 'Confirmar'
        }
        cancelText="Volver"
        onConfirm={confirmarAccion}
        onCancel={cancelarAccion}
      />
    </div>
  );
};

export default DetalleCompra;