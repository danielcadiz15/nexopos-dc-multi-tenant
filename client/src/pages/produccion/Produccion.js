/**
 * Página principal de Producción
 * 
 * Muestra lista de órdenes de producción y opciones para crear nuevas.
 * 
 * @module pages/produccion/Produccion
 * @requires react, react-router-dom, ../../services/produccion.service
 * @related_files ./ProduccionForm.js, ./ProduccionDetalle.js
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import produccionService from '../../services/produccion.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Spinner from '../../components/common/Spinner';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaIndustry, FaPlus, FaEye, FaCheck, FaTimesCircle,
  FaClipboardList, FaCubes, FaPlay, FaCalendarAlt, 
  FaFilter, FaBoxOpen
} from 'react-icons/fa';

const Produccion = () => {
  const navigate = useNavigate();
  
  // Estado
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [accionActual, setAccionActual] = useState({ orden: null, estado: '' });
  const [filtroEstado, setFiltroEstado] = useState('');
  
  // Carga inicial
  useEffect(() => {
    cargarOrdenes();
  }, []);
  
  // Cargar órdenes de producción
  const cargarOrdenes = async (filtros = {}) => {
    try {
      setLoading(true);
      const data = await produccionService.obtenerOrdenes(filtros);
      setOrdenes(data);
    } catch (error) {
      console.error('Error al cargar órdenes de producción:', error);
      toast.error('Error al cargar las órdenes de producción');
    } finally {
      setLoading(false);
    }
  };
  
  // Aplicar filtro de estado
  const aplicarFiltroEstado = (estado) => {
    setFiltroEstado(estado);
    cargarOrdenes(estado ? { estado } : {});
  };
  
  // Preparar cambio de estado
  const prepararCambiarEstado = (orden, estado) => {
    setAccionActual({ orden, estado });
    setShowConfirmDialog(true);
  };
  
  // Cambiar estado de una orden
  const confirmarCambioEstado = async () => {
    try {
      const { orden, estado } = accionActual;
      await produccionService.cambiarEstado(orden.id, estado);
      
      let mensaje = '';
      if (estado === 'en_proceso') mensaje = 'Producción iniciada correctamente';
      else if (estado === 'completada') mensaje = 'Producción completada correctamente';
      else if (estado === 'cancelada') mensaje = 'Orden cancelada correctamente';
      
      toast.success(mensaje);
      cargarOrdenes(filtroEstado ? { estado: filtroEstado } : {});
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error(error.response?.data?.message || 'Error al procesar la orden');
    } finally {
      setShowConfirmDialog(false);
      setAccionActual({ orden: null, estado: '' });
    }
  };
  
  // Formatear estado para mostrar
  const formatearEstado = (estado) => {
    const estados = {
      'pendiente': { texto: 'Pendiente', color: 'bg-gray-100 text-gray-600' },
      'en_proceso': { texto: 'En Proceso', color: 'bg-blue-100 text-blue-600' },
      'completada': { texto: 'Completada', color: 'bg-green-100 text-green-600' },
      'cancelada': { texto: 'Cancelada', color: 'bg-red-100 text-red-600' }
    };
    
    return estados[estado] || { texto: estado, color: 'bg-gray-100 text-gray-600' };
  };
  
  // Columnas de la tabla
  const columns = [
    {
      header: 'Nº',
      accessor: 'numero',
      cell: (row) => <span className="font-medium">{row.numero}</span>
    },
    {
      header: 'Producto',
      accessor: 'producto_nombre',
      cell: (row) => (
        <div className="flex items-center">
          <FaBoxOpen className="mr-2 text-gray-500" />
          <span>{row.producto_nombre}</span>
        </div>
      )
    },
    {
      header: 'Receta',
      accessor: 'receta_nombre'
    },
    {
      header: 'Cantidad',
      accessor: 'cantidad',
      cell: (row) => <span className="font-semibold">{row.cantidad}</span>
    },
    {
      header: 'Estado',
      accessor: 'estado',
      cell: (row) => {
        const estado = formatearEstado(row.estado);
        
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${estado.color}`}>
            {estado.texto}
          </span>
        );
      }
    },
    {
      header: 'Costo Unit.',
      accessor: 'costo_unitario',
      cell: (row) => <span>${parseFloat(row.costo_unitario).toFixed(2)}</span>
    },
    {
      header: 'Fecha',
      accessor: 'fecha_orden',
      cell: (row) => (
        <div className="flex items-center">
          <FaCalendarAlt className="mr-2 text-gray-500" />
          <span>{new Date(row.fecha_orden).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/produccion/${row.id}`)}
            className="text-blue-600 hover:text-blue-800"
            title="Ver detalles"
          >
            <FaEye />
          </button>
          
          {row.estado === 'pendiente' && (
            <>
              <button
                onClick={() => prepararCambiarEstado(row, 'en_proceso')}
                className="text-blue-600 hover:text-blue-800"
                title="Iniciar producción"
              >
                <FaPlay />
              </button>
            </>
          )}
          
          {(row.estado === 'pendiente' || row.estado === 'en_proceso') && (
            <>
              <button
                onClick={() => prepararCambiarEstado(row, 'completada')}
                className="text-green-600 hover:text-green-800"
                title="Completar producción"
              >
                <FaCheck />
              </button>
              
              <button
                onClick={() => prepararCambiarEstado(row, 'cancelada')}
                className="text-red-600 hover:text-red-800"
                title="Cancelar orden"
              >
                <FaTimesCircle />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Producción</h1>
        
        <div className="flex space-x-2">
          <Link to="/materias-primas">
            <Button 
              color="secondary" 
              icon={<FaCubes />}
            >
              Materias Primas
            </Button>
          </Link>
          
          <Link to="/recetas">
            <Button 
              color="secondary" 
              icon={<FaClipboardList />}
            >
              Recetas
            </Button>
          </Link>
          
          <Link to="/produccion/nueva">
            <Button 
              color="primary" 
              icon={<FaPlus />}
            >
              Nueva Orden
            </Button>
          </Link>
        </div>
      </div>
      
      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            color={filtroEstado === '' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => aplicarFiltroEstado('')}
          >
            Todas
          </Button>
          
          <Button
            color={filtroEstado === 'pendiente' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => aplicarFiltroEstado('pendiente')}
          >
            Pendientes
          </Button>
          
          <Button
            color={filtroEstado === 'en_proceso' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => aplicarFiltroEstado('en_proceso')}
          >
            En Proceso
          </Button>
          
          <Button
            color={filtroEstado === 'completada' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => aplicarFiltroEstado('completada')}
          >
            Completadas
          </Button>
          
          <Button
            color={filtroEstado === 'cancelada' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => aplicarFiltroEstado('cancelada')}
          >
            Canceladas
          </Button>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <FaIndustry className="mr-2 text-indigo-600" />
            Órdenes de Producción
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : ordenes.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <FaIndustry className="mx-auto text-4xl text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                No hay órdenes de producción
              </h3>
              <p className="text-gray-500 mb-4">
                {filtroEstado
                  ? `No hay órdenes en estado "${formatearEstado(filtroEstado).texto}"`
                  : 'Comienza creando una nueva orden de producción'
                }
              </p>
              <Link to="/produccion/nueva">
                <Button color="primary" icon={<FaPlus />}>
                  Nueva Orden
                </Button>
              </Link>
            </div>
          ) : (
            <Table
              columns={columns}
              data={ordenes}
              pagination={true}
              itemsPerPage={10}
            />
          )}
        </div>
      </Card>
      
      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={
          accionActual.estado === 'en_proceso' ? 'Iniciar Producción' :
          accionActual.estado === 'completada' ? 'Completar Producción' :
          accionActual.estado === 'cancelada' ? 'Cancelar Orden' : 'Cambiar Estado'
        }
        message={
          accionActual.orden ? (
            <>
              {accionActual.estado === 'completada' && (
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
                {accionActual.estado === 'en_proceso'
                  ? `¿Deseas iniciar la producción de la orden ${accionActual.orden.numero}?`
                  : accionActual.estado === 'completada'
                    ? `¿Confirmas que la producción de la orden ${accionActual.orden.numero} ha sido completada?`
                    : `¿Estás seguro de cancelar la orden ${accionActual.orden.numero}? Esta acción no se puede deshacer.`
                }
              </p>
            </>
          ) : ''
        }
        confirmText={
          accionActual.estado === 'en_proceso' ? 'Iniciar' :
          accionActual.estado === 'completada' ? 'Completar' :
          accionActual.estado === 'cancelada' ? 'Cancelar' : 'Confirmar'
        }
        cancelText="Volver"
        onConfirm={confirmarCambioEstado}
        onCancel={() => {
          setShowConfirmDialog(false);
          setAccionActual({ orden: null, estado: '' });
        }}
      />
    </div>
  );
};

export default Produccion;