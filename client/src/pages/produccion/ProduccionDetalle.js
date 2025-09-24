/**
 * Página de detalle de orden de producción
 * 
 * Muestra información detallada de una orden de producción.
 * 
 * @module pages/produccion/ProduccionDetalle
 * @requires react, react-router-dom, ../../services/produccion.service
 * @related_files ./Produccion.js
 */

import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import produccionService from '../../services/produccion.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaIndustry, FaArrowLeft, FaCheck, FaTimesCircle, 
  FaBoxOpen, FaCubes, FaClipboardList, FaCalendarAlt,
  FaPlay, FaUserAlt, FaStickyNote, FaReceipt, FaExclamationTriangle
} from 'react-icons/fa';

/**
 * Componente de página para mostrar detalle de una orden de producción
 * @returns {JSX.Element} Componente ProduccionDetalle
 */
const ProduccionDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estado
  const [orden, setOrden] = useState(null);
  const [receta, setReceta] = useState(null);
  const [ingredientes, setIngredientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [accionEstado, setAccionEstado] = useState('');
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarDatos();
  }, [id]);
  
  /**
   * Carga los datos de la orden de producción
   */
  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const response = await produccionService.obtenerPorId(id);
      
      if (response && response.data) {
        setOrden(response.data.orden);
        setReceta(response.data.receta);
        setIngredientes(response.data.ingredientes);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar los detalles de la orden');
      navigate('/produccion');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Prepara el cambio de estado
   * @param {string} estado - Nuevo estado
   */
  const prepararCambiarEstado = (estado) => {
    setAccionEstado(estado);
    setShowConfirmDialog(true);
  };
  
  /**
   * Confirma el cambio de estado
   */
  const confirmarCambioEstado = async () => {
    try {
      await produccionService.cambiarEstado(id, accionEstado);
      
      let mensaje = '';
      if (accionEstado === 'en_proceso') mensaje = 'Producción iniciada correctamente';
      else if (accionEstado === 'completada') mensaje = 'Producción completada correctamente';
      else if (accionEstado === 'cancelada') mensaje = 'Orden cancelada correctamente';
      
      toast.success(mensaje);
      cargarDatos();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error(error.response?.data?.message || 'Error al procesar la orden');
    } finally {
      setShowConfirmDialog(false);
      setAccionEstado('');
    }
  };
  
  /**
   * Formatea la fecha para mostrarla
   * @param {string} fecha - Fecha a formatear
   * @returns {string} Fecha formateada
   */
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  /**
   * Formatea un valor a 2 decimales
   * @param {number} valor - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatearDecimal = (valor) => {
    return parseFloat(valor || 0).toFixed(2);
  };
  
  /**
   * Obtiene el color según el estado
   * @param {string} estado - Estado a evaluar
   * @returns {string} Clases CSS para el color
   */
  const colorEstado = (estado) => {
    const colores = {
      'pendiente': 'bg-gray-100 text-gray-600',
      'en_proceso': 'bg-blue-100 text-blue-600',
      'completada': 'bg-green-100 text-green-600',
      'cancelada': 'bg-red-100 text-red-600'
    };
    
    return colores[estado] || 'bg-gray-100 text-gray-600';
  };
  
  /**
   * Formatea el estado para mostrar
   * @param {string} estado - Estado a formatear
   * @returns {string} Estado formateado
   */
  const formatearEstado = (estado) => {
    const estados = {
      'pendiente': 'Pendiente',
      'en_proceso': 'En Proceso',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    };
    
    return estados[estado] || estado;
  };
  
  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }
  
  // Si no se encontró la orden
  if (!orden) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <FaIndustry className="mx-auto text-4xl text-gray-400 mb-2" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">
            Orden de producción no encontrada
          </h3>
          <p className="text-gray-500 mb-4">
            La orden que intentas ver no existe o ha sido eliminada.
          </p>
          <Button
            color="primary"
            onClick={() => navigate('/produccion')}
            icon={<FaArrowLeft />}
          >
            Volver a Producción
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Orden de Producción {orden.numero}
          </h1>
          <p className="text-gray-600 flex items-center">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorEstado(orden.estado)}`}>
              {formatearEstado(orden.estado)}
            </span>
            <span className="mx-2">•</span>
            <FaCalendarAlt className="mr-1" />
            {formatearFecha(orden.fecha_orden)}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            color="secondary"
            onClick={() => navigate('/produccion')}
            icon={<FaArrowLeft />}
          >
            Volver
          </Button>
          
          {orden.estado === 'pendiente' && (
            <Button
              color="primary"
              onClick={() => prepararCambiarEstado('en_proceso')}
              icon={<FaPlay />}
            >
              Iniciar Producción
            </Button>
          )}
          
          {(orden.estado === 'pendiente' || orden.estado === 'en_proceso') && (
            <>
              <Button
                color="success"
                onClick={() => prepararCambiarEstado('completada')}
                icon={<FaCheck />}
              >
                Completar
              </Button>
              
              <Button
                color="danger"
                onClick={() => prepararCambiarEstado('cancelada')}
                icon={<FaTimesCircle />}
              >
                Cancelar
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Datos de la orden */}
        <Card title="Detalles de la Orden" icon={<FaIndustry />}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Número:</p>
                <p className="text-gray-900 font-semibold">{orden.numero}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Estado:</p>
                <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorEstado(orden.estado)}`}>
                  {formatearEstado(orden.estado)}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Fecha de Creación:</p>
                <p className="text-gray-900">{formatearFecha(orden.fecha_orden)}</p>
              </div>
              
              {orden.fecha_produccion && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Fecha de Producción:</p>
                  <p className="text-gray-900">{formatearFecha(orden.fecha_produccion)}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-700">Cantidad:</p>
                <p className="text-gray-900 font-semibold">{orden.cantidad} unidades</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Usuario:</p>
                <p className="text-gray-900">{orden.usuario_nombre} {orden.usuario_apellido}</p>
              </div>
            </div>
            
            {orden.notas && (
              <div className="border-t pt-3 mt-2">
                <p className="text-sm font-medium text-gray-700 mb-1">Notas:</p>
                <p className="text-gray-700 whitespace-pre-wrap">{orden.notas}</p>
              </div>
            )}
            
            <div className="border-t pt-3 mt-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Costos:</p>
              
              <div className="flex justify-between text-sm mb-1">
                <span>Materias Primas:</span>
                <span>${formatearDecimal(orden.costo_materias_primas)}</span>
              </div>
              
              <div className="flex justify-between text-sm mb-1">
                <span>Mano de Obra:</span>
                <span>${formatearDecimal(orden.costo_mano_obra)}</span>
              </div>
              
              <div className="flex justify-between text-sm mb-3">
                <span>Adicionales:</span>
                <span>${formatearDecimal(orden.costo_adicional)}</span>
              </div>
              
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Costo Total:</span>
                <span>${formatearDecimal(orden.costo_total)}</span>
              </div>
              
              <div className="flex justify-between font-medium text-green-600">
                <span>Costo Unitario:</span>
                <span>${formatearDecimal(orden.costo_unitario)}</span>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Información del producto */}
        <Card title="Producto y Receta" icon={<FaBoxOpen />}>
          <div className="space-y-4">
            <div className="flex items-center mb-2">
              <FaBoxOpen className="text-indigo-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">
                {orden.producto_nombre}
              </h3>
            </div>
            
            {orden.producto_codigo && (
              <div>
                <p className="text-sm font-medium text-gray-700">Código:</p>
                <p className="text-gray-900">{orden.producto_codigo}</p>
              </div>
            )}
            
            <div className="border-t pt-3 mt-2">
              <div className="flex items-center mb-2">
                <FaClipboardList className="text-indigo-500 mr-2" />
                <h3 className="font-semibold text-gray-800">
                  Receta: {receta?.nombre}
                </h3>
              </div>
              
              {receta?.descripcion && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Descripción:</p>
                  <p className="text-gray-700">{receta.descripcion}</p>
                </div>
              )}
              
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Detalles:</p>
                
                <div className="flex justify-between text-sm mb-1">
                  <span>Rendimiento:</span>
                  <span>{receta?.rendimiento} unidades</span>
                </div>
                
                {receta?.tiempo_preparacion && (
                  <div className="flex justify-between text-sm mb-1">
                    <span>Tiempo de Preparación:</span>
                    <span>{receta.tiempo_preparacion} min</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t pt-3 mt-2">
              <Link
                to={`/recetas/${receta?.id}`}
                className="text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                <FaClipboardList className="mr-1" />
                <span>Ver Detalles de la Receta</span>
              </Link>
            </div>
          </div>
        </Card>
        
        {/* Materias primas */}
        <Card title="Materias Primas" icon={<FaCubes />}>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {ingredientes.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500">No hay ingredientes en esta receta</p>
              </div>
            ) : (
              ingredientes.map(ingrediente => (
                <div 
                  key={ingrediente.id} 
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{ingrediente.materia_prima_nombre}</p>
                      <p className="text-sm text-gray-600">
                        {formatearDecimal(ingrediente.cantidad * orden.cantidad / receta?.rendimiento)} {ingrediente.unidad_medida}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Precio: ${ingrediente.precio_unitario}/{ingrediente.unidad_medida}</p>
                      <p className="font-medium">${formatearDecimal(ingrediente.subtotal * orden.cantidad / receta?.rendimiento)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
      
      {/* Barra de estado */}
      <Card>
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className={`p-3 rounded-full mr-4 ${colorEstado(orden.estado)}`}>
              {orden.estado === 'pendiente' ? (
                <FaClipboardList className="text-xl" />
              ) : orden.estado === 'en_proceso' ? (
                <FaIndustry className="text-xl" />
              ) : orden.estado === 'completada' ? (
                <FaCheck className="text-xl" />
              ) : (
                <FaTimesCircle className="text-xl" />
              )}
            </div>
            
            <div>
              <h3 className="font-medium text-lg text-gray-800">
                Estado: {formatearEstado(orden.estado)}
              </h3>
              <p className="text-gray-600">
                {orden.estado === 'pendiente'
                  ? 'Esta orden está lista para ser procesada'
                  : orden.estado === 'en_proceso'
                    ? 'Producción en curso'
                    : orden.estado === 'completada'
                      ? 'Producción finalizada y stock actualizado'
                      : 'Esta orden ha sido cancelada'
                }
              </p>
            </div>
          </div>
          
          {(orden.estado === 'pendiente' || orden.estado === 'en_proceso') && (
            <div className="flex space-x-2">
              {orden.estado === 'pendiente' && (
                <Button
                  color="primary"
                  onClick={() => prepararCambiarEstado('en_proceso')}
                  icon={<FaPlay />}
                >
                  Iniciar
                </Button>
              )}
              
              <Button
                color="success"
                onClick={() => prepararCambiarEstado('completada')}
                icon={<FaCheck />}
              >
                Completar
              </Button>
              
              <Button
                color="danger"
                onClick={() => prepararCambiarEstado('cancelada')}
                icon={<FaTimesCircle />}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </Card>
      
      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={
          accionEstado === 'en_proceso' ? 'Iniciar Producción' :
          accionEstado === 'completada' ? 'Completar Producción' :
          accionEstado === 'cancelada' ? 'Cancelar Orden' : 'Cambiar Estado'
        }
        message={
          <>
            {accionEstado === 'completada' && (
              <div className="mb-4 text-yellow-600 bg-yellow-50 p-4 rounded-lg">
                <p className="font-medium">¡Atención! Esta acción:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Descontará los materiales del inventario</li>
                  <li>Aumentará el stock del producto terminado</li>
                  <li>Actualizará el costo del producto</li>
                </ul>
              </div>
            )}
            <p>
              {accionEstado === 'en_proceso'
                ? `¿Deseas iniciar la producción de la orden ${orden.numero}?`
                : accionEstado === 'completada'
                  ? `¿Confirmas que la producción de la orden ${orden.numero} ha sido completada?`
                  : `¿Estás seguro de cancelar la orden ${orden.numero}? Esta acción no se puede deshacer.`
              }
            </p>
          </>
        }
        confirmText={
          accionEstado === 'en_proceso' ? 'Iniciar' :
          accionEstado === 'completada' ? 'Completar' :
          accionEstado === 'cancelada' ? 'Cancelar' : 'Confirmar'
        }
        cancelText="Volver"
        onConfirm={confirmarCambioEstado}
        onCancel={() => {
          setShowConfirmDialog(false);
          setAccionEstado('');
        }}
      />
    </div>
  );
};

export default ProduccionDetalle;