/**
 * Página de gestión de compras
 * 
 * Muestra el listado de compras a proveedores y permite
 * filtrar, ver detalles y cambiar estados.
 * 
 * @module pages/compras/Compras
 * @requires react, react-router-dom, ../../services/compras.service
 * @related_files ./CompraForm.js, ./DetalleCompra.js
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Servicios
import comprasService from '../../services/compras.service';

// Componentes
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Table from '../../components/common/Table';
import SearchBar from '../../components/common/SearchBar';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Iconos
import { 
  FaShoppingCart, FaPlus, FaEye, FaCheck, FaTimes,
  FaBoxOpen, FaClock, FaCalendarAlt, FaUserTie
} from 'react-icons/fa';

/**
 * Componente de página para gestión de compras
 * @returns {JSX.Element} Componente Compras
 */
const Compras = () => {
  const navigate = useNavigate();
  
  // Estado
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [compraProcesando, setCompraProcesando] = useState(null);
  const [accion, setAccion] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  /**
   * Carga inicial de datos
   */
  useEffect(() => {
    cargarCompras();
  }, []);
  
  /**
   * Carga todas las compras
   */
  const cargarCompras = async () => {
    try {
      setLoading(true);
      const data = await comprasService.obtenerTodas();
      setCompras(data);
    } catch (error) {
      console.error('Error al cargar compras:', error);
      toast.error('Error al cargar las compras');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Formatea el total con 2 decimales y el símbolo de moneda
   * @param {number} total - Valor a formatear
   * @returns {string} Valor formateado
   */
  const formatearTotal = (total) => {
    return `$${parseFloat(total).toFixed(2)}`;
  };
  
  /**
   * Prepara la recepción de una compra
   * @param {Object} compra - Compra a recibir
   */
  const prepararRecibirCompra = (compra) => {
    setCompraProcesando(compra);
    setAccion('recibir');
    setShowConfirmDialog(true);
  };
  
  /**
   * Prepara la cancelación de una compra
   * @param {Object} compra - Compra a cancelar
   */
  const prepararCancelarCompra = (compra) => {
    setCompraProcesando(compra);
    setAccion('cancelar');
    setShowConfirmDialog(true);
  };
  
  /**
   * Confirma la acción sobre la compra
   */
  const confirmarAccion = async () => {
    try {
      if (accion === 'recibir') {
        await comprasService.recibirCompra(compraProcesando.id, {
          actualizar_precios: true // Opcional: actualizar precios de productos
        });
        toast.success('Compra recibida correctamente');
      } else if (accion === 'cancelar') {
        await comprasService.cancelarCompra(compraProcesando.id);
        toast.success('Compra cancelada correctamente');
      }
      
      // Recargar compras
      cargarCompras();
    } catch (error) {
      console.error(`Error al ${accion} compra:`, error);
      
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(`Error al ${accion} la compra`);
      }
    } finally {
      setShowConfirmDialog(false);
      setCompraProcesando(null);
      setAccion('');
    }
  };
  
  /**
   * Cancela la acción sobre la compra
   */
  const cancelarAccion = () => {
    setShowConfirmDialog(false);
    setCompraProcesando(null);
    setAccion('');
  };
  
  /**
   * Navega a los detalles de la compra
   * @param {number} id - ID de la compra
   */
  const verDetalleCompra = (id) => {
    navigate(`/compras/${id}`);
  };
  
  /**
   * Columnas para la tabla de compras
   */
  const columns = [
    {
      header: 'Código',
      accessor: 'numero',
      cell: (row) => (
        <span className="font-medium">{row.numero}</span>
      )
    },
    {
      header: 'Fecha',
      accessor: 'fecha',
      cell: (row) => (
        <div className="flex items-center">
          <FaCalendarAlt className="mr-2 text-gray-500" />
          <span>{new Date(row.fecha).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      header: 'Proveedor',
      accessor: 'proveedor',
      cell: (row) => (
        <div className="flex items-center">
          <FaUserTie className="mr-2 text-gray-500" />
          <span>{row.proveedor}</span>
        </div>
      )
    },
    {
      header: 'Estado',
      accessor: 'estado',
      cell: (row) => {
        let color = 'bg-gray-100 text-gray-600';
        let icon = <FaClock className="mr-1" />;
        
        if (row.estado === 'recibida') {
          color = 'bg-green-100 text-green-600';
          icon = <FaCheck className="mr-1" />;
        } else if (row.estado === 'cancelada') {
          color = 'bg-red-100 text-red-600';
          icon = <FaTimes className="mr-1" />;
        }
        
        return (
          <span className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center ${color}`}>
            {icon}
            {row.estado.charAt(0).toUpperCase() + row.estado.slice(1)}
          </span>
        );
      }
    },
    {
      header: 'Total',
      accessor: 'total',
      cell: (row) => (
        <span className="font-medium">
          {formatearTotal(row.total)}
        </span>
      )
    },
    {
      header: 'Acciones',
      cell: (row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => verDetalleCompra(row.id)}
            className="text-blue-600 hover:text-blue-800"
            title="Ver detalles"
          >
            <FaEye />
          </button>
          
          {row.estado === 'pendiente' && (
            <>
              <button
                onClick={() => prepararRecibirCompra(row)}
                className="text-green-600 hover:text-green-800"
                title="Recibir compra"
              >
                <FaCheck />
              </button>
              
              <button
                onClick={() => prepararCancelarCompra(row)}
                className="text-red-600 hover:text-red-800"
                title="Cancelar compra"
              >
                <FaTimes />
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
        <h1 className="text-2xl font-bold text-gray-800">Gestión de Compras</h1>
        
        <Link to="/compras/nueva">
          <Button
            color="primary"
            icon={<FaPlus />}
          >
            Nueva Compra
          </Button>
        </Link>
      </div>
      
      <Card>
        <div className="flex justify-between space-x-4">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              Compras a proveedores
            </h3>
            <p className="text-gray-600">
              Gestiona las órdenes de compra a proveedores y su recepción en el inventario.
            </p>
          </div>
          
          <div className="flex items-center">
            <div className="text-sm text-gray-500 flex flex-col space-y-2">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-gray-100 mr-2"></span>
                Pendiente
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-green-100 mr-2"></span>
                Recibida
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-red-100 mr-2"></span>
                Cancelada
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      <Card>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {compras.length === 0 ? (
              <div className="bg-gray-50 p-8 rounded-lg text-center">
                <FaShoppingCart className="mx-auto text-4xl text-gray-400 mb-2" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">
                  No hay compras registradas
                </h3>
                <p className="text-gray-500">
                  Comienza registrando tu primera compra a proveedores
                </p>
                
                <div className="mt-4">
                  <Link to="/compras/nueva">
                    <Button
                      color="primary"
                      icon={<FaPlus />}
                    >
                      Registrar Compra
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <Table
                columns={columns}
                data={compras}
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
        title={accion === 'recibir' ? 'Recibir Compra' : 'Cancelar Compra'}
        message={
          compraProcesando
            ? accion === 'recibir'
              ? `¿Estás seguro de marcar la compra ${compraProcesando.numero} como recibida? Esta acción actualizará el inventario.`
              : `¿Estás seguro de cancelar la compra ${compraProcesando.numero}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText={accion === 'recibir' ? 'Recibir' : 'Cancelar'}
        cancelText="Volver"
        onConfirm={confirmarAccion}
        onCancel={cancelarAccion}
      />
    </div>
  );
};

export default Compras;